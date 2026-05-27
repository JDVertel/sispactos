import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { dashboardPathRequiresSession } from '../auth/route-access.policy';
import { AuthPromptService } from '../services/auth-prompt.service';
import { AuthService } from '../services/auth.service';

function resolveDashboardSegment(route: ActivatedRouteSnapshot): string {
  const page = route.paramMap.get('page');
  if (page) {
    return page;
  }
  const path = route.routeConfig?.path ?? '';
  if (!path || path.startsWith(':')) {
    return '';
  }
  return path.split('/')[0];
}

/**
 * Protege rutas de `/dashboard` segun {@link dashboardPathRequiresSession}.
 * Redirige a home si no hay sesion valida.
 */
export const dashboardAccessGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const authPromptService = inject(AuthPromptService);
  const router = inject(Router);
  const segment = resolveDashboardSegment(route);

  if (!segment || !dashboardPathRequiresSession(segment)) {
    return true;
  }

  if (authService.hasValidUserSession()) {
    return true;
  }

  authPromptService.requestLogin();
  return router.parseUrl('/dashboard/home');
};
