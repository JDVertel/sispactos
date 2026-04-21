import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const PROTECTED_PAGES = new Set([
  'avances',
  'alertas',
  'financiero',
  'pei',
  'plan-accion',
  'proyectos-cp',
  'proyectos-frcp',
  'compromisos-pactos',
  'compromisos-proyectos',
  'mapas',
  'reportes',
  'tablero-mando'
]);

export const protectedPagesGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const page = route.paramMap.get('page') ?? '';

  if (!PROTECTED_PAGES.has(page)) {
    return true;
  }

  if (authService.hasValidUserSession()) {
    return true;
  }

  return router.parseUrl('/dashboard/home');
};
