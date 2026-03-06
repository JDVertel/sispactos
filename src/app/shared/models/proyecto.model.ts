export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  pactoAsociado?: string;
  codigo: string;
  bpin?: string;
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
  numeroContratoEspecifico?: number;
  fechaFinalizacionCe?: Date;
  presupuesto: number;
  responsable: string;
  estado: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  fechaCreacion: Date;
}
