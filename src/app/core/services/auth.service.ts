import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private currentUser: { username: string; mode: 'local' | 'guest' } | null = null;

  login(username: string, password: string, mode: 'local' | 'guest'): boolean {
    const safeUsername = username.trim() || (mode === 'guest' ? 'Invitado' : '');
    
    if (mode === 'guest' || (mode === 'local' && safeUsername && password.trim())) {
      this.isAuthenticated = true;
      this.currentUser = { username: safeUsername, mode };
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser(): { username: string; mode: 'local' | 'guest' } | null {
    return this.currentUser;
  }
}
