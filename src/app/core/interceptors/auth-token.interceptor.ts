import { inject } from '@angular/core';
import { HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthSessionStore } from '../store/auth-session.store';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authSessionStore = inject(AuthSessionStore);
  const token = authSessionStore.getToken().trim();

  const extractPayloadData = (body: unknown): unknown => {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const payload = body as Record<string, unknown>;

    return payload['data']
      ?? payload['items']
      ?? payload['result']
      ?? payload['value']
      ?? body;
  };

  const logHttpTraffic = (requestMethod: string, requestUrl: string): MonoTypeOperatorFunction<HttpEvent<unknown>> =>
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event.type === HttpEventType.Response) {
          const payloadData = extractPayloadData(event.body);

          console.groupCollapsed(`[API OK] ${requestMethod} ${requestUrl}`);
          console.log('response:', event.body);
          console.log('data:', payloadData);
          console.groupEnd();
        }
      },
      error: (error: unknown) => {
        console.error(`[API ERROR] ${requestMethod} ${requestUrl}`, error);
      }
    });

  const authorizedRequest = token && !req.headers.has('Authorization')
    ? req.clone({
        setHeaders: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
        }
      })
    : req;

  return next(authorizedRequest).pipe(logHttpTraffic(authorizedRequest.method, authorizedRequest.urlWithParams));
};
