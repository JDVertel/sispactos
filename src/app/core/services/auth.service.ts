import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, finalize } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';
import { AuthSessionKeepaliveService } from './auth-session-keepalive.service';
import {
  extractAccessToken,
  extractAuthErrorMessage,
  extractRefreshResponseToken,
  isAuthFailurePayload,
  isOAuthLoginSuccessPayload,
  isValidSessionToken,
  loginRejectionMessage,
  validateLoginSessionToken
} from '../auth/auth-token.util';

export interface LoginResult {
  isAuthenticated: boolean;
  message?: string;
}

/** Cuerpo POST /api/Auth/Login (UserCredentials, OpenAPI). */
export interface AuthLoginRequest {
  username: string;
  password: string;
}

const AUTH_LOGIN_URL = '/api/Auth/Login';
const AUTH_REFRESH_TOKEN_URL = '/api/Auth/RefreshToken';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private refreshInFlight$: Observable<boolean> | null = null;
  private keepaliveStarted = false;

  constructor(
    private readonly http: HttpClient,
    private readonly authSessionStore: AuthSessionStore,
    private readonly injector: Injector
  ) {}

  login(username: string, password: string): Observable<LoginResult> {
    const safeUsername = username.trim();
    const safePassword = password.trim();

    if (!safeUsername || !safePassword) {
      return of({
        isAuthenticated: false,
        message: 'Debe ingresar usuario y contrasena.'
      });
    }

    const body: AuthLoginRequest = {
      username: safeUsername,
      password: safePassword
    };

    return this.http.post(AUTH_LOGIN_URL, body, {
      observe: 'response',
      responseType: 'text'
    }).pipe(
      map((response) => this.handleLoginHttpResponse(response, safeUsername)),
      catchError((error) => of(this.handleLoginHttpError(error)))
    );
  }

  prepareSessionBeforeSave(): Observable<boolean> {
    if (!this.hasValidUserSession()) {
      return of(false);
    }
    return this.refreshToken();
  }

  refreshToken(): Observable<boolean> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = this.authSessionStore.getToken().trim();
    const session = this.authSessionStore.getSession();
    if (!session || !isValidSessionToken(token)) {
      this.logout();
      return of(false);
    }

    const sessionCheck = validateLoginSessionToken(token, session.username);
    if (!sessionCheck.valid) {
      this.logout();
      return of(false);
    }

    const body = this.buildRefreshTokenBody(token);

    this.refreshInFlight$ = this.http.post(AUTH_REFRESH_TOKEN_URL, body, {
      observe: 'response',
      responseType: 'text'
    }).pipe(
      map((response) => {
        if (response.status < 200 || response.status >= 300) {
          return this.handleRefreshHttpFailure(response.status, response.body ?? '');
        }
        return this.handleRefreshSuccess(response.body ?? '', token, session.username);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] POST /api/Auth/RefreshToken', error);
        if (error.status === 401 || error.status === 403) {
          this.logout();
          return of(false);
        }
        return of(this.hasValidUserSession());
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay(1)
    );

    return this.refreshInFlight$;
  }

  logout(): void {
    this.stopSessionKeepalive();
    this.authSessionStore.clearSession();
  }

  ensureSessionKeepalive(): void {
    if (!this.hasValidUserSession()) {
      if (this.authSessionStore.getSession()) {
        this.logout();
      }
      return;
    }
    this.startSessionKeepalive();
  }

  isLoggedIn(): boolean {
    return this.hasValidUserSession();
  }

  hasValidUserSession(): boolean {
    const session = this.authSessionStore.getSession();
    const token = this.authSessionStore.getToken().trim();
    if (!session || session.mode !== 'local' || !session.username.trim()) {
      return false;
    }
    const check = validateLoginSessionToken(token, session.username);
    return check.valid;
  }

  getCurrentUser(): { username: string; mode: 'local' | 'guest' } | null {
    const session = this.authSessionStore.getSession();

    if (!session || !this.hasValidUserSession()) {
      return null;
    }

    return {
      username: session.username,
      mode: session.mode
    };
  }

  private handleLoginHttpResponse(
    response: HttpResponse<string>,
    username: string
  ): LoginResult {
    const raw = response.body ?? '';

    if (response.status < 200 || response.status >= 300) {
      return this.handleLoginHttpFailure(response.status, raw);
    }

    return this.handleLoginSuccess(raw, username);
  }

  private handleLoginSuccess(raw: string, username: string): LoginResult {
    const payload = this.parseJsonPayload(raw);

    if (isAuthFailurePayload(payload)) {
      this.logout();
      return {
        isAuthenticated: false,
        message: extractAuthErrorMessage(payload) || 'Usuario o contrasena incorrectos.'
      };
    }

    const token = extractAccessToken(payload);

    if (!token && !isOAuthLoginSuccessPayload(payload)) {
      this.logout();
      return {
        isAuthenticated: false,
        message:
          extractAuthErrorMessage(payload)
          || 'El servidor no confirmo el inicio de sesion (respuesta no valida).'
      };
    }
    const sessionCheck = validateLoginSessionToken(token, username);

    if (!sessionCheck.valid) {
      this.logout();
      return {
        isAuthenticated: false,
        message:
          extractAuthErrorMessage(payload) || loginRejectionMessage(sessionCheck.reason)
      };
    }

    this.authSessionStore.setSession({
      username,
      mode: 'local',
      token
    });

    this.startSessionKeepalive();

    return { isAuthenticated: true };
  }

  private handleLoginHttpFailure(status: number, raw: string): LoginResult {
    this.logout();
    const payload = this.parseJsonPayload(raw);
    const apiMessage = extractAuthErrorMessage(payload);

    if (status === 401 || status === 403) {
      return {
        isAuthenticated: false,
        message: apiMessage || 'Usuario o contrasena incorrectos.'
      };
    }

    if (status === 400) {
      return {
        isAuthenticated: false,
        message: apiMessage || 'Datos de acceso invalidos.'
      };
    }

    return {
      isAuthenticated: false,
      message: apiMessage || `No fue posible autenticar el usuario (${status}).`
    };
  }

  private handleLoginHttpError(error: HttpErrorResponse): LoginResult {
    console.error('[API ERROR] POST /api/Auth/Login', error);
    const raw = typeof error.error === 'string' ? error.error : '';
    return this.handleLoginHttpFailure(error.status, raw || JSON.stringify(error.error ?? ''));
  }

  private handleRefreshHttpFailure(status: number, raw: string): boolean {
    if (status === 401 || status === 403) {
      this.logout();
      return false;
    }
    return this.hasValidUserSession();
  }

  private handleRefreshSuccess(raw: string, previousToken: string, username: string): boolean {
    const payload = this.parseJsonPayload(raw);

    if (isAuthFailurePayload(payload)) {
      this.logout();
      return false;
    }

    const refreshedToken = extractRefreshResponseToken(payload, previousToken);
    const sessionCheck = validateLoginSessionToken(refreshedToken, username);

    if (!sessionCheck.valid) {
      this.logout();
      return false;
    }

    const current = this.authSessionStore.getSession();
    if (!current) {
      return false;
    }

    this.authSessionStore.setSession({
      ...current,
      token: refreshedToken
    });

    return true;
  }

  private startSessionKeepalive(): void {
    if (this.keepaliveStarted) {
      this.injector.get(AuthSessionKeepaliveService).start();
      return;
    }
    this.keepaliveStarted = true;
    this.injector.get(AuthSessionKeepaliveService).start();
  }

  private stopSessionKeepalive(): void {
    this.keepaliveStarted = false;
    try {
      this.injector.get(AuthSessionKeepaliveService).stop();
    } catch {
      // noop
    }
  }

  private buildRefreshTokenBody(token: string): { refreshToken: string } {
    return {
      refreshToken: token.replace(/^Bearer\s+/i, '').trim()
    };
  }

  private parseJsonPayload(raw: string | null): unknown {
    if (raw == null || raw === '') {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
