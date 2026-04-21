import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
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
  tipoPacto: string;
}

type ApiPacto = Record<string, unknown>;

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

interface PactoCatalogosResult {
  tiposPacto: CatalogoOption[];
  etapas: CatalogoOption[];
}

interface CreatePactoCommand {
  idTipoPacto: number;
  nombre: string;
  suscribientes: string;
  objetivo: string;
  lineasTematicas: string;
  fechaSubscripcion: string;
  fechaVencimiento: string;
  idEtapa: number;
  areasIntervencion: string[];
  urlPacto: string;
  urlMinuta: string;
}

@Injectable({
  providedIn: 'root'
})
export class PactosService {
  private readonly storageKey = 'sispactos.pactos';
  private readonly pactosApiUrl = '/api/PactoTerritorial';
  private readonly catalogoApiUrl = '/api/Catalogo';
  private readonly maxCatalogTypeProbe = 20;

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
    this.loadFromStorage();
    this.syncPactosFromApi().subscribe();
  }

  // Entrega la lista de pactos para que los componentes la muestren.
  getPactos(): Observable<Pacto[]> {
    return this.pactos$;
  }

  // Consulta el listado de pactos desde la API transaccional.
  getPactosTablaFromApi(): Observable<PactoTablaDto[]> {
    return this.http.get<unknown>(this.pactosApiUrl).pipe(
      map((response) => this.normalizeApiPactos(response).map((item) => this.mapToTabla(item)))
    );
  }

  // Carga catalogos para el formulario de pactos.
  getPactoCatalogos(): Observable<PactoCatalogosResult> {
    const tiposPacto$ = this.http.get<unknown>(`${this.catalogoApiUrl}/2`).pipe(
      map((response) => this.normalizeCatalogoItems(response)),
      catchError(() => of([] as CatalogoOption[]))
    );

    return forkJoin({
      tiposPacto: tiposPacto$,
      etapas: this.getEtapasCatalogo()
    });
  }

  private getEtapasCatalogo(): Observable<CatalogoOption[]> {
    const catalogTypeIds = Array.from({ length: this.maxCatalogTypeProbe }, (_, index) => index + 1);

    return forkJoin(
      catalogTypeIds.map((catalogTypeId) =>
        this.http.get<unknown>(`${this.catalogoApiUrl}/${catalogTypeId}`).pipe(
          map((response) => ({
            catalogTypeId,
            items: this.normalizeCatalogoItems(response)
          })),
          catchError(() => of({ catalogTypeId, items: [] as CatalogoOption[] }))
        )
      )
    ).pipe(
      map((catalogs) => this.resolveCatalogOptions(catalogs, ['construccion', 'implementacion', 'cierre']))
    );
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

  // Crea un pacto en backend y luego sincroniza el listado local.
  createPactoInApi(pacto: Omit<Pacto, 'id'>): Observable<CreatePactoResult> {
    const payload = this.mapToCreateCommand(pacto);

    return this.http.post<unknown>(this.pactosApiUrl, payload).pipe(
      tap(() => {
        this.syncPactosFromApi().subscribe();
      }),
      map(() => ({ success: true })),
      catchError((error: HttpErrorResponse) => of({
        success: false,
        message: this.buildCreatePactoErrorMessage(error)
      }))
    );
  }

  // Sincroniza el listado interno de administración desde la API.
  syncPactosFromApi(): Observable<Pacto[]> {
    return this.http.get<unknown>(this.pactosApiUrl).pipe(
      map((response) => this.normalizeApiPactos(response).map((item) => this.mapToAdminPacto(item))),
      tap((rows) => {
        this.pactos.next(rows);
        this.saveToStorage();
      }),
      catchError(() => of(this.pactos.value))
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

  private mapToTabla(item: ApiPacto): PactoTablaDto {
    const fechaBase = this.readString(item['fechaSubscripcion'])
      || this.readString(item['fechaCreacion'])
      || '';

    return {
      nombrePacto: this.readString(item['nombre']) || this.readString(item['nombrePacto']) || 'Sin nombre',
      fechaSubscripcion: this.formatDate(fechaBase),
      fechaVencimiento: this.formatDate(this.readString(item['fechaVencimiento'])),
      etapa: this.readString(item['etapa']) || 'Sin etapa',
      valorIndicativo: this.readNumber(item['valorIndicativo']),
      presupuestoComprometido: this.readNumber(item['presupuestoComprometido']),
      avanceComprometido: this.readNumber(item['avanceComprometido']),
      departamento: this.readString(item['departamento']) || 'N/A',
      tipoPacto: this.readString(item['tipoPacto']) || this.readString(item['tipo']) || 'No definido'
    };
  }

  private mapToAdminPacto(item: ApiPacto): Pacto {
    const nombre = this.readString(item['nombre']) || this.readString(item['nombrePacto']) || 'Sin nombre';
    const fechaCreacion = this.readString(item['fechaCreacion']) || new Date().toISOString();

    return {
      id: this.readNumber(item['id']),
      tipoPacto: this.readString(item['tipoPacto']) || this.readString(item['tipo']) || 'No definido',
      nombre,
      descripcion: this.readString(item['suscribientes']) || this.readString(item['descripcion']) || '',
      objetivo: this.readString(item['objetivo']) || '',
      lineasTematicas: this.readLineasTematicas(item['lineasTematicas']),
      fechaSuscripcion: this.formatDate(this.readString(item['fechaSubscripcion'])),
      fechaVencimiento: this.formatDate(this.readString(item['fechaVencimiento'])),
      idEtapa: this.readString(item['etapa']) || this.readString(item['idEtapa']) || '',
      alcance: this.readAreasIntervencion(item['areasIntervencion']),
      urlDocPacto: this.readString(item['urlPacto']),
      urlDocMinuta: this.readString(item['urlMinuta']),
      usuarioCreo: this.readString(item['usuarioCreacion']),
      fechaCreacion,
      usuarioModifico: this.readString(item['usuarioModificacion']),
      fechaModificacion: this.readString(item['fechaModificacion']) || fechaCreacion
    };
  }

  private mapToCreateCommand(pacto: Omit<Pacto, 'id'>): CreatePactoCommand {
    return {
      idTipoPacto: this.mapTipoPactoToId(pacto.tipoPacto),
      nombre: (pacto.nombre || '').trim(),
      suscribientes: (pacto.descripcion || '').trim(),
      objetivo: (pacto.objetivo || '').trim(),
      lineasTematicas: pacto.lineasTematicas.join(', ').trim(),
      fechaSubscripcion: this.toIsoDate(pacto.fechaSuscripcion),
      fechaVencimiento: this.toIsoDate(pacto.fechaVencimiento),
      idEtapa: this.mapEtapaToId(pacto.idEtapa),
      areasIntervencion: this.mapAreasIntervencion(pacto.alcance),
      urlPacto: (pacto.urlDocPacto || '').trim(),
      urlMinuta: (pacto.urlDocMinuta || '').trim()
    };
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

  private buildCreatePactoErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'La sesión no está autorizada para crear pactos. Inicie sesión nuevamente.';
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

    return 'No fue posible crear el pacto en el servidor.';
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

  private normalizeCatalogoItems(response: unknown): CatalogoOption[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        id: this.readNumber(item['id']),
        idTipoCatalogo: this.readOptionalNumber(item['idTipoCatalogo']),
        codigo: this.readString(item['codigo']),
        texto: this.readString(item['texto'])
      }))
      .filter((item) => item.id > 0 && !!item.texto);
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
