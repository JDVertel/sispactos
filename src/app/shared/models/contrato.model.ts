export interface Contrato {
  id: number;
  pacto: string;
  proyecto: string;
  objeto: string;
  contratista: string;
  fechaInicio: Date;
  fechaFin: Date;
  contratoPadre: string;
  tipoContrato: string;
  contratante: string;
  valorInicial: number;
  supervisor: string;
  urlSecop: string;
}
