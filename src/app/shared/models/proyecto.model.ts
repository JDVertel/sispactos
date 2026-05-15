export interface Proyecto {
  id: number;
  /** Id del registro en la API (`PUT /api/Proyecto`). */
  apiId?: number;
  idPactoTerritorial?: number;
  idAreaInfluencia?: number;
  idEstadoProyecto?: number;
  idCondicionProyecto?: number;
  idSectorCatalogo?: number;
  idAportanteNacion?: number;
  idMecanismoInclusion?: number;
  idSectorAdministracionNacional?: number;
  idEntidadProyecto?: string;
  metaPaTexto?: string;
  inversionClimatica?: boolean;
  /** Fecha plazo estimado (yyyy-MM-dd) para reabrir el formulario. */
  plazoEstimadoEjecucion?: string;
  actaCdNumero?: string;
  actaCdFecha?: string;
  nombre: string;
  descripcion: string;
  pactoAsociado?: string;
  codigo: string;
  bpin?: string;
  actaCd?: string;
  sector?: string;
  lineaTematica?: string;
  tipoProyecto?: string;
  faseInversion?: string;
  fechaReporte?: Date;
  numeroEmpleosDirectos?: number;
  numeroEmpleosIndirectos?: number;
  consecutivoConpes?: number;
  tieneViabilidad?: boolean;
  fechaViabilidad?: Date;
  frpt?: boolean;
  numeroContratoEspecifico?: number;
  fechaFinalizacionCe?: Date;
  presupuesto: number;
  responsable: string;
  estado: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  fechaCreacion: Date;
  productoPrincipalMga?: string;
  /** Cantidad asociada a la meta PA (entero no negativo). */
  cantidadMetaPa?: number;
  multimediaNombres?: string[];
}
