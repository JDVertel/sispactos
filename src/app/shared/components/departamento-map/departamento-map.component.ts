import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { geoMercator, geoPath } from 'd3-geo';

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

interface GeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface RenderPath {
  id: string;
  name: string;
  d: string;
  selected: boolean;
  dimmed: boolean;
  fill?: string;
  stroke?: string;
  tooltip?: string;
}

interface RenderLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  dx: number;
  dy: number;
}

interface MunicipalityContext {
  name: string;
  department?: string;
}

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface FitTransformResult {
  transform: string;
  centerX: number;
  centerY: number;
}

interface LegacySvgLocation {
  id: string;
  name: string;
  path: string;
}

const MAP_WIDTH = 613;
const MAP_HEIGHT = 694;
const DEPARTMENTS_URL = '/assets/geo/co_2018_MGN_DPTO_POLITICO.geojson';
const MUNICIPALITIES_URL = '/assets/geo/co_2018_MGN_MPIO_POLITICO.geojson';

@Component({
  selector: 'app-departamento-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './departamento-map.component.html',
  styleUrl: './departamento-map.component.css'
})
export class DepartamentoMapComponent implements OnInit, OnChanges {
  // Recibe el departamento elegido en los filtros.
  @Input() departamento = '';

  // Permite resaltar uno o varios departamentos en la vista territorial.
  @Input() departamentos: string[] = [];

  // Recibe el municipio asociado al pacto seleccionado.
  @Input() municipio = '';

  // Permite pasar varios municipios seleccionados desde el alcance del pacto.
  @Input() municipios: string[] = [];

  // Permite pasar municipio + departamento para resolver coincidencias exactas.
  @Input() municipioContextos: MunicipalityContext[] = [];

  // Activa la capa de municipios para vistas territoriales del pacto.
  @Input() showMunicipalities = false;

  // Permite ocultar por completo la capa de departamentos en la vista.
  @Input() showDepartments = true;

  @Input() selectedDepartmentFill = '#ffbf39';
  @Input() selectedDepartmentStroke = '#d79a00';
  @Input() municipalityFill = 'rgba(255, 111, 165, 0.72)';
  @Input() municipalityStroke = '#ff6fa5';

  /** Marco redondeado tipo home solo en el dashboard; en otras rutas debe ser false. */
  @Input() homeSurface = false;

  /** Si es true, el mapa crece en altura para igualar la columna vecina (flex). */
  @Input() stretchVertical = false;

  /**
   * Tooltip extra por departamento (por nombre).
   * Clave: nombre del departamento (cualquier casing/acentos). Se normaliza internamente.
   */
  @Input() departmentTooltipMap: Record<string, { pactoNombre: string; valorIndicativo: number }> = {};

  /** Click en un departamento del mapa (por nombre visible). */
  @Output() departmentClick = new EventEmitter<string>();

  @HostBinding('class.map-host-stretch')
  get hostStretchClass(): boolean {
    return this.stretchVertical;
  }

  mapLabel = 'Mapa territorial';
  mapReady = false;
  mapError = '';
  departmentPaths: RenderPath[] = [];
  departmentLabels: RenderLabel[] = [];
  municipalityPaths: RenderPath[] = [];
  municipalityLabels: RenderLabel[] = [];
  municipalityNumberLabels: RenderLabel[] = [];
  departmentLabelsHidden = false;
  zoomLevel = 0.32;
  readonly minZoom = 0.08;
  readonly maxZoom = 2.5;
  readonly zoomStep = 0.12;
  baseMapTransform = '';
  zoomCenterX = MAP_WIDTH / 2;
  zoomCenterY = MAP_HEIGHT / 2;
  private selectionCenterX = MAP_WIDTH / 2;
  private selectionCenterY = MAP_HEIGHT / 2;
  panX = 0;
  panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;
  private lastSelectionSignature = '';

  @ViewChild('mapSvg', { static: false })
  private mapSvg?: ElementRef<SVGSVGElement>;

