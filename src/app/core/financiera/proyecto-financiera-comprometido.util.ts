import {
  ProyectoFinancieraComprometido,
  ProyectoFinancieraComprometidoDetalle,
  ProyectoFinancieraComprometidoVersion
} from '../../shared/models/proyecto-financiera.model';

function n(value: number | null | undefined): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

/** Campos editables por versión (sin totales calculados). */
export const COMPROMETIDO_DETALLE_KEYS: (keyof ProyectoFinancieraComprometidoDetalle)[] = [
  'presupuestoComprometidoDnpFrpt',
  'presupuestoComprometidoDnpDistribucion',
  'presupuestoComprometidoSector',
  'presupuestoComprometidoPropiosEtDptos',
  'presupuestoComprometidoEtMunicipios',
  'presupuestoComprometidoRegaliasDirectasDpto',
  'presupuestoComprometidoRegaliasDirectasMunicipios',
  'presupuestoComprometidoFondoRegionalSgr60',
  'presupuestoComprometidoFondoRegionalSgr40',
  'presupuestoComprometidoCtelSgr',
  'presupuestoComprometidoAsignacionAmbiental',
  'presupuestoComprometidoAsignacionInversionLocalSgr',
  'presupuestoComprometidoOcadPaz',
  'presupuestoComprometidoOtrosTerritorios',
  'presupuestoComprometidoAportesOtros'
];

export function createEmptyComprometidoDetalle(): ProyectoFinancieraComprometidoDetalle {
  return {
    presupuestoComprometidoDnpFrpt: null,
    presupuestoComprometidoDnpDistribucion: null,
    presupuestoComprometidoSector: null,
    presupuestoComprometidoPropiosEtDptos: null,
    presupuestoComprometidoEtMunicipios: null,
    presupuestoComprometidoRegaliasDirectasDpto: null,
    presupuestoComprometidoRegaliasDirectasMunicipios: null,
    presupuestoComprometidoFondoRegionalSgr60: null,
    presupuestoComprometidoFondoRegionalSgr40: null,
    presupuestoComprometidoCtelSgr: null,
    presupuestoComprometidoAsignacionAmbiental: null,
    presupuestoComprometidoAsignacionInversionLocalSgr: null,
    presupuestoComprometidoOcadPaz: null,
    presupuestoComprometidoOtrosTerritorios: null,
    presupuestoComprometidoAportesOtros: null
  };
}

export function sumarComprometidoDetalles(
  versiones: ProyectoFinancieraComprometidoVersion[]
): ProyectoFinancieraComprometidoDetalle {
  const out = createEmptyComprometidoDetalle();
  for (const version of versiones) {
    for (const key of COMPROMETIDO_DETALLE_KEYS) {
      out[key] = n(out[key]) + n(version.detalle[key]);
    }
  }
  return out;
}

export function detalleToComprometidoCompleto(
  detalle: ProyectoFinancieraComprometidoDetalle
): ProyectoFinancieraComprometido {
  return {
    presupuestoComprometidoTotal: null,
    presupuestoComprometidoConsolidadoNacion: null,
    presupuestoComprometidoEntidadesTerritoriales: null,
    ...detalle
  };
}

export const ETIQUETA_COMPROMETIDO_INICIAL = 'Presupuesto comprometido inicial';
export const ETIQUETA_ADICION_PRESUPUESTAL = 'Adición presupuestal';

export function etiquetaAdicionPresupuestal(numero: number): string {
  return `${ETIQUETA_ADICION_PRESUPUESTAL} ${numero}`;
}

export function etiquetaNuevaVersionComprometido(versiones: ProyectoFinancieraComprometidoVersion[]): string {
  if (!versiones.length) {
    return ETIQUETA_COMPROMETIDO_INICIAL;
  }
  const adiciones = versiones.filter((v) => v.tipoVersion === 'anexo').length;
  return etiquetaAdicionPresupuestal(adiciones + 1);
}

/** Normaliza etiquetas visibles (p. ej. datos guardados como Original / Anexo N). */
export function relabelVersionesComprometido(
  versiones: ProyectoFinancieraComprometidoVersion[]
): ProyectoFinancieraComprometidoVersion[] {
  const ordenadas = [...versiones].sort(
    (a, b) => new Date(a.registradoEn || 0).getTime() - new Date(b.registradoEn || 0).getTime()
  );
  let numeroAdicion = 0;
  return ordenadas.map((v) => {
    if (v.tipoVersion === 'original') {
      return { ...v, etiqueta: ETIQUETA_COMPROMETIDO_INICIAL };
    }
    numeroAdicion += 1;
    return { ...v, etiqueta: etiquetaAdicionPresupuestal(numeroAdicion) };
  });
}

export function tipoVersionNuevaComprometido(
  versiones: ProyectoFinancieraComprometidoVersion[]
): 'original' | 'anexo' {
  return versiones.length === 0 ? 'original' : 'anexo';
}

/** Migra datos planos legacy a presupuesto comprometido inicial. */
export function migrarComprometidoLegacy(
  legacy: Partial<ProyectoFinancieraComprometido> | undefined
): ProyectoFinancieraComprometidoVersion[] {
  if (!legacy) {
    return [];
  }
  const detalle = createEmptyComprometidoDetalle();
  let tieneValor = false;
  for (const key of COMPROMETIDO_DETALLE_KEYS) {
    const val = legacy[key];
    if (val != null && Number.isFinite(Number(val)) && Number(val) !== 0) {
      detalle[key] = Number(val);
      tieneValor = true;
    }
  }
  if (!tieneValor) {
    return [];
  }
  return [
    {
      id: `comp-legacy-${Date.now()}`,
      etiqueta: ETIQUETA_COMPROMETIDO_INICIAL,
      tipoVersion: 'original',
      detalle,
      registradoPor: '—',
      registradoEn: ''
    }
  ];
}
