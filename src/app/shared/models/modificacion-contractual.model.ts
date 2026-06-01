export type TipoModificacionContractual =
  | 'prorroga'
  | 'suspension'
  | 'adicion'
  | 'adicion_y_prorroga'
  | 'cesion'
  | 'general';

export interface TipoModificacionContractualOption {
  value: TipoModificacionContractual;
  label: string;
}

export const TIPOS_MODIFICACION_CONTRACTUAL: TipoModificacionContractualOption[] = [
  { value: 'prorroga', label: 'Prórroga' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'adicion', label: 'Adición' },
  { value: 'adicion_y_prorroga', label: 'Adición y prórroga' },
  { value: 'cesion', label: 'Cesión' },
  { value: 'general', label: 'General' }
];

export function labelTipoModificacionContractual(tipo: TipoModificacionContractual): string {
  return TIPOS_MODIFICACION_CONTRACTUAL.find((t) => t.value === tipo)?.label ?? tipo;
}

export interface ModificacionContractual {
  id: string;
  contratoId: number;
  idPactoTerritorial: number | null;
  pacto: string;
  idProyecto: number | null;
  proyecto: string;
  numeroContrato: string;
  tipoModificacion: TipoModificacionContractual;
  fechaModificacion: string;
  inicioNovedad: string;
  fechaFinal: string;
  /** Calculado a partir de inicio y fin de la novedad. */
  meses: number;
  valorAdicionado: number;
  registradoEn: string;
}
