import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Indica si hay una sesión iniciada.
  private isAuthenticated = false;
  // Guarda los datos básicos del usuario actual.
  private currentUser: { username: string; mode: 'local' | 'guest' } | null = null;

  // Valida el acceso según el modo y registra la sesión.
  login(username: string, password: string, mode: 'local' | 'guest'): boolean {
    const safeUsername = username.trim() || (mode === 'guest' ? 'Invitado' : '');
    
    if (mode === 'guest' || (mode === 'local' && safeUsername && password.trim())) {
      this.isAuthenticated = true;
      this.currentUser = { username: safeUsername, mode };
      return true;
    }
    return false;
  }

  // Cierra la sesión actual y limpia los datos guardados.
  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  // Devuelve si el usuario está autenticado.
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  // Devuelve información del usuario activo.
  getCurrentUser(): { username: string; mode: 'local' | 'guest' } | null {
    return this.currentUser;
  }
}
