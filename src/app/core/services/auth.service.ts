import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';

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
  constructor(
    private readonly http: HttpClient,
    private readonly authSessionStore: AuthSessionStore
  ) {}

  // Valida el acceso contra endpoint transaccional y registra sesión local.
  login(username: string, password: string): Observable<LoginResult> {
    const safeUsername = username.trim();
    const safePassword = password.trim();

    if (!safeUsername || !safePassword) {
      return of({
        isAuthenticated: false,
        message: 'Debe ingresar usuario y contrasena.'
      });
    }

    return this.http.post<unknown>(AUTH_LOGIN_URL, {
      username: safeUsername,
      password: safePassword
    }).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/Auth/Login');
        console.log('response:', response);
        console.groupEnd();
      }),
      map((response) => {
        const token = this.extractToken(response);

        this.authSessionStore.setSession({
          username: safeUsername,
          mode: 'local',
          token
        });

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

  refreshToken(): Observable<boolean> {
    const token = this.authSessionStore.getToken().trim();
    if (!token) {
      return of(false);
    }

    return this.http.post<unknown>(AUTH_REFRESH_TOKEN_URL, token).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/Auth/RefreshToken');
        console.log('response:', response);
        console.groupEnd();
      }),
      map((response) => {
        const refreshedToken = this.extractToken(response) || token;
        const current = this.authSessionStore.getSession();
        if (!current) {
          return false;
        }

        this.authSessionStore.setSession({
          ...current,
          token: refreshedToken
        });

        return true;
      }),
      catchError((error) => {
        console.error('[API ERROR] POST /api/Auth/RefreshToken', error);
        this.logout();
        return of(false);
      })
    );
  }

  // Cierra la sesión actual y limpia los datos guardados.
  logout(): void {
    this.authSessionStore.clearSession();
  }

  // Devuelve si el usuario está autenticado.
  isLoggedIn(): boolean {
    return !!this.authSessionStore.getSession();
  }

  // Sesión válida para módulos restringidos: requiere usuario registrado.
  hasValidUserSession(): boolean {
    const session = this.authSessionStore.getSession();
    return !!session && session.mode === 'local' && !!session.username.trim();
  }

  // Devuelve información del usuario activo.
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
