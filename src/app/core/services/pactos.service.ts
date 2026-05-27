import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Pacto } from '../../shared/models';

export interface PactoTablaDto {
  nombrePacto: string;
  fechaSubscripcion: string;
  fechaVencimiento: string;
  etapa: string;
  valorIndicativo: number;
  presupuestoComprometido: number;
  avanceComprometido: number;
  departamento: string;
  municipio: string;
  alcance?: string;
  tipoPacto: string;
  /** Integrantes del pacto (campo API `suscribientes`). */
  suscribientes?: string;
  objetivo?: string;
  urlDocPEI?: string;
  urlDocMinuta?: string;
  dataSource: 'api';
}

export interface PactoTablaFilters {
  etapa?: string;
  pacto?: string;
  departamento?: string;
}

/** Valores únicos presentes en el listado de pactos (servicio / cache) para armar filtros. */
export interface PactoTablaFilterOptions {
  etapas: string[];
  tiposPacto: string[];
  departamentos: string[];
}

type ApiPacto = Record<string, unknown>;

export interface PactoApiOption {
  id: number;
  /** Mismo valor que `id` del pacto territorial; se usa para filtrar proyectos. */
  idPactoTerritorial: number;
  nombre: string;
}

export interface CreatePactoResult {
  success: boolean;
  message?: string;
}

export interface CatalogoOption {
  id: number;
  idTipoCatalogo?: number;
  codigo: string;
  texto: string;
}

/**
 * Construye la URL **GET `/api/Catalogo/{IdTipoCatalogo}`** (segmento final = id entero).
 */
export function catalogoByTipoRoute(idTipoCatalogo: number): string {
  return `/api/Catalogo/${idTipoCatalogo}`;
}

/** IdTipoCatalogo = 2 — tipos de pacto. */
export const CATALOGO_TIPO_TIPO_PACTO = 2;
/** IdTipoCatalogo = 3 — etapas de pacto. */
export const CATALOGO_TIPO_ETAPA_PACTO = 3;
/** IdTipoCatalogo = 4 — instancias de sesión (compromisos). */
export const CATALOGO_TIPO_INSTANCIA_COMPROMISO_PACTO = 4;
/** IdTipoCatalogo = 5 — estado de compromiso de pacto (no estado de proyecto). */
export const CATALOGO_TIPO_ESTADO_COMPROMISO_PACTO = 5;

/** IdTipoCatalogo = 6 — área de influencia (proyecto). */
export const CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO = 6;
/** IdTipoCatalogo = 7 — estado de proyecto. */
export const CATALOGO_TIPO_ESTADO_PROYECTO = 7;
/** IdTipoCatalogo = 8 — condición de proyecto. */
export const CATALOGO_TIPO_CONDICION_PROYECTO = 8;
/** IdTipoCatalogo = 9 — sector de proyecto. */
export const CATALOGO_TIPO_SECTOR_PROYECTO = 9;
/** IdTipoCatalogo = 10 — aporte nación. */
export const CATALOGO_TIPO_APORTANTE_NACION_PROYECTO = 10;
/** IdTipoCatalogo = 11 — mecanismo de inclusión (confirmar en API si aplica). */
export const CATALOGO_TIPO_MECANISMO_INCLUSION_PROYECTO = 11;
/** IdTipoCatalogo = 12 — sector administración nacional (confirmar en API si aplica). */
export const CATALOGO_TIPO_SECTOR_ADMIN_NACIONAL_PROYECTO = 12;
/** IdTipoCatalogo = 13 — tipo de contrato (confirmar en API si aplica). */
export const CATALOGO_TIPO_TIPO_CONTRATO = 13;
/** IdTipoCatalogo = 14 — estado de contrato (confirmar en API si aplica). */
export const CATALOGO_TIPO_ESTADO_CONTRATO = 14;
/** IdTipoCatalogo = 15 — condición de contrato (confirmar en API si aplica). */
export const CATALOGO_TIPO_CONDICION_CONTRATO = 15;

export interface EntidadTerritorialOption {
  idEntidadTerritorial: string;
  nombreEntidadTerritorial: string;
  nombreDepartamento: string;
  idDepartamento?: string;
  displayName: string;
}

interface PactoCatalogosResult {
  tiposPacto: CatalogoOption[];
  etapas: CatalogoOption[];
}

interface ApiEntidadTerritorialMunicipio {
  idEntidadTerritorial?: unknown;
  nombreEntidadTerritorial?: unknown;
  tipologia?: unknown;
  orden?: unknown;
}

