/** Fila de vigencia CONPES (valor por año), persistida en financiera local. */
export interface ProyectoFinancieraVigencia {
  id: string;
  valor: number | null;
  anio: number | null;
  /** Usuario que registro la vigencia (sesion). */
  registradoPor: string;
  /** ISO fecha/hora de registro. */
  registradoEn: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
}

/** Sesión: presupuesto indicativos. */
export interface ProyectoFinancieraIndicativos {
  presupuestoIndicativoTotalInversion: number | null;
  aporteIndicativoDnpFrpt: number | null;
  aporteIndicativoDnpDistribucion: number | null;
  aporteIndicativoSector: number | null;
  aporteIndicativoConsolidadoNacion: number | null;
  aporteIndicativoPropiosEtDptos: number | null;
  aporteIndicativoEtMunicipios: number | null;
  aporteIndicativoRegaliasDirectasDptos: number | null;
  aporteIndicativoRegaliasDirectasMunicipios: number | null;
  aporteIndicativoAsignacionFondoRegionalSgr60: number | null;
  aporteIndicativoAsignacionFondoRegionalSgr40: number | null;
  aporteIndicativoCtelSgr: number | null;
  aporteIndicativoAsignacionAmbiental: number | null;
  aporteIndicativoAsignacionInversionLocalSgr: number | null;
  aporteIndicativoOcadPaz: number | null;
  aporteIndicativoOtrosTerritorio: number | null;
  aporteIndicativoEntidadesTerritoriales: number | null;
  aporteIndicativoOtros: number | null;
}

/** Sesión: presupuesto comprometido. */
export interface ProyectoFinancieraComprometido {
  presupuestoComprometidoTotal: number | null;
  presupuestoComprometidoDnpFrpt: number | null;
  presupuestoComprometidoDnpDistribucion: number | null;
  presupuestoComprometidoSector: number | null;
  presupuestoComprometidoConsolidadoNacion: number | null;
  presupuestoComprometidoPropiosEtDptos: number | null;
  presupuestoComprometidoEtMunicipios: number | null;
  presupuestoComprometidoRegaliasDirectasDpto: number | null;
  presupuestoComprometidoRegaliasDirectasMunicipios: number | null;
  presupuestoComprometidoFondoRegionalSgr60: number | null;
  presupuestoComprometidoFondoRegionalSgr40: number | null;
  presupuestoComprometidoCtelSgr: number | null;
  presupuestoComprometidoAsignacionAmbiental: number | null;
  presupuestoComprometidoAsignacionInversionLocalSgr: number | null;
  presupuestoComprometidoOcadPaz: number | null;
  presupuestoComprometidoOtrosTerritorios: number | null;
  presupuestoComprometidoEntidadesTerritoriales: number | null;
  presupuestoComprometidoAportesOtros: number | null;
}

/** Sesión CONPES (debe registrarse antes de agregar vigencias). */
export interface ProyectoFinancieraConpes {
  numeroConpes: string;
  fechaConpes: string;
  consecutivoProyecto: string;
  vigencias: ProyectoFinancieraVigencia[];
  registradoPor?: string;
  registradoEn?: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
}

/** Indica si la sesión CONPES ya fue registrada (número y fecha obligatorios). */
export function isProyectoFinancieraConpesRegistrado(conpes: ProyectoFinancieraConpes): boolean {
  return !!(conpes.numeroConpes?.trim() && conpes.fechaConpes?.trim());
}

export interface ProyectoFinancieraData {
  proyectoId: number;
  indicativos: ProyectoFinancieraIndicativos;
  comprometido: ProyectoFinancieraComprometido;
  conpes: ProyectoFinancieraConpes;
  updatedAt: string;
}

export function createEmptyProyectoFinancieraIndicativos(): ProyectoFinancieraIndicativos {
  return {
    presupuestoIndicativoTotalInversion: null,
    aporteIndicativoDnpFrpt: null,
    aporteIndicativoDnpDistribucion: null,
    aporteIndicativoSector: null,
    aporteIndicativoConsolidadoNacion: null,
    aporteIndicativoPropiosEtDptos: null,
    aporteIndicativoEtMunicipios: null,
    aporteIndicativoRegaliasDirectasDptos: null,
    aporteIndicativoRegaliasDirectasMunicipios: null,
    aporteIndicativoAsignacionFondoRegionalSgr60: null,
    aporteIndicativoAsignacionFondoRegionalSgr40: null,
    aporteIndicativoCtelSgr: null,
    aporteIndicativoAsignacionAmbiental: null,
    aporteIndicativoAsignacionInversionLocalSgr: null,
    aporteIndicativoOcadPaz: null,
    aporteIndicativoOtrosTerritorio: null,
    aporteIndicativoEntidadesTerritoriales: null,
    aporteIndicativoOtros: null
  };
}

export function createEmptyProyectoFinancieraComprometido(): ProyectoFinancieraComprometido {
  return {
    presupuestoComprometidoTotal: null,
    presupuestoComprometidoDnpFrpt: null,
    presupuestoComprometidoDnpDistribucion: null,
    presupuestoComprometidoSector: null,
    presupuestoComprometidoConsolidadoNacion: null,
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
    presupuestoComprometidoEntidadesTerritoriales: null,
    presupuestoComprometidoAportesOtros: null
  };
}

export function createEmptyProyectoFinancieraData(proyectoId: number): ProyectoFinancieraData {
  return {
    proyectoId,
    indicativos: createEmptyProyectoFinancieraIndicativos(),
    comprometido: createEmptyProyectoFinancieraComprometido(),
    conpes: {
      numeroConpes: '',
      fechaConpes: '',
      consecutivoProyecto: '',
      vigencias: []
    },
    updatedAt: new Date().toISOString()
  };
}
