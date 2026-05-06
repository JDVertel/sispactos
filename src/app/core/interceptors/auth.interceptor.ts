import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionStore } from '../store/auth-session.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authSessionStore = inject(AuthSessionStore);
  const token = authSessionStore.getToken().trim();

  const isBackendRequest = req.url.startsWith('/api/') || req.url.startsWith(window.location.origin);

  if (!token || !isBackendRequest) {
    return next(req);
  }

  const authToken = token.toLowerCase().startsWith('bearer ')
    ? token
    : `Bearer ${token}`;

  return next(
    req.clone({
      setHeaders: {
        Authorization: authToken
      }
    })
  );
};
