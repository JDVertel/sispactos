import {
  ProyectoFinancieraComprometido,
  ProyectoFinancieraIndicativos
} from '../../shared/models/proyecto-financiera.model';

function n(value: number | null | undefined): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

function sumKeys<T extends object>(obj: T, keys: (keyof T)[]): number {
  return keys.reduce((acc, key) => acc + n(obj[key] as number | null), 0);
}

const INDICATIVOS_CONSOLIDADO_KEYS: (keyof ProyectoFinancieraIndicativos)[] = [
  'aporteIndicativoDnpFrpt',
  'aporteIndicativoDnpDistribucion',
  'aporteIndicativoSector'
];

const INDICATIVOS_ENTIDADES_KEYS: (keyof ProyectoFinancieraIndicativos)[] = [
  'aporteIndicativoPropiosEtDptos',
  'aporteIndicativoEtMunicipios',
  'aporteIndicativoRegaliasDirectasDptos',
  'aporteIndicativoRegaliasDirectasMunicipios',
  'aporteIndicativoAsignacionFondoRegionalSgr60',
  'aporteIndicativoAsignacionFondoRegionalSgr40',
  'aporteIndicativoCtelSgr',
  'aporteIndicativoAsignacionAmbiental',
  'aporteIndicativoAsignacionInversionLocalSgr',
  'aporteIndicativoOcadPaz',
  'aporteIndicativoOtrosTerritorio'
];

const COMPROMETIDO_CONSOLIDADO_KEYS: (keyof ProyectoFinancieraComprometido)[] = [
  'presupuestoComprometidoDnpFrpt',
  'presupuestoComprometidoDnpDistribucion',
  'presupuestoComprometidoSector'
];

const COMPROMETIDO_ENTIDADES_KEYS: (keyof ProyectoFinancieraComprometido)[] = [
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
  'presupuestoComprometidoOtrosTerritorios'
];

export interface FinancieraTotalesSesion {
  consolidadoNacion: number;
  entidadesTerritoriales: number;
  otros: number;
  totalInversion: number;
}

export function calcularTotalesIndicativos(data: ProyectoFinancieraIndicativos): FinancieraTotalesSesion {
  const consolidadoNacion = sumKeys(data, INDICATIVOS_CONSOLIDADO_KEYS);
  const entidadesTerritoriales = sumKeys(data, INDICATIVOS_ENTIDADES_KEYS);
  const otros = n(data.aporteIndicativoOtros);
  const totalInversion = consolidadoNacion + entidadesTerritoriales + otros;
  return { consolidadoNacion, entidadesTerritoriales, otros, totalInversion };
}

export function calcularTotalesComprometido(data: ProyectoFinancieraComprometido): FinancieraTotalesSesion {
  const consolidadoNacion = sumKeys(data, COMPROMETIDO_CONSOLIDADO_KEYS);
  const entidadesTerritoriales = sumKeys(data, COMPROMETIDO_ENTIDADES_KEYS);
  const otros = n(data.presupuestoComprometidoAportesOtros);
  const totalInversion = consolidadoNacion + entidadesTerritoriales + otros;
  return { consolidadoNacion, entidadesTerritoriales, otros, totalInversion };
}

/** Totales de una sola versión o del acumulado de detalles sumados. */
export function calcularTotalesComprometidoDesdeDetalle(
  detalle: Pick<
    ProyectoFinancieraComprometido,
    | 'presupuestoComprometidoDnpFrpt'
    | 'presupuestoComprometidoDnpDistribucion'
    | 'presupuestoComprometidoSector'
    | 'presupuestoComprometidoPropiosEtDptos'
    | 'presupuestoComprometidoEtMunicipios'
    | 'presupuestoComprometidoRegaliasDirectasDpto'
    | 'presupuestoComprometidoRegaliasDirectasMunicipios'
    | 'presupuestoComprometidoFondoRegionalSgr60'
    | 'presupuestoComprometidoFondoRegionalSgr40'
    | 'presupuestoComprometidoCtelSgr'
    | 'presupuestoComprometidoAsignacionAmbiental'
    | 'presupuestoComprometidoAsignacionInversionLocalSgr'
    | 'presupuestoComprometidoOcadPaz'
    | 'presupuestoComprometidoOtrosTerritorios'
    | 'presupuestoComprometidoAportesOtros'
  >
): FinancieraTotalesSesion {
  return calcularTotalesComprometido(detalle as ProyectoFinancieraComprometido);
}

export function aplicarTotalesIndicativos(data: ProyectoFinancieraIndicativos): void {
  const t = calcularTotalesIndicativos(data);
  data.aporteIndicativoConsolidadoNacion = t.consolidadoNacion;
  data.aporteIndicativoEntidadesTerritoriales = t.entidadesTerritoriales;
  data.presupuestoIndicativoTotalInversion = t.totalInversion;
}

export function aplicarTotalesComprometido(data: ProyectoFinancieraComprometido): void {
  const t = calcularTotalesComprometido(data);
  data.presupuestoComprometidoConsolidadoNacion = t.consolidadoNacion;
  data.presupuestoComprometidoEntidadesTerritoriales = t.entidadesTerritoriales;
  data.presupuestoComprometidoTotal = t.totalInversion;
}
