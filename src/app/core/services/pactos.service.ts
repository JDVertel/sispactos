import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pacto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class PactosService {
  private readonly storageKey = 'sispactos.pactos';

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

  constructor() {
    this.loadFromStorage();
  }

  // Entrega la lista de pactos para que los componentes la muestren.
  getPactos(): Observable<Pacto[]> {
    return this.pactos$;
  }

  // Agrega un pacto nuevo y le asigna un ID consecutivo.
  addPacto(pacto: Omit<Pacto, 'id'>): void {

    const currentPactos = this.pactos.value;
    const nextId = currentPactos.length ? Math.max(...currentPactos.map(p => p.id)) + 1 : 1;

    const newPacto: Pacto = this.sanitizeRecord({
      id: nextId,
      ...pacto
    });

    this.pactos.next([...currentPactos, newPacto]);
    this.saveToStorage();
  }

  // Elimina un pacto por su ID.
  removePacto(id: number): void {
    this.pactos.next(this.pactos.value.filter(p => p.id !== id));
    this.saveToStorage();
  }

  // Actualiza parcialmente la información de un pacto existente.
  updatePacto(id: number, pacto: Partial<Omit<Pacto, 'id'>>): void {
    const pactos = this.pactos.value.map(p =>
      p.id === id ? { ...p, ...pacto } : p
    );
    this.pactos.next(pactos);
    this.saveToStorage();
  }

  // Suma el valor estimado de todos los pactos registrados.
  getTotalValorEstimado(): number {
    return this.pactos.value.reduce((sum, pacto) => sum + (pacto.valorEstimado || 0), 0);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Pacto[];
      if (!Array.isArray(parsed)) {
        this.pactos.next([]);
        return;
      }

      this.pactos.next(parsed.map((pacto) => this.sanitizeRecord(pacto)));
      this.saveToStorage();
    } catch {
      this.pactos.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.pactos.value));
  }

  private sanitizeRecord<T extends object>(record: T): T {
    const cleanedEntries = Object.entries(record).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    });

    return Object.fromEntries(cleanedEntries) as T;
  }
}
