/** Validacion de tokens JWT devueltos por POST /api/Auth/Login y RefreshToken. */

/**
 * TEMPORAL: true mientras el API devuelve token de servicio sin validar usuario/contrasena.
 * Poner en false cuando el backend autentique usuarios reales.
 */
export const AUTH_RELAXED_LOGIN_VALIDATION = true;

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const ACCESS_TOKEN_KEYS = ['access_token', 'accessToken', 'token', 'jwt'] as const;

const REFRESH_TOKEN_KEYS = ['refreshToken', 'refresh_token'] as const;

export interface JwtClaims {
  preferred_username?: string;
  email?: string;
  upn?: string;
  unique_name?: string;
  azp?: string;
  clientId?: string;
  typ?: string;
  exp?: number;
  sub?: string;
}

export function normalizeBearerToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}

export function isLikelyJwt(token: string): boolean {
  const normalized = normalizeBearerToken(token);
  return normalized.length >= 20 && JWT_PATTERN.test(normalized);
}

export function decodeJwtClaims(token: string): JwtClaims | null {
  const normalized = normalizeBearerToken(token);
  if (!isLikelyJwt(normalized)) {
    return null;
  }
  try {
    const payloadPart = normalized.split('.')[1];
    const padded = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const claims = decodeJwtClaims(token);
  if (!claims) {
    return true;
  }
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    return false;
  }
  return Date.now() >= (claims.exp - skewSeconds) * 1000;
}

export function isValidSessionToken(token: string): boolean {
  const normalized = normalizeBearerToken(token);
  return !!normalized && isLikelyJwt(normalized) && !isJwtExpired(normalized);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLoginIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function pickTokenFromRecord(body: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = readString(body[key]);
    if (value) {
      return normalizeBearerToken(value);
    }
  }
  return '';
}

/** Respuesta OAuth positiva del Login (access_token JWT). */
export function isOAuthLoginSuccessPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const body = payload as Record<string, unknown>;
  if (readString(body['error']) || readString(body['error_description'])) {
    return false;
  }
  if (isAuthFailurePayload(payload)) {
    return false;
  }

  const token = pickTokenFromRecord(body, ACCESS_TOKEN_KEYS);
  return !!token && isLikelyJwt(token);
}

/** Token de cuenta de servicio / client credentials (no es un usuario real). */
export function isServiceAccountJwt(claims: JwtClaims | null): boolean {
  if (!claims) {
    return true;
  }

  const preferred = normalizeLoginIdentity(claims.preferred_username || '');
  if (preferred.startsWith('service-account') || preferred.includes('service-account')) {
    return true;
  }

  const typ = normalizeLoginIdentity(claims.typ || '');
  const hasUserEmail = !!(claims.email?.trim() || claims.upn?.trim());
  if (typ === 'bearer' && !hasUserEmail && preferred.includes('service')) {
    return true;
  }

  return false;
}

/** El JWT debe corresponder al usuario que ingreso en el formulario. */
export function jwtMatchesLoginUsername(claims: JwtClaims | null, username: string): boolean {
  if (!claims || isServiceAccountJwt(claims)) {
    return false;
  }

  const login = normalizeLoginIdentity(username);
  if (!login) {
    return false;
  }

  const identities = [
    claims.preferred_username,
    claims.email,
    claims.upn,
    claims.unique_name
  ]
    .map((v) => normalizeLoginIdentity(v || ''))
    .filter(Boolean);

  if (!identities.length) {
    return false;
  }

  return identities.some((id) => {
    if (id === login) {
      return true;
    }
    const loginLocal = login.split('@')[0];
    const idLocal = id.split('@')[0];
    return loginLocal.length >= 2 && idLocal === loginLocal;
  });
}

export function validateLoginSessionToken(token: string, username: string): {
  valid: boolean;
  reason?: 'invalid_token' | 'service_account' | 'user_mismatch';
} {
  if (!isValidSessionToken(token)) {
    return { valid: false, reason: 'invalid_token' };
  }

  if (AUTH_RELAXED_LOGIN_VALIDATION) {
    return { valid: true };
  }

  const claims = decodeJwtClaims(token);
  if (isServiceAccountJwt(claims)) {
    return { valid: false, reason: 'service_account' };
  }

  if (!jwtMatchesLoginUsername(claims, username)) {
    return { valid: false, reason: 'user_mismatch' };
  }

  return { valid: true };
}

export function extractAccessToken(payload: unknown): string {
  if (typeof payload === 'string') {
    const normalized = normalizeBearerToken(payload);
    return isLikelyJwt(normalized) ? normalized : '';
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const body = payload as Record<string, unknown>;
  const direct = pickTokenFromRecord(body, ACCESS_TOKEN_KEYS);
  if (direct && isLikelyJwt(direct)) {
    return direct;
  }

  const nested = body['data'] ?? body['result'] ?? body['value'];
  return nested && nested !== payload ? extractAccessToken(nested) : '';
}

export function extractRefreshResponseToken(payload: unknown, fallback: string): string {
  const access = extractAccessToken(payload);
  if (access) {
    return access;
  }

  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    const refresh = pickTokenFromRecord(body, REFRESH_TOKEN_KEYS);
    if (refresh && isLikelyJwt(refresh)) {
      return refresh;
    }
    const nested = body['data'] ?? body['result'] ?? body['value'];
    if (nested && nested !== payload) {
      return extractRefreshResponseToken(nested, fallback);
    }
  }

  const normalizedFallback = normalizeBearerToken(fallback);
  return isLikelyJwt(normalizedFallback) ? normalizedFallback : '';
}

export function isAuthFailurePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const body = payload as Record<string, unknown>;
  if (
    body['success'] === false
    || body['succeeded'] === false
    || body['isSuccess'] === false
    || body['authenticated'] === false
    || body['isAuthenticated'] === false
  ) {
    return true;
  }

  const status = body['status'] ?? body['statusCode'] ?? body['code'];
  if (typeof status === 'number' && status >= 400) {
    return true;
  }
  if (typeof status === 'string' && /^(4|5)\d{2}$/.test(status.trim())) {
    return true;
  }

  const errors = body['errors'];
  if (Array.isArray(errors) && errors.length > 0) {
    return true;
  }

  return false;
}

export function extractAuthErrorMessage(payload: unknown): string {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    const text = payload.trim();
    if (!text || isLikelyJwt(text)) {
      return '';
    }
    return text;
  }
  if (typeof payload !== 'object') {
    return '';
  }

  const body = payload as Record<string, unknown>;
  const candidates = [
    body['message'],
    body['error_description'],
    body['error'],
    body['detail'],
    body['title'],
    body['description']
  ];

  for (const value of candidates) {
    const text = readString(value);
    if (text) {
      return text;
    }
  }

  const nested = body['data'] ?? body['result'];
  return nested ? extractAuthErrorMessage(nested) : '';
}

export function loginRejectionMessage(reason?: 'invalid_token' | 'service_account' | 'user_mismatch'): string {
  switch (reason) {
    case 'service_account':
      return 'Usuario o contrasena incorrectos. El servidor no autentico su cuenta de usuario.';
    case 'user_mismatch':
      return 'Usuario o contrasena incorrectos. El token no corresponde al usuario ingresado.';
    default:
      return 'Usuario o contrasena incorrectos.';
  }
}
