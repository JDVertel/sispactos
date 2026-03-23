import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Proyecto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private readonly storageKey = 'sispactos.proyectos';

  // Almacena los proyectos en memoria para consulta y actualización.
  private proyectos = new BehaviorSubject<Proyecto[]>([]);
  public proyectos$ = this.proyectos.asObservable();

  private estadosProyecto = [
    'No iniciado',
    'Planeación',
    'En Ejecución',
    'Suspendido',
    'Finalizado',
    'Cancelado'
  ];

  constructor() {
    this.loadFromStorage();
  }

  // Entrega la lista de proyectos a quien la necesite.
  getProyectos(): Observable<Proyecto[]> {
    return this.proyectos$;
  }

  // Crea un proyecto nuevo y le asigna ID y fecha de creación.
  addProyecto(proyecto: Omit<Proyecto, 'id' | 'fechaCreacion'>): void {
    const currentProyectos = this.proyectos.value;
    const nextId = currentProyectos.length ? Math.max(...currentProyectos.map(p => p.id)) + 1 : 1;

    const newProyecto: Proyecto = this.sanitizeRecord({
      id: nextId,
      ...proyecto,
      fechaCreacion: new Date()
    });

    this.proyectos.next([...currentProyectos, newProyecto]);
    this.saveToStorage();
  }

  // Elimina un proyecto por su ID.
  removeProyecto(id: number): void {
    this.proyectos.next(this.proyectos.value.filter(p => p.id !== id));
    this.saveToStorage();
  }

  // Actualiza campos puntuales de un proyecto existente.
  updateProyecto(id: number, proyecto: Partial<Omit<Proyecto, 'id' | 'fechaCreacion'>>): void {
    const proyectos = this.proyectos.value.map(p =>
      p.id === id ? { ...p, ...proyecto } : p
    );
    this.proyectos.next(proyectos);
    this.saveToStorage();
  }

  // Devuelve los estados permitidos para los proyectos.
  getEstadosProyecto(): string[] {
    return this.estadosProyecto;
  }

  // Calcula el presupuesto total de todos los proyectos.
  getTotalPresupuesto(): number {
    return this.proyectos.value.reduce((sum, p) => sum + p.presupuesto, 0);
  }

  getProyectosPorEstado(estado: string): number {
    return this.proyectos.value.filter(p => p.estado === estado).length;
  }

  getAvancePromedio(): number {
    if (this.proyectos.value.length === 0) return 0;
    const total = this.proyectos.value.reduce((sum, p) => sum + p.avance, 0);
    return Math.round(total / this.proyectos.value.length);
  }

  getTotalEmpleosDirectos(): number {
    return this.proyectos.value.reduce((sum, p) => sum + (p.numeroEmpleosDirectos ?? 0), 0);
  }

  getTotalEmpleosIndirectos(): number {
    return this.proyectos.value.reduce((sum, p) => sum + (p.numeroEmpleosIndirectos ?? 0), 0);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Proyecto[];
      if (!Array.isArray(parsed)) {
        this.proyectos.next([]);
        return;
      }

      const hydrated = parsed.map((proyecto) => this.sanitizeRecord({
        ...proyecto,
        fechaInicio: new Date(proyecto.fechaInicio),
        fechaFin: new Date(proyecto.fechaFin),
        fechaCreacion: new Date(proyecto.fechaCreacion),
        fechaViabilidad: proyecto.fechaViabilidad ? new Date(proyecto.fechaViabilidad) : undefined,
        fechaReporte: proyecto.fechaReporte ? new Date(proyecto.fechaReporte) : undefined,
        fechaFinalizacionCe: proyecto.fechaFinalizacionCe ? new Date(proyecto.fechaFinalizacionCe) : undefined
      }));

      this.proyectos.next(hydrated);
      this.saveToStorage();
    } catch {
      this.proyectos.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.proyectos.value));
  }

  private sanitizeRecord<T extends Record<string, unknown>>(record: T): T {
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
