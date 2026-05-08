import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthSessionStore } from '../store/auth-session.store';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authSessionStore = inject(AuthSessionStore);
  const authService = inject(AuthService);
  const token = authSessionStore.getToken().trim();

  const isBackendRequest = req.url.startsWith('/api/') || req.url.startsWith(window.location.origin);
  const isAuthRequest = req.url.includes('/api/Auth/Login') || req.url.includes('/api/Auth/RefreshToken');
  const refreshAttempted = req.headers.get('x-sispactos-refresh-attempt') === '1';

  const applyAuthHeader = (request: typeof req) => {
    const nextToken = authSessionStore.getToken().trim();
    if (!nextToken) return request;
    const authToken = nextToken.toLowerCase().startsWith('bearer ')
      ? nextToken
      : `Bearer ${nextToken}`;
    return request.clone({
      setHeaders: {
        Authorization: authToken
      }
    });
  };

  const requestWithAuth = (token && isBackendRequest)
    ? applyAuthHeader(req)
    : req;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      // Si el backend rechaza por sesión expirada (401), intentamos refresh + retry una sola vez.
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
        && isBackendRequest
        && !isAuthRequest
        && !refreshAttempted
      ) {
        return authService.refreshToken().pipe(
          switchMap((ok) => {
            if (!ok) {
              return throwError(() => error);
            }
            const retried = applyAuthHeader(req.clone({
              setHeaders: { 'x-sispactos-refresh-attempt': '1' }
            }));
            return next(retried);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