interface ApiEntidadTerritorialDepartamento {
  idDepartamento?: unknown;
  nombreDepartamento?: unknown;
  entidadesTerritoriales?: unknown;
}

export interface CreatePactoCommand {
  idTipoPacto: number;
  nombre: string;
  suscribientes: string;
  objetivo: string;
  lineasTematicas: string;
  fechaSubscripcion: string;
  fechaVencimiento: string;
  idEtapa: number;
  idAreasIntervencion: string[];
  urlPacto: string;
  urlMinuta: string;
}

export interface UpdatePactoCommand {
  id: number;
  idTipoPacto: number;
  nombre: string;
  suscribientes: string;
  objetivo: string;
  lineasTematicas: string;
  fechaSubscripcion: string;
  fechaVencimiento: string;
  idEtapa: number;
  idAreasIntervencion: string[];
  urlPacto: string;
  urlMinuta: string;
}

@Injectable({
  providedIn: 'root'
})
export class PactosService {
  private readonly storageKey = 'sispactos.pactos';
  private readonly pactosApiUrl = '/api/PactoTerritorial';

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

  constructor(private readonly http: HttpClient) {
    this.clearStoredCache();
    this.loadFromStorage();
  }

  // Entrega la lista de pactos para que los componentes la muestren.
  getPactos(): Observable<Pacto[]> {
    return this.pactos$;
  }

  // Consulta el listado de pactos desde endpoint transaccional.
  getPactosTablaFromApi(): Observable<PactoTablaDto[]> {
    return this.fetchPactosApiBundle().pipe(
      map(({ pactos, tiposPacto, entidadesTerritoriales }) => {
        const tiposPactoMap = this.buildCatalogMap(tiposPacto);
        return this.normalizeApiPactos(pactos).map((item) => this.mapToTabla(item, tiposPactoMap, entidadesTerritoriales));
      })
    );
  }

