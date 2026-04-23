export interface Pacto {
  id: number;
  idTipoPacto?: number;
  tipoPacto: string;
  nombre: string;
  descripcion: string;
  objetivo: string;
  lineasTematicas: string[];
  fechaSuscripcion?: string;
  fechaNegociacion?: string;
  valorEstimado?: number;
  valorEstimadoOtros?: number;
  porcentajeEstimado?: number;
  usuarioCreo?: string;
  fechaCreacion: string;
  usuarioModifico?: string;
  fechaModificacion?: string;
  idEtapa?: string;
  fechaVencimiento?: string;
  alcance?: string;
  urlDocPacto?: string;
  urlDocMinuta?: string;
  urlDocPEI?: string;
  urlDocFicha?: string;
}
