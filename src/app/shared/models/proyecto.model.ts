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
  sesionCDInclusion?: number;
  idSectorAdministracionNacional?: number;
  idEntidadProyecto?: string;
  inversionClimatica?: boolean;
  /** Fecha plazo estimado (yyyy-MM-dd) para reabrir el formulario. */
  plazoEstimadoEjecucion?: string;
  actaCdNumero?: string;
  actaCdFecha?: string;
  nombre: string;
  /** Nombre de proyecto BPIN en MGA (formulario / API). */
  nombreBpin?: string;
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
  numeroContratoEspecifico?: string;
  fechaFinalizacionCe?: Date;
  presupuesto: number;
  responsable: string;
  estado: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  fechaCreacion: Date;
  productoPrincipalMga?: string;
  /** Meta de producto principal (entero no negativo). */
  cantidadMeta?: number;
  /** Medido a traves de (unidad de medida). */
  unidadMedidaMeta?: string;
  /** Coordenada geografica del proyecto (grados decimales). */
  latitud?: number;
  longitud?: number;
  /** Imagenes devueltas por la API del proyecto. */
  imagenes?: ProyectoImagenRegistrada[];
  multimediaNombres?: string[];
  multimediaVideoUrls?: string[];
  /** Metadatos por archivo de imagen o URL de video. */
  multimediaMetadatos?: ProyectoMultimediaMetadato[];
}

export interface ProyectoMultimediaMetadato {
  tipo: 'imagen' | 'video';
  /** Nombre de archivo (imagen) o URL (video). */
  referencia: string;
  fecha: string;
  detalle: string;
}

export interface ProyectoImagenRegistrada {
  descripcionImagen: string;
  fechaImagen: string;
  archivoImagen: string | null;
}
