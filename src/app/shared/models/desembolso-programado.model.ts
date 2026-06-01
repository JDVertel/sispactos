/** Desembolso programado (P_DESEMBOLSOS) asociado a un contrato. */
export interface DesembolsoProgramado {
  id: string;
  contratoId: number;
  idPactoTerritorial: number | null;
  pacto: string;
  idProyecto: number | null;
  proyecto: string;
  numeroContrato: string;
  numeroDesembolso: number;
  fechaEstimadaProgramada: string;
  valor: number;
  hito: string;
  registradoEn: string;
}
