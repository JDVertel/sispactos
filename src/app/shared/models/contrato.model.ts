export interface Contrato {
  id: number;
  proyecto: string;
  objeto: string;
  contratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  contratoPadre: string;
  tipoContrato: string;
  contratante: string;
  valor: number;
  supervisor: string;
  urlSecop: string;
}
