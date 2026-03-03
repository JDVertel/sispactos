export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  presupuesto: number;
  responsable: string;
  estado: string;
  fechaInicio: Date;
  fechaFin: Date;
  avance: number;
  fechaCreacion: Date;
}
