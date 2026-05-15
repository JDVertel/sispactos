/**
 * Politica de acceso a rutas bajo `/dashboard`.
 * Solo las rutas listadas aqui exigen sesion (usuario + token JWT).
 * El resto es visible en modo invitado.
 */
export const DASHBOARD_PATHS_REQUIRING_SESSION = new Set([
  // Administracion / configuracion
  'administracion',
  'gestion-pactos',
  'gestion-proyectos',
  'gestion-contratos',
  'configuracion-actores',
  // Modulos operativos restringidos
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

export function dashboardPathRequiresSession(pathSegment: string): boolean {
  const key = (pathSegment || '').trim().toLowerCase();
  return DASHBOARD_PATHS_REQUIRING_SESSION.has(key);
}
