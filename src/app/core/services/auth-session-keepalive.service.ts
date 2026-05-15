import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

/** Renueva el JWT antes de que expire (POST /api/Auth/RefreshToken). */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Tras volver a la pestana, refresca si pasaron al menos este tiempo desde el ultimo intento. */
const MIN_MS_BEFORE_FOCUS_REFRESH = 2 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class AuthSessionKeepaliveService implements OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private visibilitySub: Subscription | null = null;
  private lastRefreshAttemptMs = 0;
  private refreshInProgress = false;

  constructor(
    private readonly authService: AuthService,
    private readonly ngZone: NgZone
  ) {}

  ngOnDestroy(): void {
    this.stop();
  }

  /** Inicia el ciclo de renovacion mientras exista sesion con token. */
  start(): void {
    if (!this.authService.hasValidUserSession()) {
      return;
    }

    this.stop();
    this.runRefresh('inicio');

    this.ngZone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.ngZone.run(() => this.runRefresh('intervalo'));
      }, REFRESH_INTERVAL_MS);
    });

    if (typeof document !== 'undefined') {
      this.visibilitySub = fromEvent(document, 'visibilitychange')
        .pipe(filter(() => document.visibilityState === 'visible'))
        .subscribe(() => {
          const elapsed = Date.now() - this.lastRefreshAttemptMs;
          if (elapsed >= MIN_MS_BEFORE_FOCUS_REFRESH) {
            this.runRefresh('focus');
          }
        });
    }
  }

  stop(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.visibilitySub?.unsubscribe();
    this.visibilitySub = null;
    this.refreshInProgress = false;
  }

  private runRefresh(reason: string): void {
    if (!this.authService.hasValidUserSession() || this.refreshInProgress) {
      return;
    }

    this.refreshInProgress = true;
    this.lastRefreshAttemptMs = Date.now();

    this.authService.refreshToken().subscribe({
      next: (ok) => {
        this.refreshInProgress = false;
        if (!ok && !this.authService.hasValidUserSession()) {
          this.stop();
        }
      },
      error: () => {
        this.refreshInProgress = false;
      }
    });
  }
}