  /** Opciones mínimas (id + nombre) desde GET /api/PactoTerritorial. */
  getPactosOptionsFromApi(): Observable<PactoApiOption[]> {
    return this.http.get<unknown>(this.pactosApiUrl).pipe(
      map((response) => this.normalizeApiPactos(response)),
      map((rows) =>
        rows
          .map((item) => {
            const idPactoTerritorial = this.readNumber(
              item['idPactoTerritorial']
                ?? item['IdPactoTerritorial']
                ?? item['id']
                ?? item['Id']
            );
            return {
              id: idPactoTerritorial,
              idPactoTerritorial,
              nombre: (this.readString(item['nombre']) || '').trim()
            };
          })
          .filter((p) => p.idPactoTerritorial > 0 && !!p.nombre)
      ),
      map((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO', { sensitivity: 'base' }))),
      catchError(() => of([] as PactoApiOption[]))
    );
  }

  // Consulta el listado de pactos y aplica filtros funcionales para la vista Home.
  getPactosTablaFiltradosFromApi(filters: PactoTablaFilters): Observable<PactoTablaDto[]> {
    return this.getPactosTablaFromApi().pipe(
      map((rows) => rows.filter((item) => this.matchesTablaFilters(item, filters)))
    );
  }

  /** Etapas, tipos de pacto y departamentos distintos presentes en la respuesta de API. */
  getPactosTablaFilterOptionsFromApi(): Observable<PactoTablaFilterOptions> {
    return this.getPactosTablaFromApi().pipe(
      map((rows) => this.buildTablaFilterOptions(rows))
    );
  }

  // Carga catálogos desde la API (mismos endpoints que el listado de pactos).
  getPactoCatalogos(): Observable<PactoCatalogosResult> {
    return forkJoin({
      tiposPacto: this.getCatalogoByTipo(CATALOGO_TIPO_TIPO_PACTO).pipe(catchError(() => of([] as CatalogoOption[]))),
      etapas: this.getCatalogoByTipo(CATALOGO_TIPO_ETAPA_PACTO).pipe(catchError(() => of([] as CatalogoOption[])))
    });
  }

  // Consulta el catálogo de entidades territoriales y lo aplana para el formulario.
  getEntidadTerritorialCatalogo(): Observable<EntidadTerritorialOption[]> {
    return this.http.get<unknown>('/api/EntidadTerritorial').pipe(
      map((response) => this.normalizeEntidadTerritorialItems(response)),
      catchError(() => of([] as EntidadTerritorialOption[]))
    );
  }

  /**
   * **GET `/api/Catalogo/{IdTipoCatalogo}`** — lista ítems del catálogo (JSON en cuerpo, a menudo `Content-Type: text/plain`).
   */
  getCatalogoByTipo(idTipoCatalogo: number): Observable<CatalogoOption[]> {
    const url = `/api/Catalogo/${idTipoCatalogo}`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((raw) => this.normalizeCatalogoItems(this.parseCatalogoJsonPayload(raw))),
      catchError((err) => {
        console.error(`[API ERROR] GET ${url}`, err);
        return of([] as CatalogoOption[]);
      })
    );
  }

  // Agrega un pacto nuevo y le asigna un ID consecutivo.
  addPacto(pacto: Omit<Pacto, 'id'>): void {

    const currentPactos = this.pactos.value;
    const nextId = currentPactos.length ? Math.max(...currentPactos.map(p => p.id)) + 1 : 1;

    const newPacto: Pacto = this.sanitizePactoRecord({
      id: nextId,
      ...pacto
    });

    this.pactos.next([...currentPactos, newPacto]);
    this.saveToStorage();
  }

  // Crea un pacto en almacenamiento local.
  createPactoInApi(pacto: CreatePactoCommand): Observable<CreatePactoResult> {
    return this.http.post<unknown>(this.pactosApiUrl, pacto).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] POST /api/PactoTerritorial');
        console.log('request:', pacto);
        console.log('response:', response);
        console.groupEnd();
      }),
      map(() => ({ success: true })),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] POST /api/PactoTerritorial', error);
        return of({
          success: false,
          message: this.buildPactoMutationErrorMessage(error)
        });
      })
    );
  }

  // Actualiza un pacto territorial mediante la API.
  updatePactoInApi(pacto: UpdatePactoCommand): Observable<CreatePactoResult> {
    return this.http.put<unknown>(this.pactosApiUrl, pacto).pipe(
      tap((response) => {
        console.groupCollapsed('[API OK] PUT /api/PactoTerritorial');
        console.log('request:', pacto);
        console.log('response:', response);
        console.groupEnd();
      }),
      map(() => ({ success: true })),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] PUT /api/PactoTerritorial', error);
        return of({
          success: false,
          message: this.buildPactoMutationErrorMessage(error)
        });
      })
    );
  }

  // Sincroniza el listado de administración desde el mismo servicio GET que la vista territorial.
  syncPactosFromApi(): Observable<Pacto[]> {
    return this.fetchPactosApiBundle().pipe(
      map(({ pactos, tiposPacto, entidadesTerritoriales }) => {
        const tiposPactoMap = this.buildCatalogMap(tiposPacto);
        const etapasMap = new Map<number, string>();
        const list = this.normalizeApiPactos(pactos).map((item) =>
          this.mapToAdminPacto(item, tiposPactoMap, etapasMap, entidadesTerritoriales)
        );
        this.pactos.next(list);
        return list;
      })
    );
  }

  // Elimina un pacto por su ID.
  removePacto(id: number): void {
    this.pactos.next(this.pactos.value.filter(p => p.id !== id));
    this.saveToStorage();
  }

  // Actualiza parcialmente la información de un pacto existente.
  updatePacto(id: number, pacto: Partial<Omit<Pacto, 'id'>>): void {
    const pactos = this.pactos.value.map(p =>
      p.id === id ? this.sanitizePactoRecord({ ...p, ...pacto }) : p
    );
    this.pactos.next(pactos);
    this.saveToStorage();
  }

  // Suma el valor estimado de todos los pactos registrados.
  getTotalValorEstimado(): number {
    return this.pactos.value.reduce((sum, pacto) => sum + (pacto.valorEstimado || 0), 0);
  }

  private loadFromStorage(): void {
    this.pactos.next([]);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.pactos.value));
  }

  private clearStoredCache(): void {
    localStorage.removeItem(this.storageKey);
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

  private sanitizePactoRecord(record: Pacto): Pacto {
    const sanitized = this.sanitizeRecord(record) as Partial<Pacto>;

    return {
      ...sanitized,
      lineasTematicas: Array.isArray(sanitized.lineasTematicas) ? sanitized.lineasTematicas : []
    } as Pacto;
  }

  private normalizeApiPactos(response: unknown): ApiPacto[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is ApiPacto => !!item && typeof item === 'object');
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as Record<string, unknown>;
    const candidates = [payload['items'], payload['data'], payload['result'], payload['value']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is ApiPacto => !!item && typeof item === 'object');
      }
    }

    return [payload];
  }

  private mapToTabla(
    item: ApiPacto,
    tiposPactoMap: Map<number, string>,
    entidadesTerritoriales: EntidadTerritorialOption[]
  ): PactoTablaDto {
    const fechaBase = this.readString(item['fechaSubscripcion'])
      || this.readString(item['fechaCreacion'])
      || '';
    const idTipoPacto = this.readOptionalNumber(item['idTipoPacto']);
    const tipoPactoTexto = this.readString(item['tipoPacto']) || this.readString(item['tipo']);
    const tipoPacto = this.resolveCatalogValue(tipoPactoTexto, idTipoPacto, tiposPactoMap, 'No definido');
    const idsAreasIntervencion = this.mapAreasIntervencionIds(item['idAreasIntervencion'] ?? item['areasIntervencion']);
    const ubicacion = this.resolveUbicacionFromAreasIntervencion(idsAreasIntervencion, entidadesTerritoriales);

    return {
      nombrePacto: this.readString(item['nombre']) || this.readString(item['nombrePacto']) || 'Sin nombre',
      fechaSubscripcion: this.formatDate(fechaBase),
      fechaVencimiento: this.formatDate(this.readString(item['fechaVencimiento'])),
      etapa: this.readString(item['etapa']) || 'Sin etapa',
      valorIndicativo: this.readNumber(item['valorIndicativo']),
      presupuestoComprometido: this.readNumber(item['presupuestoComprometido']),
      avanceComprometido: this.readNumber(item['avanceComprometido']),
      departamento: this.readString(item['departamento']) || ubicacion.departamento || 'N/A',
      municipio: this.readString(item['municipio']) || ubicacion.municipio || '',
      alcance: this.buildAlcanceSummary(idsAreasIntervencion, entidadesTerritoriales),
      tipoPacto,
      suscribientes: this.readString(item['suscribientes']),
      objetivo: this.readString(item['objetivo']),
      urlDocPEI:
        this.readString(item['urlDocPEI'])
        || this.readString(item['urlPei'])
        || this.readString(item['urlPEI'])
        || this.readString(item['urlPacto']),
      urlDocMinuta: this.readString(item['urlMinuta']),
      dataSource: 'api'
    };
  }

  private mapToAdminPacto(
    item: ApiPacto,
    tiposPactoMap: Map<number, string>,
    etapasMap: Map<number, string>,
    entidadesTerritoriales: EntidadTerritorialOption[]
  ): Pacto {
    const nombre = this.readString(item['nombre']) || this.readString(item['nombrePacto']) || 'Sin nombre';
    const fechaCreacion = this.readString(item['fechaCreacion']) || new Date().toISOString();
    const idTipoPacto = this.readOptionalNumber(item['idTipoPacto']);
    const idEtapa = this.readOptionalNumber(item['idEtapa']);
    const tipoPacto = this.resolveCatalogValue(
      this.readString(item['tipoPacto']) || this.readString(item['tipo']),
      idTipoPacto,
      tiposPactoMap,
      'No definido'
    );
    const etapa = this.resolveCatalogValue(
      this.readString(item['etapa']),
      idEtapa,
      etapasMap,
      ''
    );

    const valorIndicativo = this.readNumber(item['valorIndicativo']);

    const ubicacion = this.resolveUbicacionFromAreasIntervencion(
      this.mapAreasIntervencionIds(item['idAreasIntervencion'] ?? item['areasIntervencion']),
      entidadesTerritoriales
    );

    return this.sanitizePactoRecord({
      id: this.readNumber(item['id']),
      idTipoPacto,
      tipoPacto,
      nombre,
      descripcion: this.readString(item['suscribientes']) || this.readString(item['descripcion']) || '',
      objetivo: this.readString(item['objetivo']) || '',
      lineasTematicas: this.readLineasTematicas(item['lineasTematicas']),
      fechaSuscripcion: this.formatDate(this.readString(item['fechaSubscripcion'])),
      fechaVencimiento: this.formatDate(this.readString(item['fechaVencimiento'])),
      idEtapa: etapa || this.readString(item['idEtapa']) || '',
      idAreasIntervencion: this.mapAreasIntervencionIds(item['idAreasIntervencion'] ?? item['areasIntervencion']),
      alcance: this.readAreasIntervencion(item['areasIntervencion'] ?? item['idAreasIntervencion']),
      departamento: ubicacion.departamento,
      municipio: ubicacion.municipio,
      valorEstimado: valorIndicativo > 0 ? valorIndicativo : undefined,
      urlDocPacto: this.readString(item['urlPacto']),
      urlDocMinuta: this.readString(item['urlMinuta']),
      urlDocPEI:
        this.readString(item['urlDocPEI'])
        || this.readString(item['urlPei'])
        || this.readString(item['urlPEI'])
        || this.readString(item['urlPacto']),
      usuarioCreo: this.readString(item['usuarioCreacion']),
      fechaCreacion,
      usuarioModifico: this.readString(item['usuarioModificacion']),
      fechaModificacion: this.readString(item['fechaModificacion']) || fechaCreacion
    });
  }

  private fetchPactosApiBundle(): Observable<{ pactos: unknown; tiposPacto: CatalogoOption[]; entidadesTerritoriales: EntidadTerritorialOption[] }> {
    return forkJoin({
      pactos: this.http.get<unknown>(this.pactosApiUrl).pipe(
        tap((response) => {
          console.groupCollapsed('[API OK] GET /api/PactoTerritorial');
          console.log('response:', response);
          console.groupEnd();
        }),
        catchError((error) => {
          console.error('[API ERROR] GET /api/PactoTerritorial', error);
          throw error;
        })
      ),
      tiposPacto: this.getCatalogoByTipo(CATALOGO_TIPO_TIPO_PACTO).pipe(
        tap((items) => {
          const url = catalogoByTipoRoute(CATALOGO_TIPO_TIPO_PACTO);
          console.groupCollapsed(`[API OK] GET ${url}`);
          console.log('items:', items);
          console.groupEnd();
        }),
        catchError((error) => {
          console.error(`[API ERROR] GET ${catalogoByTipoRoute(CATALOGO_TIPO_TIPO_PACTO)}`, error);
          return of([] as CatalogoOption[]);
        })
      ),
      entidadesTerritoriales: this.http.get<unknown>('/api/EntidadTerritorial').pipe(
        map((response) => this.normalizeEntidadTerritorialItems(response)),
        catchError(() => of([] as EntidadTerritorialOption[]))
      )
    });
  }

  private mapStoredPactoToTabla(item: Pacto): PactoTablaDto {
    return {
      nombrePacto: (item.nombre || '').trim() || 'Sin nombre',
      fechaSubscripcion: this.formatDate(item.fechaSuscripcion || item.fechaCreacion || ''),
      fechaVencimiento: this.formatDate(item.fechaVencimiento || ''),
      etapa: (item.idEtapa || '').trim() || 'Sin etapa',
      valorIndicativo: item.valorEstimado || 0,
      presupuestoComprometido: 0,
      avanceComprometido: 0,
      departamento: this.extractDepartamentoFromAlcance(item.alcance),
      municipio: (item.municipio || '').trim(),
      alcance: (item.alcance || '').trim(),
      tipoPacto: (item.tipoPacto || '').trim() || 'No definido',
      suscribientes: (item.descripcion || '').trim(),
      objetivo: (item.objetivo || '').trim(),
      urlDocPEI: (item.urlDocPEI || '').trim(),
      urlDocMinuta: (item.urlDocMinuta || '').trim(),
      dataSource: 'api'
    };
  }

  private mapToCreateCommand(pacto: Omit<Pacto, 'id'>): CreatePactoCommand {
    const idAreasIntervencion = pacto.idAreasIntervencion?.length
      ? pacto.idAreasIntervencion
      : this.mapAreasIntervencion(pacto.alcance);

    return {
      idTipoPacto: this.mapTipoPactoToId(pacto.tipoPacto),
      nombre: (pacto.nombre || '').trim(),
      suscribientes: (pacto.descripcion || '').trim(),
      objetivo: (pacto.objetivo || '').trim(),
      lineasTematicas: pacto.lineasTematicas.join(', ').trim(),
      fechaSubscripcion: this.toIsoDate(pacto.fechaSuscripcion),
      fechaVencimiento: this.toIsoDate(pacto.fechaVencimiento),
      idEtapa: this.mapEtapaToId(pacto.idEtapa),
      idAreasIntervencion,
      urlPacto: (pacto.urlDocPacto || '').trim(),
      urlMinuta: (pacto.urlDocMinuta || '').trim()
    };
  }

  private mapCreateCommandToStoredPacto(pacto: CreatePactoCommand): Omit<Pacto, 'id'> {
    return {
      idTipoPacto: pacto.idTipoPacto,
      tipoPacto: this.resolveTipoPactoLabel(pacto.idTipoPacto),
      nombre: pacto.nombre,
      descripcion: pacto.suscribientes,
      objetivo: pacto.objetivo,
      lineasTematicas: this.readLineasTematicas(pacto.lineasTematicas),
      fechaSuscripcion: this.formatDate(pacto.fechaSubscripcion),
      fechaVencimiento: this.formatDate(pacto.fechaVencimiento),
      idEtapa: this.resolveEtapaLabel(pacto.idEtapa),
      idAreasIntervencion: [...pacto.idAreasIntervencion],
      alcance: this.mapAreasIntervencionLabel(pacto.idAreasIntervencion),
      urlDocPacto: pacto.urlPacto,
      urlDocMinuta: pacto.urlMinuta,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };
  }

  private buildTablaFilterOptions(rows: PactoTablaDto[]): PactoTablaFilterOptions {
    return {
      etapas: this.uniqueSortedFieldValues(rows.map((r) => r.etapa)),
      tiposPacto: this.uniqueSortedFieldValues(rows.map((r) => r.tipoPacto)),
      departamentos: this.uniqueSortedFieldValues(rows.map((r) => r.departamento))
    };
  }

  private uniqueSortedFieldValues(values: string[]): string[] {
    const normalized = values
      .map((v) => (v || '').trim())
      .filter((v) => v.length > 0);

    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => a.localeCompare(b, 'es-CO', { sensitivity: 'base' }));
    return unique;
  }

  private matchesTablaFilters(item: PactoTablaDto, filters: PactoTablaFilters): boolean {
    const etapa = (filters.etapa || '').trim();
    const pacto = (filters.pacto || '').trim();
    const departamento = (filters.departamento || '').trim();

    const byEtapa = !etapa || item.etapa === etapa;
    const byPacto = !pacto || item.tipoPacto === pacto;
    const byDepartamento = !departamento || item.departamento === departamento;

    return byEtapa && byPacto && byDepartamento;
  }

  private extractDepartamentoFromAlcance(alcance?: string): string {
    const safeAlcance = (alcance || '').trim();

    if (!safeAlcance) {
      return 'N/A';
    }

    const departamentos: string[] = [];

    for (const segment of safeAlcance.split('|')) {
      const part = segment.trim();
      const lower = part.toLowerCase();

      if (lower.startsWith('departamentos de intervencion') || lower.startsWith('municipios de intervencion') || lower.startsWith('detalle:')) {
        continue;
      }

      const departamento = this.extractDepartamentoFromSegment(part);
      if (departamento) {
        departamentos.push(departamento);
      }
    }

    if (!departamentos.length) {
      return 'N/A';
    }

    const unique = [...new Set(departamentos)];
    return unique.join(', ');
  }

  private extractDepartamentoFromSegment(segment: string): string {
    const lower = segment.toLowerCase();

    if (lower.startsWith('departamento:')) {
      return segment.slice(segment.indexOf(':') + 1).trim();
    }

    if (lower.startsWith('municipio:')) {
      const afterMarker = segment.slice(segment.indexOf(':') + 1).trim();
      return afterMarker.split('-')[0]?.trim() ?? '';
    }

    return '';
  }

  private mapTipoPactoToId(tipoPacto: string | undefined): number {
    const explicitId = this.readPositiveInt(tipoPacto);
    if (explicitId > 0) {
      return explicitId;
    }

    const safeTipo = (tipoPacto || '').trim().toLowerCase();

    if (safeTipo.includes('territorio')) {
      return 1;
    }

    if (safeTipo.includes('nacion') || safeTipo.includes('nación')) {
      return 2;
    }

    return 0;
  }

  private mapEtapaToId(etapa: string | undefined): number {
    const explicitId = this.readPositiveInt(etapa);
    if (explicitId > 0) {
      return explicitId;
    }

    const safeEtapa = (etapa || '').trim().toLowerCase();

    if (safeEtapa.includes('construccion') || safeEtapa.includes('construcción')) {
      return 1;
    }

    if (safeEtapa.includes('implementacion') || safeEtapa.includes('implementación')) {
      return 2;
    }

    if (safeEtapa.includes('cierre')) {
      return 3;
    }

    return 0;
  }

  private toIsoDate(value: string | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString();
  }

  private mapAreasIntervencion(value: string | undefined): string[] {
    const safeValue = (value || '').trim();
    return safeValue ? [safeValue] : [];
  }

  private mapAreasIntervencionIds(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.readString(item)).filter(Boolean);
    }

    const singleValue = this.readString(value);
    return singleValue ? [singleValue] : [];
  }

  private mapAreasIntervencionLabel(ids: string[]): string {
    return ids.join(', ');
  }

  private resolveUbicacionFromAreasIntervencion(
    ids: string[],
    entidadesTerritoriales: EntidadTerritorialOption[]
  ): { departamento: string; municipio: string } {
    for (const id of ids) {
      const municipio = entidadesTerritoriales.find((item) => item.idEntidadTerritorial === id);
      if (municipio) {
        return {
          departamento: municipio.nombreDepartamento || 'N/A',
          municipio: municipio.nombreEntidadTerritorial || ''
        };
      }
    }

    for (const id of ids) {
      const departamento = entidadesTerritoriales.find((item) => item.idDepartamento === id);
      if (departamento) {
        return {
          departamento: departamento.nombreDepartamento || 'N/A',
          municipio: ''
        };
      }
    }

    return { departamento: 'N/A', municipio: '' };
  }

  private buildAlcanceSummary(ids: string[], entidadesTerritoriales: EntidadTerritorialOption[]): string {
    const departamentos = new Set<string>();
    const municipios = new Set<string>();

    for (const id of ids) {
      const municipio = entidadesTerritoriales.find((item) => item.idEntidadTerritorial === id);
      if (municipio) {
        municipios.add(municipio.nombreEntidadTerritorial);
        if (municipio.nombreDepartamento) {
          departamentos.add(municipio.nombreDepartamento);
        }
        continue;
      }

      const departamento = entidadesTerritoriales.find((item) => item.idDepartamento === id);
      if (departamento?.nombreDepartamento) {
        departamentos.add(departamento.nombreDepartamento);
      }
    }

    const parts: string[] = [];
    if (municipios.size) {
      parts.push(`Municipios: ${[...municipios].join(', ')}`);
    }
    if (departamentos.size) {
      parts.push(`Departamentos: ${[...departamentos].join(', ')}`);
    }

    return parts.join(' | ');
  }

  private resolveTipoPactoLabel(idTipoPacto: number): string {
    if (idTipoPacto === 1) {
      return 'Territorio';
    }

    if (idTipoPacto === 2) {
      return 'Nación';
    }

    return 'No definido';
  }

  private resolveEtapaLabel(idEtapa: number): string {
    if (idEtapa === 1) {
      return 'Construcción y suscripción';
    }

    if (idEtapa === 2) {
      return 'Implementación';
    }

    if (idEtapa === 3) {
      return 'Cierre';
    }

    return 'Sin etapa';
  }

  private buildCreatePactoErrorMessage(error: HttpErrorResponse): string {
    return this.buildPactoMutationErrorMessage(error);
  }

  private buildPactoMutationErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'La sesión no está autorizada para modificar pactos. Inicie sesión nuevamente.';
    }

    if (error.status === 0) {
      return 'No fue posible conectar con el servicio de pactos.';
    }

    const apiMessage = this.extractApiErrorMessage(error.error);
    if (apiMessage) {
      if (apiMessage.includes('FK_PactoTerritorial_Catalogo_TipoPacto')) {
        return 'El tipo de pacto enviado no existe en el catálogo del backend. Recargue la página y seleccione un tipo válido.';
      }

      if (apiMessage.includes('FK_PactoTerritorial_Catalogo_Etapa')) {
        return 'La etapa enviada no existe en el catálogo del backend. Recargue la página y seleccione una etapa válida.';
      }

      return apiMessage;
    }

    if (error.status === 400) {
      return 'La API rechazó los datos enviados del pacto. Revise los campos obligatorios.';
    }

    return 'No fue posible guardar el pacto en el servidor.';
  }

  private extractApiErrorMessage(errorBody: unknown): string {
    if (!errorBody) {
      return '';
    }

    if (typeof errorBody === 'string') {
      return errorBody.trim();
    }

    if (typeof errorBody !== 'object') {
      return '';
    }

    const payload = errorBody as Record<string, unknown>;
    const directMessage = this.readString(payload['message'])
      || this.readString(payload['title'])
      || this.readString(payload['detail'])
      || this.readString(payload['error']);

    if (directMessage) {
      return directMessage;
    }

    const errors = payload['errors'];

    if (!errors || typeof errors !== 'object') {
      return '';
    }

    const messages = Object.values(errors as Record<string, unknown>)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => this.readString(value))
      .filter(Boolean);

    return messages.join(' ');
  }

  private parseCatalogoJsonPayload(raw: string | null): unknown {
    if (raw == null) {
      return [];
    }
    const trimmed = raw.replace(/^\uFEFF/, '').trim();
    if (!trimmed) {
      return [];
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      console.warn('[SISPACTOS] Catálogo: cuerpo no es JSON válido.', trimmed.slice(0, 200));
      return [];
    }
  }

  private unwrapCatalogoArray(payload: unknown): unknown[] | null {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && typeof payload === 'object') {
      const o = payload as Record<string, unknown>;
      for (const key of ['data', 'items', 'result', 'value', 'datos', 'DATOS']) {
        const inner = o[key];
        if (Array.isArray(inner)) {
          return inner;
        }
      }
    }
    return null;
  }

  private normalizeCatalogoItems(response: unknown): CatalogoOption[] {
    const list = typeof response === 'string' ? this.unwrapCatalogoArray(this.parseCatalogoJsonPayload(response)) : this.unwrapCatalogoArray(response);
    if (!list) {
      return [];
    }

    const out: CatalogoOption[] = [];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const item = raw as Record<string, unknown>;
      const id = this.readNumber(item['id'] ?? item['Id'] ?? item['ID'] ?? item['idCatalogo'] ?? item['IdCatalogo']);
      const codigo = this.readString(item['codigo'] ?? item['Codigo'] ?? item['codigoCatalogo'] ?? item['CodigoCatalogo']);
      const texto = this.readString(
        item['texto']
          ?? item['Texto']
          ?? item['nombre']
          ?? item['Nombre']
          ?? item['descripcion']
          ?? item['Descripcion']
      );
      const label = texto || codigo;
      if (id <= 0 || !label) {
        continue;
      }
      out.push({
        id,
        idTipoCatalogo: this.readOptionalNumber(item['idTipoCatalogo'] ?? item['IdTipoCatalogo']),
        codigo: codigo || String(id),
        texto: label
      });
    }
    return out;
  }

  private normalizeEntidadTerritorialItems(response: unknown): EntidadTerritorialOption[] {
    if (!Array.isArray(response)) {
      return [];
    }

    const items: EntidadTerritorialOption[] = [];

    for (const departamento of response) {
      if (!departamento || typeof departamento !== 'object') {
        continue;
      }

      const payload = departamento as ApiEntidadTerritorialDepartamento;
      const nombreDepartamento = this.readString(payload.nombreDepartamento);
      const entidadesTerritoriales = Array.isArray(payload.entidadesTerritoriales)
        ? payload.entidadesTerritoriales
        : [];

      for (const entidad of entidadesTerritoriales) {
        if (!entidad || typeof entidad !== 'object') {
          continue;
        }

        const municipio = entidad as ApiEntidadTerritorialMunicipio;
        const idEntidadTerritorial = this.readString(municipio.idEntidadTerritorial);
        const nombreEntidadTerritorial = this.readString(municipio.nombreEntidadTerritorial);
      const idDepartamento = this.readString(payload.idDepartamento);

        if (!idEntidadTerritorial || !nombreEntidadTerritorial) {
          continue;
        }

        items.push({
          idEntidadTerritorial,
          nombreEntidadTerritorial,
          nombreDepartamento,
        idDepartamento,
          displayName: nombreDepartamento
            ? `${nombreEntidadTerritorial} (${nombreDepartamento})`
            : nombreEntidadTerritorial
        });
      }
    }

    items.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es-CO', { sensitivity: 'base' }));
    return items;
  }

  private buildCatalogMap(items: CatalogoOption[]): Map<number, string> {
    return new Map(items.map((item) => [item.id, item.texto]));
  }

  private resolveCatalogValue(
    explicitValue: string,
    idValue: number | undefined,
    catalogMap: Map<number, string>,
    fallback: string
  ): string {
    if (explicitValue) {
      return explicitValue;
    }

    if (idValue && catalogMap.has(idValue)) {
      return catalogMap.get(idValue) || fallback;
    }

    return fallback;
  }

  private resolveCatalogOptions(
    catalogs: Array<{ catalogTypeId: number; items: CatalogoOption[] }>,
    keywords: string[]
  ): CatalogoOption[] {
    let bestMatch: CatalogoOption[] = [];
    let bestScore = 0;

    for (const catalog of catalogs) {
      if (!catalog.items.length) {
        continue;
      }

      const score = this.scoreCatalogMatch(catalog.items, keywords);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = catalog.items;
      }
    }

    return bestMatch;
  }

  private scoreCatalogMatch(items: CatalogoOption[], keywords: string[]): number {
    const normalizedValues = items.map((item) => this.normalizeText(`${item.codigo} ${item.texto}`));

    return keywords.reduce((score, keyword) => {
      return score + (normalizedValues.some((value) => value.includes(keyword)) ? 1 : 0);
    }, 0);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private readPositiveInt(value: unknown): number {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value !== 'string') {
      return 0;
    }

    const trimmedValue = value.trim();

    if (!/^\d+$/.test(trimmedValue)) {
      return 0;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0;
  }

  private readOptionalNumber(value: unknown): number | undefined {
    const parsedValue = this.readNumber(value);
    return parsedValue > 0 ? parsedValue : undefined;
  }

  private readLineasTematicas(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.readString(item)).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  private readAreasIntervencion(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.readString(item)).filter(Boolean).join(', ');
    }

    return this.readString(value);
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private formatDate(value: string): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }
}
