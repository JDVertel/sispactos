import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, shareReplay, finalize } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';
import { AuthSessionKeepaliveService } from './auth-session-keepalive.service';

export interface LoginResult {
  isAuthenticated: boolean;
  message?: string;
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

    return this.http.post(AUTH_LOGIN_URL, {
      username: safeUsername,
      password: safePassword
    }, { responseType: 'text' }).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/Auth/Login');
        console.log('response:', response);
        console.groupEnd();
      }),
      map((raw) => {
        const token = this.extractToken(this.parseJsonPayload(raw));

        if (!token) {
          return {
            isAuthenticated: false,
            message: 'El servidor no devolvio un token de sesion.'
          } as LoginResult;
        }

        this.authSessionStore.setSession({
          username: safeUsername,
          mode: 'local',
          token
        });

        this.startSessionKeepalive();

        return { isAuthenticated: true };
      }),
      catchError((error) => {
        console.error('[API ERROR] POST /api/Auth/Login', error);
        this.logout();
        return of({
          isAuthenticated: false,
          message: 'No fue posible autenticar el usuario.'
        });
      })
    );
  }

  /**
   * Renueva el JWT (POST /api/Auth/RefreshToken).
   * No cierra sesion por errores de red; solo si el servidor rechaza el token (401/403).
   */
  refreshToken(): Observable<boolean> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = this.authSessionStore.getToken().trim();
    if (!token) {
      return of(false);
    }

    const body = this.buildRefreshTokenBody(token);

    this.refreshInFlight$ = this.http.post(AUTH_REFRESH_TOKEN_URL, body, { responseType: 'text' }).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/Auth/RefreshToken');
        console.log('response:', response);
        console.groupEnd();
      }),
      map((raw) => {
        const refreshedToken = this.extractToken(this.parseJsonPayload(raw)) || token;
        const current = this.authSessionStore.getSession();
        if (!current || !refreshedToken) {
          return false;
        }

        this.authSessionStore.setSession({
          ...current,
          token: refreshedToken
        });

        return true;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] POST /api/Auth/RefreshToken', error);
        if (error.status === 401 || error.status === 403) {
          this.logout();
        }
        return of(false);
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

  /** Reanuda renovacion automatica si hay sesion guardada (p. ej. al recargar la app). */
  ensureSessionKeepalive(): void {
    if (this.hasValidUserSession()) {
      this.startSessionKeepalive();
    }
  }

  isLoggedIn(): boolean {
    return !!this.authSessionStore.getSession();
  }

  hasValidUserSession(): boolean {
    const session = this.authSessionStore.getSession();
    return (
      !!session
      && session.mode === 'local'
      && !!session.username.trim()
      && !!this.authSessionStore.getToken().trim()
    );
  }

  getCurrentUser(): { username: string; mode: 'local' | 'guest' } | null {
    const session = this.authSessionStore.getSession();

    if (!session) {
      return null;
    }

    return {
      username: session.username,
      mode: session.mode
    };
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
      // noop si el keepalive aun no esta registrado
    }
  }

  private buildRefreshTokenBody(token: string): string | Record<string, string> {
    const normalized = this.normalizeToken(token);
    return normalized;
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

  private extractToken(payload: unknown): string {
    if (typeof payload === 'string') {
      return this.normalizeToken(payload);
    }

    if (!payload || typeof payload !== 'object') {
      return '';
    }

    const body = payload as Record<string, unknown>;
    const direct = this.readString(body['token'])
      || this.readString(body['accessToken'])
      || this.readString(body['access_token'])
      || this.readString(body['refreshToken'])
      || this.readString(body['jwt'])
      || this.readString(body['bearer']);

    if (direct) {
      return this.normalizeToken(direct);
    }

    const nested = body['data'] ?? body['result'] ?? body['value'];
    return nested && nested !== payload ? this.extractToken(nested) : '';
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeToken(token: string): string {
    return token.replace(/^Bearer\s+/i, '').trim();
  }
}
