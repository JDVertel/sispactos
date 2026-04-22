import { HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
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

  return next(req).pipe(logHttpTraffic(req.method, req.urlWithParams));
};
