import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthSession {
  username: string;
  mode: 'local';
  token: string;
}

const AUTH_SESSION_STORAGE_KEY = 'sispactos.auth.session';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionStore {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readFromStorage());

  readonly session$ = this.sessionSubject.asObservable();

  getSession(): AuthSession | null {
    return this.sessionSubject.value;
  }

  getToken(): string {
    return this.sessionSubject.value?.token ?? '';
  }

  setSession(session: AuthSession): void {
    this.sessionSubject.next(session);
    this.writeToStorage(session);
  }

  clearSession(): void {
    this.sessionSubject.next(null);
    this.removeFromStorage();
  }

  private readFromStorage(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<AuthSession>;

      if (typeof parsed?.token !== 'string' || !parsed.token.trim()) {
        return null;
      }

      if (typeof parsed?.username !== 'string' || !parsed.username.trim()) {
        return null;
      }

      return {
        username: parsed.username,
        mode: 'local',
        token: parsed.token
      };
    } catch {
      return null;
    }
  }

  private writeToStorage(session: AuthSession): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private removeFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }
}
