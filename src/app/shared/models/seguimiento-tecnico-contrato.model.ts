/** Registro de seguimiento técnico asociado a un contrato. */
export interface SeguimientoTecnicoContrato {
  id: string;
  contratoId: number;
  fechaReporte: string;
  detalle: string;
  registradoEn: string;
}

export type SeguimientoTecnicoContratoInput = Omit<SeguimientoTecnicoContrato, 'id' | 'registradoEn'>;