  private departmentsData: GeoJsonFeatureCollection | null = null;
  private municipalitiesData: GeoJsonFeatureCollection | null = null;
  private municipalityColorMap = new Map<string, string>();

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadMapData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['departamento'] ||
      changes['departamentos'] ||
      changes['municipio'] ||
      changes['municipios'] ||
      changes['municipioContextos'] ||
      changes['showMunicipalities'] ||
      changes['showDepartments'] ||
      changes['selectedDepartmentFill'] ||
      changes['selectedDepartmentStroke'] ||
      changes['municipalityFill'] ||
      changes['municipalityStroke']
    ) {
      const nextSignature = this.selectionSignature();
      if (nextSignature === this.lastSelectionSignature) {
        return;
      }

      this.lastSelectionSignature = nextSignature;
      this.zoomLevel = this.getInitialZoomLevel();
      this.panX = 0;
      this.panY = 0;
      this.renderMap();
    }
  }

  get displayDepartamento(): string {
    return this.departamento?.trim() || '';
  }

  get displayMunicipio(): string {
    return this.municipio?.trim() || '';
  }

  get hasMunicipio(): boolean {
    return !!this.municipio?.trim();
  }

  get hasSelectedDepartment(): boolean {
    return this.selectedDepartmentCodes().size > 0;
  }

  get hasTerritorySelection(): boolean {
    return this.hasSelectedDepartment || this.selectedMunicipalityCodes().size > 0;
  }

  get emptyTerritoryLegendText(): string {
    return 'No hay municipios o departamentos para mostrar.';
  }

  get mapViewBox(): string {
    return `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
  }

  get mapLocations(): LegacySvgLocation[] {
    return this.departmentPaths.map((region) => ({
      id: region.id,
      name: region.name,
      path: region.d
    }));
  }

  get selectedLocationId(): string {
    return [...this.selectedDepartmentCodes()][0] || '';
  }

  get mapTransform(): string {
    const zoomAroundCenter = `translate(${this.zoomCenterX} ${this.zoomCenterY}) scale(${this.zoomLevel}) translate(${-this.zoomCenterX} ${-this.zoomCenterY})`;
    return `${this.baseMapTransform} ${zoomAroundCenter} translate(${this.panX} ${this.panY})`.trim();
  }

  get zoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  get municipalityLegend(): { id: string; name: string; selected: boolean; color: string; number: number }[] {
    if (!this.showMunicipalities || !this.municipalityPaths.length) {
      return [];
    }

    const seen = new Set<string>();
    const items = this.municipalityPaths
      .map((m) => ({
        id: m.id,
        name: (m.name || '').trim(),
        selected: m.selected,
        color: m.stroke || this.getMunicipalityColor(m.id)
      }))
      .filter((m) => !!m.name)
      .filter((m) => {
        const key = `${m.id}|${m.name}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    items.sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1;
      return a.name.localeCompare(b.name, 'es-CO', { sensitivity: 'base' });
    });

    return items.map((item, index) => ({
      ...item,
      number: index + 1
    }));
  }

  private municipalityNumberMap(): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of this.municipalityLegend) {
      map.set(item.id, item.number);
    }
    return map;
  }

  zoomIn(): void {
    this.recenterZoomOnSelection();
    this.zoomLevel = Math.min(this.maxZoom, +(this.zoomLevel + this.zoomStep).toFixed(2));
    this.ensurePanInBounds();
  }

  zoomOut(): void {
    this.recenterZoomOnSelection();
    this.zoomLevel = Math.max(this.minZoom, +(this.zoomLevel - this.zoomStep).toFixed(2));
    this.ensurePanInBounds();
  }

  resetZoom(): void {
    this.zoomLevel = this.getInitialZoomLevel();
    this.panX = 0;
    this.panY = 0;
  }

  onMapWheel(event: WheelEvent): void {
    if (!this.mapReady || this.mapError) {
      return;
    }

    event.preventDefault();

    const rect = this.mapSvg?.nativeElement.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const previousZoom = this.zoomLevel;
    const nextZoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, +(previousZoom + (event.deltaY < 0 ? this.zoomStep : -this.zoomStep)).toFixed(2))
    );

    if (nextZoom === previousZoom) {
      return;
    }

    const zoomRatio = nextZoom / previousZoom;
    this.panX = pointerX - zoomRatio * (pointerX - this.panX);
    this.panY = pointerY - zoomRatio * (pointerY - this.panY);
    this.zoomLevel = nextZoom;
    this.ensurePanInBounds();
  }

  onMapPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.mapReady || this.mapError) {
      return;
    }

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPanX = this.panX;
    this.dragStartPanY = this.panY;
    event.preventDefault();
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }

    this.panX = this.dragStartPanX + (event.clientX - this.dragStartX);
    this.panY = this.dragStartPanY + (event.clientY - this.dragStartY);
    this.ensurePanInBounds();
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  @HostListener('window:blur')
  onWindowPointerEnd(): void {
    this.isDragging = false;
  }

  private normalizeText(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\uFFFD/g, '')
      .toLowerCase()
      .trim();
  }

  private buildDepartmentTooltip(departmentName: string): string {
    const safeName = (departmentName || '').trim() || 'Sin nombre';
    const normalized = this.normalizeText(safeName);

    const entries = Object.entries(this.departmentTooltipMap || {});
    const match = entries.find(([key]) => this.normalizeText(key) === normalized);
    if (!match) {
      return safeName;
    }

    const meta = match[1];
    const pactoNombre = (meta?.pactoNombre || '').trim();
    const valor = Number(meta?.valorIndicativo ?? 0);
    const valorSeguro = Number.isFinite(valor) ? valor : 0;

    const valorTexto = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valorSeguro);

    return pactoNombre
      ? `${safeName}\nPacto: ${pactoNombre}\nValor indicativo: ${valorTexto}`
      : safeName;
  }

  onDepartmentClicked(departmentName: string): void {
    const safe = (departmentName || '').trim();
    if (!safe) {
      return;
    }
    this.departmentClick.emit(safe);
  }

  hideDepartmentLabels(event: MouseEvent): void {
    event.stopPropagation();
    this.departmentLabelsHidden = true;
  }

  showDepartmentLabels(): void {
    this.departmentLabelsHidden = false;
  }

  private selectedDepartmentCodes(): Set<string> {
    const selected = new Set<string>();

    const singleDepartment = this.normalizeText(this.departamento);
    if (singleDepartment && singleDepartment !== 'colombia') {
      const feature = this.resolveDepartmentFeatureExact(singleDepartment)
        ?? this.resolveDepartmentFeatureLoose(singleDepartment);
      const code = this.getDepartmentCode(feature);
      if (code) {
        selected.add(code);
      }
    }

    for (const item of this.departamentos || []) {
      const normalized = this.normalizeText(item);
      if (!normalized) {
        continue;
      }

      const feature = this.resolveDepartmentFeatureExact(normalized) ?? this.resolveDepartmentFeatureLoose(normalized);

      const code = this.getDepartmentCode(feature);
      if (code) {
        selected.add(code);
      }
    }

    return selected;
  }

  private selectedMunicipalityCodes(): Set<string> {
    const selected = new Set<string>();

    const contexts: MunicipalityContext[] = this.municipioContextos?.length
      ? [...this.municipioContextos]
      : [
          ...((this.municipios || []).map((item) => ({ name: item }))),
          ...(this.municipio ? [{ name: this.municipio }] : [])
        ];

    for (const context of contexts) {
      const normalizedMunicipality = this.normalizeText(context.name);
      if (!normalizedMunicipality) {
        continue;
      }

      const normalizedDepartment = this.normalizeText(context.department || '');
      const departmentCode = normalizedDepartment ? this.getDepartmentCodeByName(normalizedDepartment) : '';

      const feature = this.resolveMunicipalityFeatureExact(normalizedMunicipality, departmentCode)
        ?? this.resolveMunicipalityFeatureLoose(normalizedMunicipality, departmentCode);

      const code = feature ? this.getMunicipalityCode(feature) : '';
      if (code) {
        selected.add(code);
      }
    }

    return selected;
  }

  private loadMapData(): void {
    this.mapReady = false;
    this.mapError = '';

    forkJoin({
      departments: this.http.get<GeoJsonFeatureCollection>(DEPARTMENTS_URL).pipe(
        catchError(() => of(null))
      ),
      municipalities: this.http.get<GeoJsonFeatureCollection>(MUNICIPALITIES_URL).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ departments, municipalities }) => {
        if (!departments || !municipalities) {
          this.mapError = 'No fue posible cargar la cartografía territorial.';
          this.mapReady = true;
          return;
        }

        this.departmentsData = departments;
        this.municipalitiesData = municipalities;
        this.zoomLevel = this.getInitialZoomLevel();
        this.renderMap();
        this.mapReady = true;
      },
      error: () => {
        this.mapError = 'No fue posible cargar la cartografía territorial.';
        this.mapReady = true;
      }
    });
  }

  private renderMap(): void {
    if (!this.departmentsData || !this.municipalitiesData) {
      return;
    }

    const selectedDepartmentFeature = this.selectedDepartmentFeature();
    const selectedDepartmentCodes = this.selectedDepartmentCodes();
    const selectedMunicipalityCodes = this.selectedMunicipalityCodes();
    const projection = geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], this.departmentsData as any);
    const pathGenerator = geoPath(projection);
    const centroidGenerator = geoPath(projection) as any;

    this.departmentPaths = this.showDepartments
      ? this.departmentsData.features
          .map((feature) => {
            const name = this.getDepartmentName(feature);
            const code = this.getDepartmentCode(feature);
            const d = pathGenerator(feature as any) || '';
            const selected = selectedDepartmentCodes.has(code);
            const dimmed = selectedDepartmentCodes.size > 0 && !selected;
            const tooltip = this.buildDepartmentTooltip(name);
            return {
              id: code || name,
              name,
              d,
              selected,
              dimmed,
              tooltip
            };
          })
          .filter((item) => !!item.d)
      : [];

    this.departmentLabels = this.showDepartments
      ? this.departmentsData.features
          .map((feature) => {
            const code = this.getDepartmentCode(feature);
            const selected = selectedDepartmentCodes.has(code);
            if (!selected) {
              return null;
            }

            const [x, y] = (centroidGenerator.centroid(feature as any) as [number, number]) || [0, 0];
            const name = this.getDepartmentName(feature);
            const scale = selectedDepartmentCodes.size === 1 ? this.getLabelScale(name) : 1;
            const offset = selectedDepartmentCodes.size === 1 ? this.getLabelOffset(name) : { dx: 0, dy: -6 };
            return {
              id: code || this.getDepartmentName(feature),
              name,
              x,
              y,
              scale,
              dx: offset.dx,
              dy: offset.dy
            };
          })
          .filter((item): item is RenderLabel => !!item)
      : [];

    if (this.showMunicipalities) {
      const visibleMunicipalityFeatures = this.municipalitiesData.features.filter((feature) => {
        const code = this.getMunicipalityCode(feature);
        const departmentCode = this.getMunicipalityDepartmentCode(feature);
        const matchesMunicipality = selectedMunicipalityCodes.size === 0 || selectedMunicipalityCodes.has(code);
        const matchesDepartment = selectedDepartmentCodes.size === 0 || selectedDepartmentCodes.has(departmentCode);
        return matchesMunicipality && matchesDepartment;
      });

      const visibleCodes = visibleMunicipalityFeatures
        .map((feature) => this.getMunicipalityCode(feature))
        .filter(Boolean);
      this.ensureMunicipalityColors(visibleCodes);

      this.municipalityPaths = visibleMunicipalityFeatures
        .map((feature) => {
          const d = pathGenerator(feature as any) || '';
          const code = this.getMunicipalityCode(feature);
          const selected = selectedMunicipalityCodes.has(code);
          const dimmed = selectedMunicipalityCodes.size > 0 && !selected;
          const color = this.getMunicipalityColor(code);
          const hue = this.hueFromHsl(color);
          const fillHex = this.hslToHex(hue, 82, 58);
          const strokeHex = this.hslToHex(hue, 82, 34);
          return {
            id: code,
            name: this.getMunicipalityName(feature),
            d,
            selected,
            dimmed,
            // Relleno sólido para que se identifique claramente cada municipio.
            fill: fillHex,
            // Borde un poco más oscuro para definir el contorno.
            stroke: strokeHex
          };
        })
        .filter((item) => !!item.d);
    } else {
      this.municipalityPaths = [];
    }

    // No mostramos texto de municipios en el mapa (se listan en la leyenda),
    // pero sí mostramos un número que coincide con la leyenda para identificar.
    this.municipalityLabels = [];
    this.municipalityNumberLabels = [];

    if (this.showMunicipalities) {
      const numberMap = this.municipalityNumberMap();
      const visibleCodes = new Set(this.municipalityPaths.map((m) => m.id));

      this.municipalityNumberLabels = this.municipalitiesData.features
        .filter((feature) => visibleCodes.has(this.getMunicipalityCode(feature)))
        .map((feature) => {
          const id = this.getMunicipalityCode(feature);
          const number = numberMap.get(id) ?? 0;
          if (!number) return null;

          const [x, y] = (centroidGenerator.centroid(feature as any) as [number, number]) || [0, 0];
          return {
            id,
            name: String(number),
            x,
            y,
            // El número debe ir centrado: sin offsets y con escala fija.
            scale: 1,
            dx: 0,
            dy: 0
          };
        })
        .filter((item): item is RenderLabel => !!item);
    }

    const fit = this.computeFitTransform(pathGenerator as any, selectedDepartmentCodes, selectedMunicipalityCodes);
    this.baseMapTransform = fit.transform;
    this.zoomCenterX = fit.centerX;
    this.zoomCenterY = fit.centerY;
    this.selectionCenterX = fit.centerX;
    this.selectionCenterY = fit.centerY;

    if (selectedDepartmentCodes.size === 1 && selectedDepartmentFeature) {
      this.mapLabel = `Mapa de ${this.getDepartmentName(selectedDepartmentFeature)}`;
      return;
    }

    this.mapLabel = selectedDepartmentCodes.size > 1 ? 'Mapa de departamentos seleccionados' : 'Mapa de Colombia';
  }

  private selectedDepartmentFeature(): GeoJsonFeature | null {
    const normalizedInput = this.normalizeText(this.departamento);
    if (!normalizedInput || normalizedInput === 'colombia') {
      return null;
    }

    return this.resolveDepartmentFeatureExact(normalizedInput) ?? this.resolveDepartmentFeatureLoose(normalizedInput);
  }

  private selectedMunicipalityFeature(selectedDepartmentCode: string): GeoJsonFeature | null {
    if (!this.municipalitiesData) {
      return null;
    }

    const normalizedInput = this.normalizeText(this.municipio);
    if (!normalizedInput) {
      return null;
    }

    return (
      this.municipalitiesData.features.find((feature) => {
        const featureMunicipality = this.normalizeText(this.getMunicipalityName(feature));
        const featureDepartmentCode = this.getMunicipalityDepartmentCode(feature);
        const sameDepartment = !selectedDepartmentCode || featureDepartmentCode === selectedDepartmentCode;
        return sameDepartment && this.matchesTerritoryName(normalizedInput, featureMunicipality);
      }) ?? null
    );
  }

  private matchesTerritoryName(input: string, candidate: string): boolean {
    if (!input || !candidate) {
      return false;
    }

    return candidate.includes(input) || input.includes(candidate);
  }

  private getDepartmentName(feature: GeoJsonFeature): string {
    return this.readString(feature.properties['DPTO_CNMBR']) || 'Sin nombre';
  }

  private getDepartmentCode(feature?: GeoJsonFeature | null): string {
    if (!feature) {
      return '';
    }

    return this.readString(feature.properties['DPTO_CCDGO']);
  }

  private resolveDepartmentFeatureExact(normalizedDepartment: string): GeoJsonFeature | null {
    if (!this.departmentsData) {
      return null;
    }

    return (
      this.departmentsData.features.find((feature) => {
        const normalizedFeature = this.normalizeText(this.getDepartmentName(feature));
        return normalizedFeature === normalizedDepartment;
      }) ?? null
    );
  }

  private resolveDepartmentFeatureLoose(normalizedDepartment: string): GeoJsonFeature | null {
    if (!this.departmentsData) {
      return null;
    }

    return (
      this.departmentsData.features.find((feature) => {
        const normalizedFeature = this.normalizeText(this.getDepartmentName(feature));
        return this.matchesTerritoryName(normalizedDepartment, normalizedFeature);
      }) ?? null
    );
  }

  private getDepartmentCodeByName(name: string): string {
    if (!this.departmentsData) {
      return '';
    }

    const normalized = this.normalizeText(name);
    if (!normalized) {
      return '';
    }

    const feature = this.departmentsData.features.find((candidate) => {
      return this.normalizeText(this.getDepartmentName(candidate)) === normalized;
    });

    return feature ? this.getDepartmentCode(feature) : '';
  }

  private resolveMunicipalityFeatureExact(normalizedMunicipality: string, departmentCode: string): GeoJsonFeature | null {
    if (!this.municipalitiesData) {
      return null;
    }

    return (
      this.municipalitiesData.features.find((candidate) => {
        const normalizedFeature = this.normalizeText(this.getMunicipalityName(candidate));
        const candidateDepartmentCode = this.getMunicipalityDepartmentCode(candidate);
        const departmentMatches = !departmentCode || candidateDepartmentCode === departmentCode;
        return departmentMatches && normalizedFeature === normalizedMunicipality;
      }) ?? null
    );
  }

  private resolveMunicipalityFeatureLoose(normalizedMunicipality: string, departmentCode: string): GeoJsonFeature | null {
    if (!this.municipalitiesData) {
      return null;
    }

    return (
      this.municipalitiesData.features.find((candidate) => {
        const normalizedFeature = this.normalizeText(this.getMunicipalityName(candidate));
        const candidateDepartmentCode = this.getMunicipalityDepartmentCode(candidate);
        const departmentMatches = !departmentCode || candidateDepartmentCode === departmentCode;
        return departmentMatches && this.matchesTerritoryName(normalizedMunicipality, normalizedFeature);
      }) ?? null
    );
  }

  private getMunicipalityName(feature: GeoJsonFeature): string {
    return this.readString(feature.properties['MPIO_CNMBR']) || 'Sin nombre';
  }

  private getMunicipalityDepartmentCode(feature: GeoJsonFeature): string {
    return this.readString(feature.properties['DPTO_CCDGO']);
  }

  private getMunicipalityCode(feature: GeoJsonFeature): string {
    const departmentCode = this.getMunicipalityDepartmentCode(feature);
    const municipalityCode = this.readString(feature.properties['MPIO_CCDGO']);
    return `${departmentCode}${municipalityCode}`;
  }

  private readString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value).trim();
    }

    return '';
  }

  private getLabelScale(name: string): number {
    const length = this.normalizeText(name).length;
    if (length > 36) {
      return 0.42;
    }
    if (length > 30) {
      return 0.5;
    }
    if (length > 24) {
      return 0.62;
    }
    if (length > 18) {
      return 0.76;
    }
    return 0.95;
  }

  private getLabelOffset(name: string): { dx: number; dy: number } {
    const length = this.normalizeText(name).length;
    if (length > 34) {
      return { dx: 0, dy: -6 };
    }
    if (length > 28) {
      return { dx: 0, dy: -5 };
    }
    if (length > 22) {
      return { dx: 0, dy: -4 };
    }
    return { dx: 0, dy: 0 };
  }

  private getMunicipalityLabelScale(name: string): number {
    const length = this.normalizeText(name).length;
    if (length > 34) {
      return 0.42;
    }
    if (length > 26) {
      return 0.52;
    }
    if (length > 20) {
      return 0.62;
    }
    return 0.72;
  }

  private getMunicipalityLabelOffset(name: string): { dx: number; dy: number } {
    const length = this.normalizeText(name).length;
    if (length > 28) {
      return { dx: 0, dy: 8 };
    }
    if (length > 20) {
      return { dx: 0, dy: 6 };
    }
    return { dx: 0, dy: 4 };
  }

  private selectionSignature(): string {
    const departamentos = [...(this.departamentos || [])]
      .map((item) => this.normalizeText(item))
      .filter(Boolean)
      .sort()
      .join(',');

    return [
      this.normalizeText(this.departamento),
      departamentos,
      this.normalizeText(this.municipio),
      this.showMunicipalities ? 'municipios-on' : 'municipios-off'
    ].join('|');
  }

  private computeFitTransform(
    pathGenerator: any,
    selectedDepartmentCodes: Set<string>,
    selectedMunicipalityCodes: Set<string>
  ): FitTransformResult {
    const selectedMunicipalityFeatures = this.municipalitiesData?.features.filter((feature) =>
      selectedMunicipalityCodes.has(this.getMunicipalityCode(feature))
    ) ?? [];
    const selectedDepartmentFeatures = this.departmentsData?.features.filter((feature) =>
      selectedDepartmentCodes.has(this.getDepartmentCode(feature))
    ) ?? [];

    const selectedFeatures = [
      ...selectedDepartmentFeatures,
      ...selectedMunicipalityFeatures
    ];
    const featuresToFit = selectedFeatures.length
      ? selectedFeatures
      : (this.departmentsData?.features ?? []);

    if (!featuresToFit.length) {
      return {
        transform: '',
        centerX: MAP_WIDTH / 2,
        centerY: MAP_HEIGHT / 2
      };
    }

    const bounds = featuresToFit.reduce<BoundingBox | null>((acc, feature) => {
      const featureBounds = pathGenerator.bounds(feature as any) as [[number, number], [number, number]];
      const current: BoundingBox = {
        x0: featureBounds[0][0],
        y0: featureBounds[0][1],
        x1: featureBounds[1][0],
        y1: featureBounds[1][1]
      };

      if (!acc) {
        return current;
      }

      return {
        x0: Math.min(acc.x0, current.x0),
        y0: Math.min(acc.y0, current.y0),
        x1: Math.max(acc.x1, current.x1),
        y1: Math.max(acc.y1, current.y1)
      };
    }, null);

    if (!bounds) {
      return {
        transform: '',
        centerX: MAP_WIDTH / 2,
        centerY: MAP_HEIGHT / 2
      };
    }

    const selectionCount = selectedDepartmentFeatures.length + selectedMunicipalityFeatures.length;
    const padding = selectionCount > 1 ? 10 : selectedMunicipalityFeatures.length ? 16 : selectedDepartmentCodes.size === 1 ? 14 : 24;
    const bboxWidth = Math.max(bounds.x1 - bounds.x0, 1);
    const bboxHeight = Math.max(bounds.y1 - bounds.y0, 1);
    const rawScale = Math.min(
      (MAP_WIDTH - padding * 2) / bboxWidth,
      (MAP_HEIGHT - padding * 2) / bboxHeight
    );
    const scale = selectionCount > 1 ? rawScale : rawScale;
    const translateX = (MAP_WIDTH - bboxWidth * scale) / 2 - bounds.x0 * scale;
    const translateY = (MAP_HEIGHT - bboxHeight * scale) / 2 - bounds.y0 * scale;

    return {
      transform: `translate(${translateX} ${translateY}) scale(${scale})`,
      centerX: (bounds.x0 + bounds.x1) / 2,
      centerY: (bounds.y0 + bounds.y1) / 2
    };
  }

  private getInitialZoomLevel(): number {
    const selectedDepartmentCount = this.selectedDepartmentCodes().size;
    const selectedMunicipalityCount = this.selectedMunicipalityCodes().size;

    if (selectedMunicipalityCount === 1) {
      return 0.8;
    }

    if (selectedDepartmentCount === 1) {
      return 0.8;
    }

    if (selectedDepartmentCount > 1 || selectedMunicipalityCount > 1) {
      return 1;
    }

    return 0.32;
  }

  /**
   * Mantiene el mapa visible dentro del viewBox.
   * La cartografía ya fue ajustada con `baseMapTransform` para caber en el frame;
   * el pan solo debe permitir "mover un poco" sin perder el mapa completo.
   */
  private ensurePanInBounds(): void {
    const scale = Math.max(this.zoomLevel, 0.0001);
    const maxPanX = (MAP_WIDTH * (scale - 1)) / scale;
    const maxPanY = (MAP_HEIGHT * (scale - 1)) / scale;

    if (scale <= 1) {
      // Si estamos en zoom out, no permitimos desplazar y perder el mapa.
      this.panX = 0;
      this.panY = 0;
      return;
    }

    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
  }

  private recenterZoomOnSelection(): void {
    // Al hacer zoom por botones, el pivote debe ser el territorio seleccionado.
    this.zoomCenterX = this.selectionCenterX;
    this.zoomCenterY = this.selectionCenterY;
    // Evita que la selección se "pierda" si hubo pan previo.
    this.panX = 0;
    this.panY = 0;
  }

  private ensureMunicipalityColors(ids: string[]): void {
    const unique = [...new Set(ids.map((id) => (id || '').trim()).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b, 'es-CO', { sensitivity: 'base' }));

    // Recalcula colores para el conjunto visible para evitar repeticiones.
    // (Garantiza colores únicos aunque haya colisiones por hash / reordenamientos.)
    this.municipalityColorMap.clear();
    for (let i = 0; i < unique.length; i += 1) {
      const id = unique[i];
      const hue = (i * 137.508) % 360; // golden angle: separación visual fuerte
      this.municipalityColorMap.set(id, `hsl(${hue.toFixed(1)}, 82%, 45%)`);
    }
  }

  private getMunicipalityColor(id: string): string {
    const safe = (id || '').trim();
    if (!safe) {
      return 'hsl(330, 80%, 45%)';
    }
    return this.municipalityColorMap.get(safe) || 'hsl(330, 80%, 45%)';
  }

  private hueFromHsl(hsl: string): number {
    const match = hsl.match(/hsl\(([-\\d.]+)/i);
    if (!match) {
      return 330;
    }
    const hue = Number(match[1]);
    return Number.isFinite(hue) ? hue : 330;
  }

  // Nota: ya no usamos hash → evitamos colisiones/repetición.

  private hslToHex(h: number, s: number, l: number): string {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const lig = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lig - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
