import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pacto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class PactosService {
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

  getPactos(): Observable<Pacto[]> {
    return this.pactos$;
  }

  addPacto(pacto: Omit<Pacto, 'id' | 'fechaCreacion'>): void {

    const currentPactos = this.pactos.value;
    const nextId = currentPactos.length ? Math.max(...currentPactos.map(p => p.id)) + 1 : 1;
    
    const newPacto: Pacto = {
      id: nextId,
      ...pacto as Omit<Pacto, 'id'>
    };

    this.pactos.next([...currentPactos, newPacto]);
  }

  removePacto(id: number): void {
    this.pactos.next(this.pactos.value.filter(p => p.id !== id));
  }

  updatePacto(id: number, pacto: Partial<Omit<Pacto, 'id'>>): void {
    const pactos = this.pactos.value.map(p => 
      p.id === id ? { ...p, ...pacto } : p
    );
    this.pactos.next(pactos);
  }

  getTotalValorEstimado(): number {
    return this.pactos.value.reduce((sum, pacto) => sum + (pacto.valorEstimado || 0), 0);
  }
}
