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

/** Valores editables de una versión de presupuesto comprometido (sin totales calculados). */
export interface ProyectoFinancieraComprometidoDetalle {
  presupuestoComprometidoDnpFrpt: number | null;
  presupuestoComprometidoDnpDistribucion: number | null;
  presupuestoComprometidoSector: number | null;
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
  presupuestoComprometidoAportesOtros: number | null;
}

/** Una iteración (inicial o adición presupuestal) del presupuesto comprometido. */
export interface ProyectoFinancieraComprometidoVersion {
  id: string;
  etiqueta: string;
  tipoVersion: 'original' | 'anexo';
  detalle: ProyectoFinancieraComprometidoDetalle;
  registradoPor: string;
  registradoEn: string;
}

export interface ProyectoFinancieraComprometidoSesion {
  versiones: ProyectoFinancieraComprometidoVersion[];
}

/** Sesión: presupuesto comprometido (totales legacy / caché). */
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
  /** Versiones inicial + adiciones presupuestales; los totales visibles son la suma de todas. */
  comprometidoSesion: ProyectoFinancieraComprometidoSesion;
  /** Totales calculados (sincronizado al guardar; compatibilidad). */
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

export function createEmptyProyectoFinancieraComprometidoSesion(): ProyectoFinancieraComprometidoSesion {
  return { versiones: [] };
}

export function createEmptyProyectoFinancieraData(proyectoId: number): ProyectoFinancieraData {
  return {
    proyectoId,
    indicativos: createEmptyProyectoFinancieraIndicativos(),
    comprometidoSesion: createEmptyProyectoFinancieraComprometidoSesion(),
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
