import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Proyecto, ProyectoImagenApi, ProyectoImagenRegistrada, ProyectoMultimediaMetadato } from '../../shared/models';
import { parseCamposDesdeAlcanceApi } from '../utils/proyecto-alcance-fields.util';

const PROYECTO_API_URL = '/api/Proyecto';
/** Cuerpo POST `/api/Proyecto` (contrato OpenAPI). */
export type CreateProyectoCommand = {
  idPactoTerritorial: number;
  idEntidadProyecto: string;
  bpin: string;
  /** Nombre de proyecto BPIN en MGA. */
  nombreProyectoBpin: string;
  codigo: string;
  /** Nombre iniciativa. */
  nombreIniciativa: string;
  fechaActaCD: string;
  actaCD: string;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idAreaInfluencia: number | null;
  idEstadoProyecto: number;
  idCondicionProyecto: number;
  idSector: number;
  lineasTematicas: string;
  fechaInicio: string;
  fechaFin: string;
  plazoEstimadoEjecucion: string;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idFaseInversion?: number | null;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idAportanteNacion: number | null;
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
  productoPrincipalMGA: string;
  cantidadMeta: number;
  unidadMedidaMeta: string;
  /** Sesion CD inclusion PEI (#); enviar `null` si no aplica. */
  sesionCDInclusion: number | null;
  /** Id de ítem en `Catalogo`; enviar `null` si no aplica (no usar 0). */
  idSectorAdministracionNacional: number | null;
  fechaReporte: string;
  numeroEmpleosDirectos: number;
  numeroEmpleosIndirectos: number;
  consecutivoConpes: string;
  tieneViabilidad: boolean;
  fechaViabilidad: string;
  numeroContratoEspecifico: string;
  latitudProyecto: string;
  longitudProyecto: string;
  imagenes: ProyectoImagenApi[];
};

export type ProyectoImagenApiCommand = ProyectoImagenApi;

/** Metadatos + archivo local para POST/PUT (JSON o multipart según haya archivos nuevos). */
export interface ProyectoImagenUpload {
  idArchivo?: string | null;
  descripcionImagen: string;
  fechaImagen: string;
  file?: File | null;
  /** Contenido previo de la API (GET); solo metadatos si no hay file nuevo. */
  archivoImagenApi?: string | null;
}

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
  httpStatus?: number;
}

/** Opción mínima desde GET `/api/Proyecto`. */
export interface ProyectoApiOption {
  id: number;
  nombreIniciativa: string;
  idPactoTerritorial: number;
}

