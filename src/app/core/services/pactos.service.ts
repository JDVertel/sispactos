import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pacto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class PactosService {
  // Almacena la lista de pactos en memoria y permite notificar cambios.
  private pactos = new BehaviorSubject<Pacto[]>([]);
  public pactos$ = this.pactos.asObservable();

  private ejesEstrategicos = [
    'Desarrollo Regional Sostenible',
    'Crecimiento Económico Inclusivo',
    'Fortalecimiento Institucional',
    'Innovación y Competitividad',
    'Desarrollo Social',
    'Infraestructura y Conectividad',
    'Medio Ambiente y Sostenibilidad',
    'Educación y Capital Humano'
  ];

  constructor() {}

  // Entrega la lista de pactos para que los componentes la muestren.
  getPactos(): Observable<Pacto[]> {
    return this.pactos$;
  }

  // Agrega un pacto nuevo y le asigna un ID consecutivo.
  addPacto(pacto: Omit<Pacto, 'id' | 'fechaCreacion'>): void {

    const currentPactos = this.pactos.value;
    const nextId = currentPactos.length ? Math.max(...currentPactos.map(p => p.id)) + 1 : 1;
    
    const newPacto: Pacto = {
      id: nextId,
      ...pacto as Omit<Pacto, 'id'>
    };

    this.pactos.next([...currentPactos, newPacto]);
  }

  // Elimina un pacto por su ID.
  removePacto(id: number): void {
    this.pactos.next(this.pactos.value.filter(p => p.id !== id));
  }

  // Actualiza parcialmente la información de un pacto existente.
  updatePacto(id: number, pacto: Partial<Omit<Pacto, 'id'>>): void {
    const pactos = this.pactos.value.map(p => 
      p.id === id ? { ...p, ...pacto } : p
    );
    this.pactos.next(pactos);
  }

  // Suma el valor estimado de todos los pactos registrados.
  getTotalValorEstimado(): number {
    return this.pactos.value.reduce((sum, pacto) => sum + (pacto.valorEstimado || 0), 0);
  }
}
