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
  /** Nombre iniciativa (`nombreIniciativa` en API). */
  nombreIniciativa: string;
  /** Nombre de proyecto BPIN en MGA (`nombreProyectoBpin` en API). */
  nombreProyectoBpin?: string;
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
  /** Municipio / entidad territorial (etiqueta para tabla; formulario `municipioEntidad`). */
  municipioEntidadNombre?: string;
  /** Nombre entidad responsable PI en API (`entidadResponsablePI`); no usar en tabla. */
  responsable?: string;
  estado: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  fechaCreacion: Date;
  /** Meta de producto principal (`productoPrincipalMGA` en API). */
  productoPrincipalMGA?: string;
  /** Descripcion adicional de producto MGA (solo formulario; no contrato API principal). */
  productoMgaDescripcion?: string;
  /** Legacy: cantidad meta numerica si la API aun la expone. */
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
