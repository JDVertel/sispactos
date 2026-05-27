import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, finalize } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';
import { AuthSessionKeepaliveService } from './auth-session-keepalive.service';
import {
  extractAccessToken,
  extractAuthErrorMessage,
  extractRefreshResponseToken,
  extractSessionRoleIdFromToken,
  isAdministratorRoleId,
  isAuthFailurePayload,
  isOAuthLoginSuccessPayload,
  isValidSessionToken,
  loginRejectionMessage,
  isJwtExpired,
  normalizeBearerToken,
  sessionRoleDisplayLabel,
  tokenExpiresWithin,
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
    const token = normalizeBearerToken(this.authSessionStore.getToken());
    if (!tokenExpiresWithin(token, 120)) {
      return of(true);
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

    const refreshBody = this.buildRefreshTokenRequestBody(token);

    this.refreshInFlight$ = this.http.post(AUTH_REFRESH_TOKEN_URL, refreshBody, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
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
        const errBody = typeof error.error === 'string' ? error.error : JSON.stringify(error.error ?? '');
        console.warn('[API WARN] POST /api/Auth/RefreshToken', error.status, errBody);
        if (this.shouldLogoutAfterRefreshFailure()) {
          this.logout();
          return of(false);
        }
        return of(true);
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

  getCurrentUser(): { username: string; mode: 'local' | 'guest'; role?: string } | null {
    const session = this.authSessionStore.getSession();

    if (!session || !this.hasValidUserSession()) {
      return null;
    }

    return {
      username: session.username,
      mode: session.mode,
      role: session.role
    };
  }

  getSessionRoleId(): string | null {
    return this.authSessionStore.getSession()?.role?.trim() || null;
  }

  getSessionRoleLabel(): string {
    return sessionRoleDisplayLabel(this.getSessionRoleId());
  }

  isAdministratorSession(): boolean {
    return this.hasValidUserSession() && isAdministratorRoleId(this.getSessionRoleId());
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
      token,
      role: extractSessionRoleIdFromToken(token) ?? 'admin'
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

  private handleRefreshHttpFailure(status: number, _raw: string): boolean {
    if ((status === 401 || status === 403) && this.shouldLogoutAfterRefreshFailure()) {
      this.logout();
      return false;
    }
    return this.hasValidUserSession();
  }

  private handleRefreshSuccess(raw: string, previousToken: string, username: string): boolean {
    const payload = this.parseJsonPayload(raw);

    if (isAuthFailurePayload(payload)) {
      if (validateLoginSessionToken(previousToken, username).valid) {
        return true;
      }
      this.logout();
      return false;
    }

    const refreshedToken = extractRefreshResponseToken(payload, previousToken);
    const sessionCheck = validateLoginSessionToken(refreshedToken, username);

    if (!sessionCheck.valid) {
      if (validateLoginSessionToken(previousToken, username).valid) {
        return true;
      }
      this.logout();
      return false;
    }

    const current = this.authSessionStore.getSession();
    if (!current) {
      return false;
    }

    this.authSessionStore.setSession({
      ...current,
      token: refreshedToken,
      role: extractSessionRoleIdFromToken(refreshedToken) ?? current.role ?? 'admin'
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

  /**
   * La API espera el JWT como JSON string en el cuerpo (no un objeto `{ refreshToken }`).
   * Ejemplo valido: "eyJhbGciOiJIUzI1NiIs..."
   */
  private buildRefreshTokenRequestBody(token: string): string {
    const normalized = normalizeBearerToken(token);
    return JSON.stringify(normalized);
  }

  /** Solo cerrar sesion si el JWT actual ya no sirve (evita perder acceso por fallo de refresh). */
  private shouldLogoutAfterRefreshFailure(): boolean {
    const token = normalizeBearerToken(this.authSessionStore.getToken());
    if (!token) {
      return true;
    }
    return isJwtExpired(token);
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
