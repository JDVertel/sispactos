import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Proyecto } from '../../shared/models';
import { of } from 'rxjs';

const PROYECTO_API_URL = '/api/Proyecto';
const PACTO_TERRITORIAL_API_URL = '/api/PactoTerritorial';

export type ProyectoApiRow = {
  pactoNombre?: string;
  id?: number;
  codigo?: string;
  bpin?: string;
  nombre?: string;
  sector?: string;
  estado?: string;
};

export type CreateProyectoCommand = {
  idPactoTerritorial: number;
  idEntidadProyecto: string;
  bpin: string;
  nombreBpin: string;
  codigo: string;
  nombre: string;
  actaCd: string;
  idAreaInfluencia: number;
  idEstadoProyecto: number;
  idCondicionProyecto: number;
  idSector: number;
  idLineaTematica: number;
  fechaInicio: string;
  fechaFin: string;
  plazoEstimadoEjecucion: number;
  idFaseInversion: number;
  idAportanteNacion: number;
  entidadProyecto: string;
  esInversionClimatica: boolean;
  idTipoOferta: number;
  esFondo: boolean;
  alcance: string;
  metaPa: string;
  idMecanismoInclusion: number;
  idSectorAdministracionNacional: number;
  fechaReporte: string;
  numeroEmpleosDirectos: number;
  numeroEmpleosIndirectos: number;
  consecutivoConpes: string;
  tieneViabilidad: boolean;
  fechaViabilidad: string;
  numeroContratoEspecifico: string;
};

export interface CreateProyectoResult {
  success: boolean;
  id?: number;
  nombre?: string;
  message?: string;
}

type ApiProyectoCreateResponse = {
  id?: unknown;
  nombre?: unknown;
};

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

  constructor(private readonly http: HttpClient) {
    this.loadFromStorage();
  }

  // Entrega la lista de proyectos a quien la necesite.
  getProyectos(): Observable<Proyecto[]> {
    return this.proyectos$;
  }

  /**
   * Tabla "Proyectos creados" basada en GET /api/PactoTerritorial.
   * Nota: la API puede (o no) traer proyectos embebidos dentro de cada pacto.
   * Este método intenta encontrarlos bajo llaves comunes (proyectos / proyectosPacto / etc.).
   */
  getProyectosCreadosDesdePactosApi(): Observable<ProyectoApiRow[]> {
    return this.http.get<unknown>(PACTO_TERRITORIAL_API_URL).pipe(
      map((response) => this.extractProyectosFromPactosResponse(response)),
      tap((rows) => {
        console.groupCollapsed('[API OK] GET /api/PactoTerritorial (extract proyectos)');
        console.log('rows:', rows);
        console.groupEnd();
      }),
      catchError((error) => {
        console.error('[API ERROR] GET /api/PactoTerritorial', error);
        return of([] as ProyectoApiRow[]);
      })
    );
  }

  // Crea un proyecto nuevo usando el endpoint transaccional /api/Proyecto.
  createProyecto(command: CreateProyectoCommand): Observable<CreateProyectoResult> {
    return this.http.post<ApiProyectoCreateResponse>(PROYECTO_API_URL, command).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/Proyecto');
        console.log('request:', command);
        console.log('response:', response);
        console.groupEnd();
      }),
      map((response) => {
        const id = typeof response?.id === 'number' ? response.id : Number(response?.id);
        const nombre = typeof response?.nombre === 'string' ? response.nombre : '';
        return {
          success: true,
          id: Number.isFinite(id) ? id : undefined,
          nombre: nombre.trim() || undefined
        } as CreateProyectoResult;
      }),
      catchError((error) => {
        console.error('[API ERROR] POST /api/Proyecto', error);
        return of({
          success: false,
          message: 'No fue posible crear el proyecto en la API.'
        } as CreateProyectoResult);
      })
    );
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

  private extractProyectosFromPactosResponse(response: unknown): ProyectoApiRow[] {
    const pactos = Array.isArray(response) ? response : (Array.isArray((response as any)?.data) ? (response as any).data : []);
    if (!Array.isArray(pactos) || pactos.length === 0) return [];

    const rows: ProyectoApiRow[] = [];
    for (const pactoRaw of pactos) {
      const pacto = (pactoRaw ?? {}) as Record<string, unknown>;
      const pactoNombre = this.readString(pacto['nombre']) || this.readString(pacto['nombrePacto']);

      const proyectosRaw =
        pacto['proyectos']
        ?? pacto['proyectosPacto']
        ?? pacto['listaProyectos']
        ?? pacto['proyecto']
        ?? pacto['proyectosTerritoriales'];

      const proyectos = Array.isArray(proyectosRaw) ? proyectosRaw : [];
      for (const pr of proyectos) {
        const p = (pr ?? {}) as Record<string, unknown>;
        rows.push({
          pactoNombre: pactoNombre || undefined,
          id: this.readNumber(p['id'] ?? p['idProyecto']),
          codigo: this.readString(p['codigo']),
          bpin: this.readString(p['bpin']),
          nombre: this.readString(p['nombre']) || this.readString(p['nombreBpin']),
          sector: this.readString(p['sector']),
          estado: this.readString(p['estado']) || this.readString(p['estadoProyecto'])
        });
      }
    }

    return rows;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }
}
