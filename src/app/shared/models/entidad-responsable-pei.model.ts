/** Entidad responsable PEI configurada en Parámetros. */
export interface EntidadResponsablePei {
  id: string;
  nombre: string;
  observaciones: string;
  registradoEn: string;
}

export type EntidadResponsablePeiInput = Omit<EntidadResponsablePei, 'id' | 'registradoEn'>;
