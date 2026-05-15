import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Proyecto } from '../../shared/models';
import { of } from 'rxjs';

const PROYECTO_API_URL = '/api/Proyecto';
/** Cuerpo POST `/api/Proyecto` (contrato OpenAPI). */
export type CreateProyectoCommand = {
  idPactoTerritorial: number;
  idEntidadProyecto: string;
  bpin: string;
  nombreBpin: string;
  codigo: string;
  nombre: string;
  fechaActaCD: string;
  actaCD: string;
  idAreaInfluencia: number;
  idEstadoProyecto: number;
  idCondicionProyecto: number;
  idSector: number;
  lineasTematicas: string;
  fechaInicio: string;
  fechaFin: string;
  plazoEstimadoEjecucion: string;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idFaseInversion?: number | null;
  idAportanteNacion: number;
  entidadResponsablePI: string;
  esInversionClimatica: boolean;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idTipoOferta?: number | null;
  esFRPT: boolean;
  alcance: string;
  presupuestoDnp: number;
  presupuestoSector: number;
  presuspuestoTerritorio: number;
  presupuestoOtros: number;
  aporteIndicativoDNP: number;
  aporteIndicativoNacion: number;
  aporteIndicativoTerritorio: number;
  aporteIndicativoOtros: number;
  productoMGA: string;
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

/** Cuerpo PUT `/api/Proyecto` (`EditaProyecto_Command`). */
export type UpdateProyectoCommand = CreateProyectoCommand & {
  id: number;
};

/** Detalle GET `/api/Proyecto/{Id}`. */
export type ProyectoDetalleApi = Partial<CreateProyectoCommand> & {
  id?: number;
  idPactoTerritorial?: number;
};

export interface ProyectoApiResult {
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

  getProyectosSnapshot(): Proyecto[] {
    return this.proyectos.value;
  }

  /** GET `/api/Proyecto/{Id}` — detalle para edición. */
  getProyectoById(id: number): Observable<ProyectoDetalleApi | null> {
    return this.http.get(`${PROYECTO_API_URL}/${id}`, { responseType: 'text' }).pipe(
      map((raw) => {
        const parsed = this.parseJsonPayload(raw);
        return this.normalizeProyectoDetalle(parsed);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`[API ERROR] GET /api/Proyecto/${id}`, error);
        return of(null);
      })
    );
  }

  /** POST `/api/Proyecto` — la API suele responder `text/plain` con JSON `{ id, nombre }`. */
  createProyecto(command: CreateProyectoCommand): Observable<ProyectoApiResult> {
    const payload = this.sanitizeCreateProyectoPayload(command);
    return this.http.post(PROYECTO_API_URL, payload, { responseType: 'text' }).pipe(
      tap((raw) => {
        console.groupCollapsed('[API OK] POST /api/Proyecto');
        console.log('request:', payload);
        console.log('response:', raw);
        console.groupEnd();
      }),
      map((raw) => this.mapCreateProyectoResponse(raw)),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] POST /api/Proyecto', error);
        return of({
          success: false,
          message: this.buildCreateProyectoErrorMessage(error)
        } as ProyectoApiResult);
      })
    );
  }

  /** PUT `/api/Proyecto` — actualiza un proyecto existente. */
  updateProyectoInApi(command: UpdateProyectoCommand): Observable<ProyectoApiResult> {
    const payload = this.sanitizeCreateProyectoPayload(command);
    return this.http.put(PROYECTO_API_URL, payload, { responseType: 'text' }).pipe(
      tap((raw) => {
        console.groupCollapsed('[API OK] PUT /api/Proyecto');
        console.log('request:', payload);
        console.log('response:', raw);
        console.groupEnd();
      }),
      map((raw) => this.mapCreateProyectoResponse(raw)),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] PUT /api/Proyecto', error);
        return of({
          success: false,
          message: this.buildProyectoApiErrorMessage(error, 'actualizar')
        } as ProyectoApiResult);
      })
    );
  }

  private mapCreateProyectoResponse(raw: string): ProyectoApiResult {
    const parsed = this.parseJsonPayload(raw);
    const row = (parsed && typeof parsed === 'object' ? parsed : {}) as ApiProyectoCreateResponse;
    const id = typeof row.id === 'number' ? row.id : Number(row.id);
    const nombre = typeof row.nombre === 'string' ? row.nombre : '';
    return {
      success: true,
      id: Number.isFinite(id) ? id : undefined,
      nombre: nombre.trim() || undefined
    };
  }

  private parseJsonPayload(raw: string | null): unknown {
    if (raw == null || raw === '') return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Normaliza GET detalle (camelCase / PascalCase) y convierte ids a number. */
  private normalizeProyectoDetalle(raw: unknown): ProyectoDetalleApi | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const r = raw as Record<string, unknown>;
    const n = (camel: string, pascal: string) => this.readApiNumber(r[camel] ?? r[pascal]);
    const s = (camel: string, pascal: string) => this.readApiString(r[camel] ?? r[pascal]);
    const b = (camel: string, pascal: string) => this.readApiBoolean(r[camel] ?? r[pascal]);

    return {
      id: n('id', 'Id'),
      idPactoTerritorial: n('idPactoTerritorial', 'IdPactoTerritorial'),
      idEntidadProyecto: s('idEntidadProyecto', 'IdEntidadProyecto'),
      bpin: s('bpin', 'Bpin'),
      nombreBpin: s('nombreBpin', 'NombreBpin'),
      codigo: s('codigo', 'Codigo'),
      nombre: s('nombre', 'Nombre'),
      fechaActaCD: s('fechaActaCD', 'FechaActaCD'),
      actaCD: s('actaCD', 'ActaCD'),
      idAreaInfluencia: n('idAreaInfluencia', 'IdAreaInfluencia'),
      idEstadoProyecto: n('idEstadoProyecto', 'IdEstadoProyecto'),
      idCondicionProyecto: n('idCondicionProyecto', 'IdCondicionProyecto'),
      idSector: n('idSector', 'IdSector'),
      lineasTematicas: s('lineasTematicas', 'LineasTematicas'),
      fechaInicio: s('fechaInicio', 'FechaInicio'),
      fechaFin: s('fechaFin', 'FechaFin'),
      plazoEstimadoEjecucion: s('plazoEstimadoEjecucion', 'PlazoEstimadoEjecucion'),
      idFaseInversion: n('idFaseInversion', 'IdFaseInversion'),
      idAportanteNacion: n('idAportanteNacion', 'IdAportanteNacion'),
      entidadResponsablePI: s('entidadResponsablePI', 'EntidadResponsablePI'),
      esInversionClimatica: b('esInversionClimatica', 'EsInversionClimatica'),
      idTipoOferta: n('idTipoOferta', 'IdTipoOferta'),
      esFRPT: b('esFRPT', 'EsFRPT'),
      alcance: s('alcance', 'Alcance'),
      productoMGA: s('productoMGA', 'ProductoMGA'),
      metaPa: s('metaPa', 'MetaPa'),
      idMecanismoInclusion: n('idMecanismoInclusion', 'IdMecanismoInclusion'),
      idSectorAdministracionNacional: n(
        'idSectorAdministracionNacional',
        'IdSectorAdministracionNacional'
      ),
      fechaReporte: s('fechaReporte', 'FechaReporte'),
      numeroEmpleosDirectos: n('numeroEmpleosDirectos', 'NumeroEmpleosDirectos'),
      numeroEmpleosIndirectos: n('numeroEmpleosIndirectos', 'NumeroEmpleosIndirectos'),
      consecutivoConpes: s('consecutivoConpes', 'ConsecutivoConpes'),
      tieneViabilidad: b('tieneViabilidad', 'TieneViabilidad'),
      fechaViabilidad: s('fechaViabilidad', 'FechaViabilidad'),
      numeroContratoEspecifico: s('numeroContratoEspecifico', 'NumeroContratoEspecifico')
    };
  }

  private readApiString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const t = value.trim();
      return t || undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return undefined;
  }

  private readApiNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value.trim());
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }

  private readApiBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true' || v === '1' || v === 'si' || v === 'sí') return true;
      if (v === 'false' || v === '0' || v === 'no') return false;
    }
    return undefined;
  }

  private sanitizeCreateProyectoPayload(
    command: CreateProyectoCommand | UpdateProyectoCommand
  ): CreateProyectoCommand | UpdateProyectoCommand {
    const payload = { ...command } as CreateProyectoCommand | UpdateProyectoCommand;
    payload.idFaseInversion = null;
    payload.idTipoOferta = null;
    return payload;
  }

  private buildProyectoApiErrorMessage(error: HttpErrorResponse, accion: 'crear' | 'actualizar'): string {
    const raw = this.extractHttpErrorText(error);
    const fkMessage = this.parseProyectoForeignKeyError(raw);
    if (fkMessage) {
      return fkMessage;
    }
    if (raw.trim()) {
      return this.truncateErrorText(raw.trim());
    }
    if (error.status === 0) {
      return 'No hay conexion con el servidor. Verifique la API.';
    }
    return `No fue posible ${accion} el proyecto (${error.status || 'error'}).`;
  }

  private buildCreateProyectoErrorMessage(error: HttpErrorResponse): string {
    return this.buildProyectoApiErrorMessage(error, 'crear');
  }

  private extractHttpErrorText(error: HttpErrorResponse): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (body && typeof body === 'object') {
      const msg =
        (body as { message?: string }).message
        ?? (body as { title?: string }).title
        ?? (body as { detail?: string }).detail;
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
      }
    }
    return error.message || '';
  }

  private parseProyectoForeignKeyError(text: string): string | null {
    const normalized = text.toLowerCase();
    if (normalized.includes('fk_proyecto_catalogo_faseinversion')) {
      return 'Fase de inversion: debe seleccionar un valor valido del catalogo (no se acepta id 0). Si el listado esta vacio, solicite al administrador cargar el catalogo en la API.';
    }
    if (normalized.includes('fk_proyecto_catalogo_tipoferta')) {
      return 'Tipo de oferta: debe seleccionar un valor valido del catalogo (no se acepta id 0). Si el listado esta vacio, solicite al administrador cargar el catalogo en la API.';
    }
    const fkMatch = text.match(/FOREIGN KEY constraint "([^"]+)"/i);
    if (fkMatch?.[1]) {
      return `Referencia de catalogo invalida (${fkMatch[1]}). Verifique los valores seleccionados en el formulario.`;
    }
    return null;
  }

  private truncateErrorText(text: string, maxLength = 320): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}…`;
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