type ApiProyectoCreateResponse = {
  id?: unknown;
  nombre?: unknown;
  nombreIniciativa?: unknown;
};

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  // Cache en memoria de la última consulta GET `/api/Proyecto`.
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

  constructor(private readonly http: HttpClient) {}

  /** Lista en memoria (se alimenta con {@link refreshProyectosFromApi}). */
  getProyectos(): Observable<Proyecto[]> {
    return this.proyectos$;
  }

  getProyectosSnapshot(): Proyecto[] {
    return this.proyectos.value;
  }

  /** Actualiza la lista en memoria (p. ej. tras enriquecer etiquetas de catálogo). */
  publishProyectosSnapshot(proyectos: Proyecto[]): void {
    this.proyectos.next(proyectos);
  }

  /** GET `/api/Proyecto` — recarga tabla y BehaviorSubject desde BD. */
  refreshProyectosFromApi(): Observable<Proyecto[]> {
    return this.fetchProyectosApiRaw$().pipe(
      map((list) => {
        const proyectos = list
          .map((row) => this.mapApiRowToProyecto(row))
          .filter((p) => p.apiId != null && p.apiId >= 1)
          .sort((a, b) =>
            a.nombreIniciativa.localeCompare(b.nombreIniciativa, 'es-CO', { sensitivity: 'base' })
          );
        this.proyectos.next(proyectos);
        return proyectos;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] GET /api/Proyecto', error);
        this.proyectos.next([]);
        return of([] as Proyecto[]);
      })
    );
  }

  /** GET `/api/Proyecto` — listado mínimo para selects (p. ej. contratos). */
  getProyectosFromApi(): Observable<ProyectoApiOption[]> {
    return this.fetchProyectosApiRaw$().pipe(
      map((list) => this.normalizeProyectosApiList(list)),
      map((rows) =>
        rows
          .filter((p) => p.id > 0 && !!p.nombreIniciativa && p.idPactoTerritorial > 0)
          .sort((a, b) =>
            a.nombreIniciativa.localeCompare(b.nombreIniciativa, 'es-CO', { sensitivity: 'base' })
          )
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('[API ERROR] GET /api/Proyecto', error);
        return of([] as ProyectoApiOption[]);
      })
    );
  }

  private fetchProyectosApiRaw$(): Observable<Record<string, unknown>[]> {
    return this.http.get(PROYECTO_API_URL, { responseType: 'text' }).pipe(
      map((raw) => {
        const parsed = this.parseJsonPayload(raw);
        const list = this.unwrapApiArray(parsed);
        if (!list) {
          return [];
        }
        return list.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      })
    );
  }

  /** Proyectos con `idPactoTerritorial` igual al pacto seleccionado (GET `/api/Proyecto`). */
  getProyectosByPactoTerritorial(idPactoTerritorial: number): Observable<ProyectoApiOption[]> {
    if (!Number.isFinite(idPactoTerritorial) || idPactoTerritorial < 1) {
      return of([]);
    }
    return this.getProyectosFromApi().pipe(
      map((rows) =>
        rows.filter((p) => this.mismoIdNumerico(p.idPactoTerritorial, idPactoTerritorial))
      )
    );
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

  /**
   * POST `/api/Proyecto` — alta de un registro nuevo.
   * El cuerpo no debe incluir `id`; la API asigna la PK (identity) y responde `{ id, nombre }`.
   */
  createProyecto(
    command: CreateProyectoCommand,
    imagenes: ProyectoImagenUpload[] = []
  ): Observable<ProyectoApiResult> {
    const payload = this.buildPostProyectoPayload({ ...command, imagenes: [] });
    return this.sendProyectoMutation('POST', payload, imagenes, false);
  }

  /** PUT `/api/Proyecto` — actualiza un proyecto existente. */
  updateProyectoInApi(
    command: UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[] = []
  ): Observable<ProyectoApiResult> {
    const payload = this.sanitizeCreateProyectoPayload({ ...command, imagenes: [] }, true) as UpdateProyectoCommand;
    return this.sendProyectoMutation('PUT', payload, imagenes, true);
  }

  /**
   * POST/PUT — sin archivos nuevos: JSON directo.
   * Con archivos nuevos: multipart con campo `command` (JSON) + `imagenes[i].archivoImagen` (IFormFile).
   */
  private sendProyectoMutation(
    method: 'POST' | 'PUT',
    payload: CreateProyectoCommand | UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[],
    isUpdate: boolean
  ): Observable<ProyectoApiResult> {
    const jsonPayload = this.buildProyectoJsonBody(payload, imagenes, isUpdate);
    const hasNewFiles = imagenes.some((img) => !!img.file && img.file.size > 0);
    const body = hasNewFiles
      ? this.buildProyectoMultipartWithCommand(jsonPayload, imagenes)
      : jsonPayload;
    const contentType = hasNewFiles ? 'multipart/form-data' : 'application/json';

    this.logProyectoEnvioConsola(method, contentType, jsonPayload, imagenes, hasNewFiles);

    const request$ =
      method === 'POST'
        ? this.http.post(PROYECTO_API_URL, body, { responseType: 'text' })
        : this.http.put(PROYECTO_API_URL, body, { responseType: 'text' });

    return request$.pipe(
      tap((raw) => {
        console.groupCollapsed(`[API OK] ${method} /api/Proyecto`);
        console.log('method:', method);
        console.log('contentType:', contentType);
        console.log('imagenes:', imagenes.length);
        console.log('response:', raw);
        console.groupEnd();
      }),
      map((raw) => this.mapCreateProyectoResponse(raw)),
      catchError((error: HttpErrorResponse) => {
        const errText = this.extractHttpErrorText(error);
        console.error(`[API ERROR] ${method} /api/Proyecto`, error.status, errText || error.message);
        return of({
          success: false,
          message: this.buildProyectoApiErrorMessage(error, method === 'POST' ? 'crear' : 'actualizar'),
          httpStatus: error.status
        } as ProyectoApiResult);
      })
    );
  }

  private mapCreateProyectoResponse(raw: string): ProyectoApiResult {
    const text = (raw ?? '').trim();
    if (!text) {
      return {
        success: false,
        message: 'La API respondio vacio. El proyecto puede no haberse guardado en la base de datos.'
      };
    }

    const lower = text.toLowerCase();
    if (
      lower.includes('exception')
      || lower.includes('duplicate key')
      || lower.includes('pk_proyecto')
      || lower.includes('sqlexception')
      || (lower.includes('error') && !lower.includes('"id"'))
    ) {
      const parsedError = this.parseProyectoForeignKeyError(text);
      return {
        success: false,
        message: parsedError || this.truncateErrorText(text)
      };
    }

    const parsed = this.parseJsonPayload(text);
    const row = (parsed && typeof parsed === 'object' ? parsed : {}) as ApiProyectoCreateResponse;
    const id = typeof row.id === 'number' ? row.id : Number(row.id);
    const nombre =
      typeof row.nombreIniciativa === 'string'
        ? row.nombreIniciativa
        : typeof row.nombre === 'string'
          ? row.nombre
          : '';

    if (!Number.isFinite(id) || id < 1) {
      return {
        success: false,
        message:
          'La API no devolvio un id de proyecto valido. Revise en Red (F12) que la peticion sea POST y que el servidor confirme el alta.'
      };
    }

    return {
      success: true,
      id,
      nombre: nombre.trim() || undefined
    };
  }

  /** Convierte detalle API a modelo de vista (financiera, etc.). */
  mapDetalleToProyecto(detalle: ProyectoDetalleApi): Proyecto | null {
    const apiId = detalle.id;
    if (apiId == null || apiId < 1) {
      return null;
    }
    const multimedia = this.mapImagenesApiToProyecto(detalle.imagenes);
    const presupuesto =
      (detalle.presupuestoDnp ?? 0) +
      (detalle.presupuestoSector ?? 0) +
      (detalle.presuspuestoTerritorio ?? 0) +
      (detalle.presupuestoOtros ?? 0);
    const desdeAlcance = parseCamposDesdeAlcanceApi(detalle.alcance);
    return {
      id: apiId,
      apiId,
      idPactoTerritorial: detalle.idPactoTerritorial,
      idEstadoProyecto: detalle.idEstadoProyecto,
      idCondicionProyecto: detalle.idCondicionProyecto,
      idSectorCatalogo: detalle.idSector,
      idEntidadProyecto: detalle.idEntidadProyecto,
      nombreIniciativa: this.readNombreIniciativaFromDetalle(detalle) || 'Sin nombre',
      nombreProyectoBpin: this.readNombreProyectoBpinFromDetalle(detalle) || undefined,
      descripcion: desdeAlcance.alcanceLimpio || (detalle.alcance ?? '').trim(),
      codigo: (detalle.codigo ?? String(apiId)).trim() || String(apiId),
      productoPrincipalMGA:
        this.readProductoPrincipalMgaFromDetalle(detalle, desdeAlcance.productoPrincipalMga),
      cantidadMeta: detalle.cantidadMeta ?? desdeAlcance.cantidadMeta ?? undefined,
      unidadMedidaMeta: detalle.unidadMedidaMeta?.trim() || desdeAlcance.unidadMedidaMeta || undefined,
      lineaTematica: detalle.lineasTematicas,
      sesionCDInclusion: detalle.sesionCDInclusion ?? desdeAlcance.sesionCdPei ?? undefined,
      bpin: detalle.bpin,
      pactoAsociado: '',
      sector: '',
      estado: '',
      municipioEntidadNombre: (detalle.entidadResponsablePI ?? '').trim() || undefined,
      responsable: (detalle.entidadResponsablePI ?? '').trim() || undefined,
      presupuesto: presupuesto > 0 ? presupuesto : 0,
      avance: 0,
      fechaInicio: this.parseApiDate(detalle.fechaInicio),
      fechaFin: this.parseApiDate(detalle.fechaFin),
      fechaCreacion: new Date(),
      latitud: this.readApiCoordinate(detalle.latitudProyecto),
      longitud: this.readApiCoordinate(detalle.longitudProyecto),
      ...multimedia,
      consecutivoConpes: detalle.consecutivoConpes
        ? Number(detalle.consecutivoConpes)
        : undefined,
      frpt: detalle.esFRPT,
      numeroContratoEspecifico: detalle.numeroContratoEspecifico,
      numeroEmpleosDirectos: detalle.numeroEmpleosDirectos,
      numeroEmpleosIndirectos: detalle.numeroEmpleosIndirectos
    };
  }

  private mapApiRowToProyecto(row: Record<string, unknown>): Proyecto {
    const apiId = this.readApiNumber(row['id'] ?? row['Id']) ?? 0;
    const idPactoTerritorial = this.readIdPactoTerritorialFromProyectoRow(row);
    const multimedia = this.mapImagenesApiToProyecto(
      this.normalizeProyectoImagenesApi(row['imagenes'] ?? row['Imagenes'])
    );
    const presupuesto =
      (this.readApiNumber(row['presupuestoDnp'] ?? row['PresupuestoDnp']) ?? 0) +
      (this.readApiNumber(row['presupuestoSector'] ?? row['PresupuestoSector']) ?? 0) +
      (this.readApiNumber(row['presuspuestoTerritorio'] ?? row['PresuspuestoTerritorio']) ?? 0) +
      (this.readApiNumber(row['presupuestoOtros'] ?? row['PresupuestoOtros']) ?? 0);

    const pactoNested = row['pactoTerritorial'] ?? row['PactoTerritorial'] ?? row['pacto'] ?? row['Pacto'];
    let pactoAsociado = '';
    if (pactoNested && typeof pactoNested === 'object') {
      const pacto = pactoNested as Record<string, unknown>;
      pactoAsociado = (this.readApiString(pacto['nombre'] ?? pacto['Nombre']) ?? '').trim();
    }

    const alcanceRaw = this.readApiString(row['alcance'] ?? row['Alcance']) ?? '';
    const desdeAlcance = parseCamposDesdeAlcanceApi(alcanceRaw);
    const productoPrincipalMGA = this.readProductoPrincipalMgaFromRow(row, desdeAlcance.productoPrincipalMga);
    const cantidadMeta =
      this.readApiNumber(row['cantidadMeta'] ?? row['CantidadMeta'] ?? row['cantidadMetaPa'] ?? row['CantidadMetaPa'])
      ?? desdeAlcance.cantidadMeta
      ?? undefined;
    const unidadMedidaMeta =
      this.readApiString(
        row['unidadMedidaMeta'] ?? row['UnidadMedidaMeta'] ?? row['metaPa'] ?? row['MetaPa']
      ) ?? desdeAlcance.unidadMedidaMeta;

    const codigoApi =
      this.readApiString(row['codigo'] ?? row['Codigo'] ?? row['codigoProyecto'] ?? row['CodigoProyecto']) ?? '';
    const codigo = codigoApi.trim() || (apiId >= 1 ? String(apiId) : '');

    const nombreIniciativa = this.readNombreIniciativaFromRow(row) || 'Sin nombre';
    const nombreProyectoBpin = this.readNombreProyectoBpinFromRow(row) ?? '';

    return {
      id: apiId,
      apiId,
      idPactoTerritorial,
      idAreaInfluencia: this.readApiNumber(row['idAreaInfluencia'] ?? row['IdAreaInfluencia']),
      idEstadoProyecto: this.readApiNumber(row['idEstadoProyecto'] ?? row['IdEstadoProyecto']),
      idCondicionProyecto: this.readApiNumber(row['idCondicionProyecto'] ?? row['IdCondicionProyecto']),
      idSectorCatalogo: this.readApiNumber(row['idSector'] ?? row['IdSector']),
      idAportanteNacion: this.readApiNumber(row['idAportanteNacion'] ?? row['IdAportanteNacion']),
      idEntidadProyecto: this.readApiString(row['idEntidadProyecto'] ?? row['IdEntidadProyecto']),
      sesionCDInclusion:
        this.readApiNumber(
          row['sesionCDInclusion']
            ?? row['SesionCDInclusion']
            ?? row['idMecanismoInclusion']
            ?? row['IdMecanismoInclusion']
        ) ?? desdeAlcance.sesionCdPei ?? undefined,
      inversionClimatica: this.readApiBoolean(row['esInversionClimatica'] ?? row['EsInversionClimatica']),
      nombreIniciativa,
      nombreProyectoBpin: nombreProyectoBpin || undefined,
      descripcion: desdeAlcance.alcanceLimpio || alcanceRaw.trim(),
      codigo,
      bpin: this.readApiString(row['bpin'] ?? row['Bpin'] ?? row['BPIN']),
      pactoAsociado,
      lineaTematica:
        this.readApiString(row['lineasTematicas'] ?? row['LineasTematicas'] ?? row['lineaTematica'] ?? row['LineaTematica']),
      sector:
        this.readNestedCatalogoTexto(row['sector'] ?? row['Sector'] ?? row['catalogoSector'] ?? row['CatalogoSector'])
        ?? this.readApiString(row['nombreSector'] ?? row['NombreSector'])
        ?? '',
      estado:
        this.readNestedCatalogoTexto(
          row['estadoProyecto'] ?? row['EstadoProyecto'] ?? row['catalogoEstado'] ?? row['CatalogoEstado']
        )
        ?? this.readApiString(row['estado'] ?? row['Estado'])
        ?? '',
      municipioEntidadNombre:
        (this.readApiString(row['entidadResponsablePI'] ?? row['EntidadResponsablePI']) ?? '').trim() || undefined,
      responsable:
        (this.readApiString(row['entidadResponsablePI'] ?? row['EntidadResponsablePI']) ?? '').trim() || undefined,
      presupuesto: presupuesto > 0 ? presupuesto : 0,
      avance: this.readApiNumber(row['avance'] ?? row['Avance']) ?? 0,
      fechaInicio: this.parseApiDate(row['fechaInicio'] ?? row['FechaInicio']),
      fechaFin: this.parseApiDate(row['fechaFin'] ?? row['FechaFin']),
      fechaCreacion: this.parseApiDate(row['fechaCreacion'] ?? row['FechaCreacion'] ?? row['fechaReporte']),
      latitud: this.readApiCoordinate(row['latitudProyecto'] ?? row['LatitudProyecto']),
      longitud: this.readApiCoordinate(row['longitudProyecto'] ?? row['LongitudProyecto']),
      productoPrincipalMGA: productoPrincipalMGA || undefined,
      cantidadMeta: cantidadMeta ?? undefined,
      unidadMedidaMeta: unidadMedidaMeta || undefined,
      tieneViabilidad: this.readApiBoolean(row['tieneViabilidad'] ?? row['TieneViabilidad']),
      fechaViabilidad: this.parseApiDate(row['fechaViabilidad'] ?? row['FechaViabilidad']),
      ...multimedia,
      frpt: this.readApiBoolean(row['esFRPT'] ?? row['EsFRPT']),
      consecutivoConpes: this.readApiNumber(row['consecutivoConpes'] ?? row['ConsecutivoConpes']),
      numeroEmpleosDirectos: this.readApiNumber(row['numeroEmpleosDirectos'] ?? row['NumeroEmpleosDirectos']),
      numeroEmpleosIndirectos: this.readApiNumber(row['numeroEmpleosIndirectos'] ?? row['NumeroEmpleosIndirectos'])
    };
  }

  private readNombreIniciativaFromRow(row: Record<string, unknown>): string {
    return (
      this.readApiString(
        row['nombreIniciativa']
          ?? row['NombreIniciativa']
          ?? row['nombre']
          ?? row['Nombre']
      ) ?? ''
    ).trim();
  }

  private readNombreProyectoBpinFromRow(row: Record<string, unknown>): string | undefined {
    return this.readApiString(
      row['nombreProyectoBpin']
        ?? row['NombreProyectoBpin']
        ?? row['nombreBpin']
        ?? row['NombreBpin']
        ?? row['nombreBPIN']
        ?? row['NombreBPIN']
    );
  }

  private readProductoPrincipalMgaFromRow(
    row: Record<string, unknown>,
    desdeAlcance?: string
  ): string | undefined {
    const direct = this.readApiString(
      row['productoPrincipalMGA']
        ?? row['ProductoPrincipalMGA']
        ?? row['productoMGA']
        ?? row['ProductoMGA']
    );
    if (direct) {
      return direct;
    }
    if (desdeAlcance) {
      return desdeAlcance;
    }
    const legacyCantidad = this.readApiString(row['cantidadMeta'] ?? row['CantidadMeta']);
    return legacyCantidad;
  }

  private readNombreIniciativaFromDetalle(detalle: ProyectoDetalleApi): string {
    return (
      detalle.nombreIniciativa
      ?? (detalle as ProyectoDetalleApi & { nombre?: string }).nombre
      ?? ''
    ).trim();
  }

  private readNombreProyectoBpinFromDetalle(detalle: ProyectoDetalleApi): string {
    return (
      detalle.nombreProyectoBpin
      ?? (detalle as ProyectoDetalleApi & { nombreBpin?: string }).nombreBpin
      ?? ''
    ).trim();
  }

  private readProductoPrincipalMgaFromDetalle(
    detalle: ProyectoDetalleApi,
    desdeAlcance?: string
  ): string | undefined {
    const direct = detalle.productoPrincipalMGA?.trim();
    if (direct) {
      return direct;
    }
    if (desdeAlcance) {
      return desdeAlcance;
    }
    if (detalle.cantidadMeta != null) {
      return String(detalle.cantidadMeta);
    }
    return undefined;
  }

  private readNestedCatalogoTexto(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const item = value as Record<string, unknown>;
    return (
      this.readApiString(item['texto'] ?? item['Texto'] ?? item['nombre'] ?? item['Nombre'] ?? item['descripcion'])
      ?? undefined
    );
  }

  private parseApiDate(value: unknown): Date {
    const text = this.readApiString(value);
    if (!text) {
      return new Date();
    }
    const d = new Date(text.includes('T') ? text : `${text}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  private normalizeProyectosApiList(list: Record<string, unknown>[]): ProyectoApiOption[] {
    const out: ProyectoApiOption[] = [];
    for (const row of list) {
      const id = this.readApiNumber(row['id'] ?? row['Id']);
      const idPactoTerritorial = this.readIdPactoTerritorialFromProyectoRow(row);
      const nombreIniciativa = this.readNombreIniciativaFromRow(row);
      if (!id || !idPactoTerritorial || !nombreIniciativa) {
        continue;
      }
      out.push({ id, nombreIniciativa, idPactoTerritorial });
    }
    return out;
  }

  private readIdPactoTerritorialFromProyectoRow(row: Record<string, unknown>): number | undefined {
    const direct = this.readApiNumber(
      row['idPactoTerritorial']
        ?? row['IdPactoTerritorial']
        ?? row['idPacto']
        ?? row['IdPacto']
    );
    if (direct) {
      return direct;
    }
    const nested = row['pactoTerritorial'] ?? row['PactoTerritorial'] ?? row['pacto'] ?? row['Pacto'];
    if (nested && typeof nested === 'object') {
      const pacto = nested as Record<string, unknown>;
      return this.readApiNumber(pacto['id'] ?? pacto['Id']);
    }
    return undefined;
  }

  private mismoIdNumerico(a: number, b: number): boolean {
    return Math.trunc(Number(a)) === Math.trunc(Number(b));
  }

  private unwrapApiArray(response: unknown): unknown[] | null {
    if (Array.isArray(response)) {
      return response;
    }
    if (!response || typeof response !== 'object') {
      return null;
    }
    const payload = response as Record<string, unknown>;
    for (const key of ['items', 'data', 'result', 'value']) {
      const candidate = payload[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return null;
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
      nombreProyectoBpin:
        s('nombreProyectoBpin', 'NombreProyectoBpin')
        ?? s('nombreBpin', 'NombreBpin')
        ?? s('nombreBPIN', 'NombreBPIN'),
      codigo: s('codigo', 'Codigo') ?? s('codigoProyecto', 'CodigoProyecto'),
      nombreIniciativa:
        s('nombreIniciativa', 'NombreIniciativa') ?? s('nombre', 'Nombre'),
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
      productoPrincipalMGA: s('productoPrincipalMGA', 'ProductoPrincipalMGA') ?? s('productoMGA', 'ProductoMGA'),
      cantidadMeta: n('cantidadMeta', 'CantidadMeta'),
      unidadMedidaMeta: s('unidadMedidaMeta', 'UnidadMedidaMeta') ?? s('metaPa', 'MetaPa'),
      sesionCDInclusion:
        n('sesionCDInclusion', 'SesionCDInclusion') ?? n('idMecanismoInclusion', 'IdMecanismoInclusion'),
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
      numeroContratoEspecifico: s('numeroContratoEspecifico', 'NumeroContratoEspecifico'),
      latitudProyecto: s('latitudProyecto', 'LatitudProyecto'),
      longitudProyecto: s('longitudProyecto', 'LongitudProyecto'),
      imagenes: this.normalizeProyectoImagenesApi(r['imagenes'] ?? r['Imagenes'])
    };
  }

  private normalizeProyectoImagenesApi(raw: unknown): ProyectoImagenApiCommand[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        idArchivo:
          this.readApiString(item['idArchivo'] ?? item['IdArchivo']) ?? null,
        descripcionImagen:
          this.readApiString(item['descripcionImagen'] ?? item['DescripcionImagen']) ?? '',
        fechaImagen:
          this.readApiString(item['fechaImagen'] ?? item['FechaImagen']) ?? '',
        archivoImagen:
          this.readApiString(item['archivoImagen'] ?? item['ArchivoImagen']) ?? null
      }))
      .filter(
        (item) =>
          !!item.archivoImagen
          || !!item.idArchivo
          || !!item.descripcionImagen.trim()
      );
  }

  private mapImagenesApiToProyecto(
    imagenes: ProyectoImagenApiCommand[] | undefined
  ): Pick<Proyecto, 'imagenes' | 'multimediaNombres' | 'multimediaMetadatos'> {
    const safeImagenes: ProyectoImagenRegistrada[] = (imagenes ?? [])
      .filter((item) => !!item?.archivoImagen || !!item?.idArchivo || !!item?.descripcionImagen?.trim())
      .map((item) => ({
        idArchivo: item.idArchivo ?? null,
        descripcionImagen: item.descripcionImagen,
        fechaImagen: item.fechaImagen,
        archivoImagen: item.archivoImagen ?? null
      }));

    const multimediaNombres = safeImagenes.map((item, index) => {
      const descripcion = item.descripcionImagen.trim();
      return descripcion || `Imagen ${index + 1}`;
    });

    const multimediaMetadatos: ProyectoMultimediaMetadato[] = safeImagenes.map((item, index) => ({
      tipo: 'imagen',
      referencia: multimediaNombres[index],
      fecha: item.fechaImagen,
      detalle: item.descripcionImagen
    }));

    return {
      ...(safeImagenes.length ? { imagenes: safeImagenes } : {}),
      ...(multimediaNombres.length ? { multimediaNombres } : {}),
      ...(multimediaMetadatos.length ? { multimediaMetadatos } : {})
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

  private readApiCoordinate(value: unknown): number | undefined {
    const text = this.readApiString(value);
    if (!text) {
      return undefined;
    }
    const n = Number(text.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
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

  /** Cuerpo exclusivo para POST: sin `id`, `codigo` vacío hasta que la API devuelva el nuevo id. */
  private buildPostProyectoPayload(command: CreateProyectoCommand): CreateProyectoCommand {
    const payload = { ...command } as CreateProyectoCommand & Partial<UpdateProyectoCommand>;
    delete payload.id;
    const codigo = (command.codigo ?? '').trim();
    payload.codigo = codigo || `P-${Date.now()}`;
    payload.idFaseInversion = null;
    payload.idTipoOferta = null;
    return payload;
  }

  private sanitizeCreateProyectoPayload(
    command: CreateProyectoCommand | UpdateProyectoCommand,
    isUpdate: boolean
  ): CreateProyectoCommand | UpdateProyectoCommand {
    if (!isUpdate) {
      return this.buildPostProyectoPayload(command as CreateProyectoCommand);
    }

    const payload = { ...command } as UpdateProyectoCommand;
    payload.idFaseInversion = null;
    payload.idTipoOferta = null;
    return payload;
  }

  /** JSON directo cuando no hay archivos binarios nuevos. */
  private buildProyectoJsonBody(
    command: CreateProyectoCommand | UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[],
    isUpdate: boolean
  ): CreateProyectoCommand | UpdateProyectoCommand {
    return {
      ...command,
      imagenes: this.buildImagenesMetadataForApi(imagenes, isUpdate)
    };
  }

  /**
   * Multipart exigido por el backend cuando hay IFormFile:
   * - `command`: JSON del comando (imagenes solo metadatos, sin archivoImagen).
   * - `imagenes[i].archivoImagen`: archivo binario.
   */
  private buildProyectoMultipartWithCommand(
    commandPayload: CreateProyectoCommand | UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[]
  ): FormData {
    const form = new FormData();
    const imagenesMeta = commandPayload.imagenes ?? [];

    form.append('command', JSON.stringify(commandPayload));

    imagenesMeta.forEach((meta, index) => {
      const prefix = `imagenes[${index}]`;
      if (meta.descripcionImagen) {
        form.append(`${prefix}.descripcionImagen`, meta.descripcionImagen);
      }
      if (meta.fechaImagen) {
        form.append(`${prefix}.fechaImagen`, meta.fechaImagen);
      }
      if (meta.idArchivo) {
        form.append(`${prefix}.idArchivo`, meta.idArchivo);
      }
      const file = imagenes[index]?.file;
      if (file && file.size > 0) {
        form.append(`${prefix}.archivoImagen`, file, file.name);
      }
    });

    return form;
  }

  private buildImagenesMetadataForApi(
    imagenes: ProyectoImagenUpload[],
    includeIdArchivo: boolean
  ): ProyectoImagenApi[] {
    return imagenes.map((img) => {
      const item: ProyectoImagenApi = {
        descripcionImagen: img.descripcionImagen,
        fechaImagen: img.fechaImagen,
        archivoImagen: this.resolveArchivoImagenForApiJson(img)
      };
      const idArchivo = img.idArchivo?.trim();
      if (includeIdArchivo && idArchivo) {
        item.idArchivo = idArchivo;
      }
      return item;
    });
  }

  /**
   * En el JSON real: null si hay file nuevo (el binario va en multipart).
   * Si es imagen ya guardada, reutiliza el string devuelto por GET.
   */
  private resolveArchivoImagenForApiJson(img: ProyectoImagenUpload): string | null {
    const file = img.file;
    if (file && file.size > 0) {
      return null;
    }
    const existing = img.archivoImagenApi?.trim();
    return existing || null;
  }

  /** Muestra en consola el JSON con `archivoImagen` (base64 para archivos nuevos). */
  private logProyectoEnvioConsola(
    method: 'POST' | 'PUT',
    contentType: string,
    jsonPayload: CreateProyectoCommand | UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[],
    multipart: boolean
  ): void {
    void this.buildProyectoJsonLogPayload(jsonPayload, imagenes).then((logPayload) => {
      const jsonText = JSON.stringify(logPayload, null, 2);
      const label = method === 'POST' ? 'POST /api/Proyecto' : 'PUT /api/Proyecto';

      console.group(`[SISPACTOS] ${label} — JSON de envío`);
      console.log('Content-Type:', contentType);
      if (multipart) {
        console.log(
          'Nota: con imagen nueva, `archivoImagen` en el JSON de consola es base64 para inspección;'
          + ' el envío real usa null en `command` y el binario en imagenes[i].archivoImagen (multipart).'
        );
      }
      console.log(jsonText);
      console.log('Objeto parseado:', logPayload);

      if (multipart) {
        const archivos = imagenes
          .map((img, index) => {
            const file = img.file;
            if (!file || file.size <= 0) {
              return null;
            }
            return {
              campo: `imagenes[${index}].archivoImagen`,
              nombre: file.name,
              tipo: file.type,
              bytes: file.size
            };
          })
          .filter((item): item is NonNullable<typeof item> => item != null);
        console.log('Archivos binarios multipart:', archivos);
      }

      console.groupEnd();
    });
  }

  private async buildProyectoJsonLogPayload(
    jsonPayload: CreateProyectoCommand | UpdateProyectoCommand,
    imagenes: ProyectoImagenUpload[]
  ): Promise<CreateProyectoCommand | UpdateProyectoCommand> {
    const imagenesLog = await Promise.all(
      (jsonPayload.imagenes ?? []).map(async (meta, index) => {
        const upload = imagenes[index];
        const file = upload?.file;
        if (file && file.size > 0) {
          return {
            ...meta,
            archivoImagen: await this.fileToBase64(file)
          };
        }
        return {
          ...meta,
          archivoImagen: meta.archivoImagen ?? upload?.archivoImagenApi?.trim() ?? null
        };
      })
    );

    return { ...jsonPayload, imagenes: imagenesLog };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        const comma = dataUrl.indexOf(',');
        resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
      };
      reader.onerror = () => reject(reader.error ?? new Error('No fue posible leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }

  private buildProyectoApiErrorMessage(error: HttpErrorResponse, accion: 'crear' | 'actualizar'): string {
    if (error.status === 401 || error.status === 403) {
      return 'Su sesion expiro o no tiene permiso para guardar proyectos. Inicie sesion nuevamente con su usuario y contrasena.';
    }
    if (error.status === 415) {
      return 'El servidor no acepto el formato de la peticion (415). Con imagenes nuevas debe enviarse multipart/form-data.';
    }
    if (error.status === 400) {
      const raw = this.extractHttpErrorText(error);
      if (/command field is required/i.test(raw) || /IFormFile/i.test(raw)) {
        return 'El servidor espera las imagenes como archivo (multipart), no como texto en JSON. Intente guardar de nuevo; si persiste, contacte al administrador de la API.';
      }
    }

    const raw = this.extractHttpErrorText(error);
    const fkMessage = this.parseProyectoForeignKeyError(raw);
    if (fkMessage) {
      return fkMessage;
    }
    if (raw.trim() && !raw.includes('Http failure response')) {
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
      const errors = (body as { errors?: Record<string, unknown> }).errors;
      if (errors && typeof errors === 'object') {
        const flattened = Object.entries(errors)
          .flatMap(([field, messages]) => {
            if (Array.isArray(messages)) {
              return messages
                .map((message) => String(message || '').trim())
                .filter(Boolean)
                .map((message) => `${field}: ${message}`);
            }
            const single = String(messages || '').trim();
            return single ? [`${field}: ${single}`] : [];
          })
          .filter(Boolean);
        if (flattened.length) {
          return flattened.join(' | ');
        }
      }
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
    if (
      normalized.includes('pk_proyecto')
      || normalized.includes('cannot insert duplicate key')
      || normalized.includes('duplicate key')
    ) {
      return 'Ya existe un proyecto con ese identificador en la base de datos. Si estaba creando uno nuevo, intente de nuevo sin editar un registro existente. Si estaba editando, use Guardar en modo edicion (no crear otro).';
    }
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
    if (normalized.includes('invalid column name')) {
      if (
        normalized.includes('productoprincipalmga')
        || normalized.includes('productomga')
        || normalized.includes('cantidadmeta')
        || normalized.includes('unidadmedidameta')
        || normalized.includes('metapa')
      ) {
        return 'El servidor aun no tiene en base de datos los campos MGA (producto principal, cantidad meta o unidad de medida). Contacte al administrador para actualizar la BD.';
      }
      return 'El servidor aun no tiene en base de datos algunos campos del formulario (por ejemplo Sesion CD). Los datos de sesion se envian dentro de Alcance hasta que se actualice la BD.';
    }
    return null;
  }

  private truncateErrorText(text: string, maxLength = 320): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}…`;
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

}

