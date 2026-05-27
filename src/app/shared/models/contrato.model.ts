export interface Contrato {
  id: number;
  idPactoTerritorial?: number | null;
  pacto: string;
  idProyecto?: number | null;
  proyecto: string;
  idTipoContrato?: number | null;
  tipoContrato: string;
  contratista: string;
  numeroContrato: string;
  fechaSuscripcion: string;
  fechaInicio: string;
  fechaTerminacionInicial: string;
  idEstado?: number | null;
  estado: string;
  idCondicion?: number | null;
  condicion: string;
  valorInicial: number;
  numeroDesembolsos: number;
  contratoPadre?: string;
  contratante: string;
  interventor: string;
  objeto: string;
  urlSecop?: string;
}
