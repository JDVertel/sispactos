import { HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const logHttpTraffic = (requestMethod: string, requestUrl: string): MonoTypeOperatorFunction<HttpEvent<unknown>> =>
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event.type === HttpEventType.Response) {
          console.log(`[API OK] ${requestMethod} ${requestUrl}`, event.body);
        }
      },
      error: (error: unknown) => {
        console.error(`[API ERROR] ${requestMethod} ${requestUrl}`, error);
      }
    });

  if (req.url.includes('/api/Auth/Login')) {
    return next(req).pipe(logHttpTraffic(req.method, req.urlWithParams));
  }

  const authSessionStore = inject(AuthSessionStore);
  const token = authSessionStore.getToken();

  if (!token) {
    return next(req).pipe(logHttpTraffic(req.method, req.urlWithParams));
  }

  const requestWithToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(requestWithToken).pipe(logHttpTraffic(req.method, req.urlWithParams));
};
