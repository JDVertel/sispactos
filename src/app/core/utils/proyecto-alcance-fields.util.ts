/** Campos MGA / sesión CD embebidos históricamente en el texto de alcance. */
export type ProyectoAlcanceCamposParseados = {
  productoPrincipalMga: string;
  cantidadMeta: number | null;
  unidadMedidaMeta: string;
  sesionCdPei: number | null;
  alcanceLimpio: string;
};

function resolveCantidadMeta(cantidad: number): number | null {
  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad < 0) {
    return null;
  }
  return cantidad;
}

/** Extrae metadatos del alcance cuando la API no devuelve columnas dedicadas. */
export function parseCamposDesdeAlcanceApi(raw?: string | null): ProyectoAlcanceCamposParseados {
  const texto = (raw || '').trim();
  let sesionCdPei: number | null = null;
  const sesionMatch = texto.match(/Sesion CD inclusion PEI:\s*(\d+)/i);
  if (sesionMatch?.[1]) {
    const n = Number(sesionMatch[1]);
    sesionCdPei = Number.isInteger(n) && n >= 1 ? n : null;
  }

  let productoPrincipalMga = '';
  const prodMatch = texto.match(/Producto principal MGA:\s*([^|]+)/i);
  if (prodMatch?.[1]) {
    productoPrincipalMga = prodMatch[1].trim();
  }

  let cantidadMeta: number | null = null;
  const metaPrincipalMatch = texto.match(/Meta producto principal:\s*(\d+)/i);
  const cantidadMatch = texto.match(/Cantidad:\s*(\d+)/i);
  const cantidadRaw = metaPrincipalMatch?.[1] ?? cantidadMatch?.[1];
  if (cantidadRaw) {
    cantidadMeta = resolveCantidadMeta(Number(cantidadRaw));
  }

  let unidadMedidaMeta = '';
  const unidadMatch = texto.match(/(?:Meta PA|Unidad medida meta):\s*([^|]+)/i);
  if (unidadMatch?.[1]) {
    unidadMedidaMeta = unidadMatch[1].trim();
  }

  let alcanceLimpio = texto;
  for (const patron of [
    /Producto principal MGA:\s*[^|]+/gi,
    /Meta producto principal:\s*[^|]+/gi,
    /Meta PA:\s*[^|]+/gi,
    /Unidad medida meta:\s*[^|]+/gi,
    /Cantidad:\s*\d+/gi,
    /Sesion CD inclusion PEI:\s*\d+/gi
  ]) {
    alcanceLimpio = alcanceLimpio.replace(patron, '');
  }
  alcanceLimpio = alcanceLimpio.replace(/\|\s*\|/g, '|').replace(/^\|\s*|\s*\|$/g, '').trim();

  return {
    productoPrincipalMga,
    cantidadMeta,
    unidadMedidaMeta,
    sesionCdPei,
    alcanceLimpio
  };
}
