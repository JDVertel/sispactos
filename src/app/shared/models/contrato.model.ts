export interface Contrato {
  id: number;
  numero: string;
  objeto: string;
  contratista: string;
  valorContrato: number;
  tipoContrato: string;
  estado: string;
  fechaSuscripcion: Date;
  fechaInicio: Date;
  fechaTerminacion: Date;
}
