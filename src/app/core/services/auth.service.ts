import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

    return this.http.post<unknown>(AUTH_LOGIN_URL, payload).pipe(
      map(() => {
        this.authSessionStore.setSession({
          username: safeUsername,
          mode: 'local',
          token: ''
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

}
