import { Injectable } from '@angular/core';

export type TipoActorMaestro = 'Contratista' | 'Contratante' | 'Supervisor';

export interface ActorMaestro {
  id: number;
  tipo: TipoActorMaestro;
  nombre: string;
  estado: 'Activo' | 'Inactivo';
}

@Injectable({
  providedIn: 'root'
})
export class ActoresMaestroService {
  private readonly actores: ActorMaestro[] = [
    { id: 1, tipo: 'Contratista', nombre: 'Consorcio Vias del Norte', estado: 'Activo' },
    { id: 2, tipo: 'Contratante', nombre: 'DNP Territorial', estado: 'Activo' },
    { id: 3, tipo: 'Supervisor', nombre: 'Laura Pinzon', estado: 'Activo' },
    { id: 4, tipo: 'Contratista', nombre: 'Union Temporal Delta', estado: 'Activo' },
    { id: 5, tipo: 'Supervisor', nombre: 'Carlos Mendoza', estado: 'Activo' },
    { id: 6, tipo: 'Contratante', nombre: 'Ministerio de Transporte', estado: 'Activo' }
  ];

  getContratistas(): string[] {
    return this.nombresActivos('Contratista');
  }

  getContratantes(): string[] {
    return this.nombresActivos('Contratante');
  }

  /** Interventores (maestro; tipo almacenado como Supervisor). */
  getInterventores(): string[] {
    return this.nombresActivos('Supervisor');
  }

  private nombresActivos(tipo: TipoActorMaestro): string[] {
    return this.actores
      .filter((a) => a.tipo === tipo && a.estado === 'Activo')
      .map((a) => a.nombre);
  }
}
