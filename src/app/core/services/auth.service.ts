import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';

interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResult {
  isAuthenticated: boolean;
  message?: string;
}

const AUTH_LOGIN_URL = '/api/Auth/Login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private readonly http: HttpClient,
    private readonly authSessionStore: AuthSessionStore
  ) {}

  // Valida el acceso contra el endpoint de autenticación AD y registra sesión local.
  login(username: string, password: string): Observable<LoginResult> {
    const safeUsername = username.trim();
    const safePassword = password.trim();

    if (!safeUsername || !safePassword) {
      return of({
        isAuthenticated: false,
        message: 'Debe ingresar usuario y contrasena.'
      });
    }

    const payload: LoginRequest = {
      username: safeUsername,
      password: safePassword
    };

    return this.http.post<unknown>(AUTH_LOGIN_URL, payload, { observe: 'response' }).pipe(
      map((response: HttpResponse<unknown>) => {
        const token = this.extractToken(response.body, response);

        if (!token) {
          this.logout();
          return {
            isAuthenticated: false,
            message: 'Autenticacion exitosa sin token en la respuesta.'
          };
        }

        this.authSessionStore.setSession({
          username: safeUsername,
          mode: 'local',
          token
        });

        return { isAuthenticated: true };
      }),
      catchError((error: HttpErrorResponse) => {
        this.logout();

        if (error.status === 401 || error.status === 403) {
          return of({
            isAuthenticated: false,
            message: 'Usuario o contrasena invalidos.'
          });
        }

        if (error.status === 0) {
          return of({
            isAuthenticated: false,
            message: 'No se pudo conectar al servicio de autenticacion.'
          });
        }

        return of({
          isAuthenticated: false,
          message: 'Error inesperado en autenticacion.'
        });
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
    return !!session && session.mode === 'local' && !!session.token;
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

  private extractToken(response: unknown, httpResponse?: HttpResponse<unknown>): string {
    const headerToken = this.extractTokenFromHeaders(httpResponse);
    if (headerToken) {
      return headerToken;
    }

    if (typeof response === 'string') {
      const parsedJson = this.tryParseJson(response);

      if (parsedJson) {
        return this.extractTokenFromPayload(parsedJson);
      }

      return this.normalizeBearerToken(response);
    }

    if (!response || typeof response !== 'object') {
      return '';
    }

    return this.extractTokenFromPayload(response as Record<string, unknown>);
  }

  private extractTokenFromPayload(payload: Record<string, unknown>): string {
    const directToken = this.readTokenValue(this.getValueIgnoreCase(payload, 'token'))
      || this.readTokenValue(this.getValueIgnoreCase(payload, 'accessToken'))
      || this.readTokenValue(this.getValueIgnoreCase(payload, 'jwtToken'))
      || this.readTokenValue(this.getValueIgnoreCase(payload, 'bearerToken'))
      || this.readTokenValue(this.getValueIgnoreCase(payload, 'value'))
      || this.readTokenValue(this.getValueIgnoreCase(payload, 'result'));

    if (directToken) {
      return directToken;
    }

    const nestedData = this.getValueIgnoreCase(payload, 'data');
    const nestedToken = this.extractTokenFromUnknown(nestedData);
    if (nestedToken) {
      return nestedToken;
    }

    const nestedResult = this.getValueIgnoreCase(payload, 'result');
    const nestedResultToken = this.extractTokenFromUnknown(nestedResult);
    if (nestedResultToken) {
      return nestedResultToken;
    }

    for (const value of Object.values(payload)) {
      const token = this.extractTokenFromUnknown(value);
      if (token) {
        return token;
      }
    }

    return '';
  }

  private extractTokenFromUnknown(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      const parsedJson = this.tryParseJson(value);
      if (parsedJson) {
        return this.extractTokenFromPayload(parsedJson);
      }

      return this.normalizeBearerToken(value);
    }

    if (typeof value === 'object') {
      return this.extractTokenFromPayload(value as Record<string, unknown>);
    }

    return '';
  }

  private getValueIgnoreCase(payload: Record<string, unknown>, key: string): unknown {
    const direct = payload[key];
    if (direct !== undefined) {
      return direct;
    }

    const normalizedKey = key.toLowerCase();

    for (const [candidateKey, candidateValue] of Object.entries(payload)) {
      if (candidateKey.toLowerCase() === normalizedKey) {
        return candidateValue;
      }
    }

    return '';
  }

  private tryParseJson(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeBearerToken(value: string): string {
    const token = value.trim();

    if (!token) {
      return '';
    }

    if (token.toLowerCase().startsWith('bearer ')) {
      return token.slice(7).trim();
    }

    return token;
  }

  private extractTokenFromHeaders(httpResponse?: HttpResponse<unknown>): string {
    if (!httpResponse) {
      return '';
    }

    const authHeader = httpResponse.headers.get('Authorization')
      || httpResponse.headers.get('authorization');

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }

    const directTokenHeader = httpResponse.headers.get('token')
      || httpResponse.headers.get('x-access-token');

    return this.readTokenValue(directTokenHeader);
  }

  private readTokenValue(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }
}
