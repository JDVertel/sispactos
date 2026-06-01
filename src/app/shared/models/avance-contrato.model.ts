/** Registro de avance físico/financiero asociado a un contrato. */
export interface AvanceContrato {
  id: string;
  contratoId: number;
  fechaReporte: string;
  detalle: string;
  registradoEn: string;
}

export type AvanceContratoInput = Omit<AvanceContrato, 'id' | 'registradoEn'>;
