import {
  ProyectoFinancieraComprometidoDetalle,
  ProyectoFinancieraIndicativos
} from '../../shared/models/proyecto-financiera.model';

function n(value: number | null | undefined): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

/** Par indicativo ↔ línea de presupuesto comprometido (misma estructura de rubros). */
export interface LiberacionRubroPar {
  comprometidoKey: keyof ProyectoFinancieraComprometidoDetalle;
  indicativoKey: keyof ProyectoFinancieraIndicativos;
  label: string;
}

export const LIBERACION_RUBROS: LiberacionRubroPar[] = [
  {
    comprometidoKey: 'presupuestoComprometidoDnpFrpt',
    indicativoKey: 'aporteIndicativoDnpFrpt',
    label: 'Liberación de saldos DNP-FRPT'
  },
  {
    comprometidoKey: 'presupuestoComprometidoDnpDistribucion',
    indicativoKey: 'aporteIndicativoDnpDistribucion',
    label: 'Liberación de saldos DNP-distribución'
  },
  {
    comprometidoKey: 'presupuestoComprometidoSector',
    indicativoKey: 'aporteIndicativoSector',
    label: 'Liberación de saldos sector'
  },
  {
    comprometidoKey: 'presupuestoComprometidoPropiosEtDptos',
    indicativoKey: 'aporteIndicativoPropiosEtDptos',
    label: 'Liberación de saldos propios ET Dptos'
  },
  {
    comprometidoKey: 'presupuestoComprometidoEtMunicipios',
    indicativoKey: 'aporteIndicativoEtMunicipios',
    label: 'Liberación de saldos ET Municipios'
  },
  {
    comprometidoKey: 'presupuestoComprometidoRegaliasDirectasDpto',
    indicativoKey: 'aporteIndicativoRegaliasDirectasDptos',
    label: 'Liberación de saldos regalías directas Dpto'
  },
  {
    comprometidoKey: 'presupuestoComprometidoRegaliasDirectasMunicipios',
    indicativoKey: 'aporteIndicativoRegaliasDirectasMunicipios',
    label: 'Liberación de saldos regalías directas Municipios'
  },
  {
    comprometidoKey: 'presupuestoComprometidoFondoRegionalSgr60',
    indicativoKey: 'aporteIndicativoAsignacionFondoRegionalSgr60',
    label: 'Liberación de saldos fondo regional SGR (60%)'
  },
  {
    comprometidoKey: 'presupuestoComprometidoFondoRegionalSgr40',
    indicativoKey: 'aporteIndicativoAsignacionFondoRegionalSgr40',
    label: 'Liberación de saldos fondo regional SGR (40%)'
  },
  {
    comprometidoKey: 'presupuestoComprometidoCtelSgr',
    indicativoKey: 'aporteIndicativoCtelSgr',
    label: 'Liberación de saldos CTEL-SGR'
  },
  {
    comprometidoKey: 'presupuestoComprometidoAsignacionAmbiental',
    indicativoKey: 'aporteIndicativoAsignacionAmbiental',
    label: 'Liberación de saldos asignación ambiental'
  },
  {
    comprometidoKey: 'presupuestoComprometidoAsignacionInversionLocalSgr',
    indicativoKey: 'aporteIndicativoAsignacionInversionLocalSgr',
    label: 'Liberación de saldos asignación para inversión local SGR'
  },
  {
    comprometidoKey: 'presupuestoComprometidoOcadPaz',
    indicativoKey: 'aporteIndicativoOcadPaz',
    label: 'Liberación de saldos OCAD PAZ'
  },
  {
    comprometidoKey: 'presupuestoComprometidoOtrosTerritorios',
    indicativoKey: 'aporteIndicativoOtrosTerritorio',
    label: 'Liberación de saldos otros territorios'
  },
  {
    comprometidoKey: 'presupuestoComprometidoAportesOtros',
    indicativoKey: 'aporteIndicativoOtros',
    label: 'Liberación de saldos aportes otros'
  }
];

/**
 * Valor sugerido por rubro: indicativo − comprometido acumulado.
 * Positivo: saldo disponible; negativo: exceso de compromiso frente al indicativo.
 */
export function calcularDetalleLiberacionSugerida(
  indicativos: ProyectoFinancieraIndicativos,
  comprometidoAcumulado: ProyectoFinancieraComprometidoDetalle
): ProyectoFinancieraComprometidoDetalle {
  const out = {} as ProyectoFinancieraComprometidoDetalle;
  for (const rubro of LIBERACION_RUBROS) {
    const indicativo = n(
      indicativos[rubro.indicativoKey] as number | null | undefined
    );
    const comprometido = n(comprometidoAcumulado[rubro.comprometidoKey]);
    out[rubro.comprometidoKey] = indicativo - comprometido;
  }
  return out;
}
