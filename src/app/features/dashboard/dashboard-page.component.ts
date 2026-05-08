import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterDrawerComponent, type FilterDrawerValues } from '../../shared/components/filter-drawer/filter-drawer.component';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';
import { AuthService } from '../../core/services/auth.service';
import { PactosService, type PactoTablaDto, type PactoTablaFilterOptions } from '../../core/services/pactos.service';

type CarouselImage = {
  src: string;
  alt: string;
  caption?: string;
};

type CompromisoEstado = 'No iniciado' | 'En trámite' | 'Cumplido';

type CompromisoTabla = {
  id: string;
  pacto: string;
  autor: string;
  instancia: string;
  noSesion: string;
  fechaSesion: string; // YYYY-MM-DD
  compromiso: string;
  fechaCumplimiento: string; // YYYY-MM-DD
  responsable: string;
  estado: CompromisoEstado;
};

const FALLBACK_CAROUSEL_FILES: string[] = [
  'slide-01.jpg',
  'slide-02.jpg',
  'slide-03.jpeg',
  'slide-04.jpg',
  'slide-05.jpeg',
  'slide-06.jpeg',
  'slide-07.jpeg',
  'slide-08.jpg',
  'slide-09.jpeg',
  'slide-010.jpeg'
];

const PAGE_DATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'SISPACTOS',
    description: ''
  },
  'acerca-de': {
    title: 'Acerca de',
    description: 'Informacion general del portal DNP.'
  },
  'pacto-territorial': {
    title: 'Pacto territorial',
    description: 'Panorama de acuerdos y actores territoriales.'
  },
  alertas:{
    title: 'Alertas',
    description: 'Notificaciones y alertas recientes.'
  },
  'proyectos-nacion-territorio': {
    title: 'Proyectos Nación Territorio',
    description: 'Proyectos de la estrategia Nación Territorio.'
  },
  'proyectos-frpt': {
    title: 'Proyectos FRPT',
    description: 'Proyectos del Fondo de Reactivación de Pactos Territoriales.'
  },
  financiero: {
    title: 'Financiero',
    description: 'Estado financiero y reportes principales.'
  },
  pei:{
    title: 'PEI',
    description: 'Plan Estratégico Institucional y avances.'
  },
  'plan-accion': {
    title: 'Plan de accion',
    description: 'Linea de tiempo y tareas en curso.'
  },
  avances: {
    title: 'Avances',
    description: 'Indicadores de progreso por frente.'
  },
  'proyectos-cp': {
    title: 'Proyectos CP',
    description: 'Proyectos del Contrato Plan.'
  },
  'proyectos-frcp': {
    title: 'Proyectos FRCP',
    description: 'Proyectos del Fondo de Reactivación del Contrato Plan.'
  },
  'compromisos-pactos': {
    title: 'Compromisos - Pactos',
    description: 'Seguimiento a compromisos de pactos territoriales.'
  },
  'compromisos-proyectos': {
    title: 'Compromisos - Proyectos',
    description: 'Seguimiento a compromisos de proyectos.'
  },
  mapas: {
    title: 'Mapas',
    description: 'Visualizacion geografica de los datos.'
  },
  reportes: {
    title: 'Reportes',
    description: 'Informes y análisis detallados del sistema.'
  },
  'tablero-mando': {
    title: 'Tablero de mando',
    description: 'Indicadores estrategicos y alertas.'
  },
  administracion: {
    title: 'Administracion',
    description: 'Configuracion y gestion interna.'
  },
  ayudas: {
    title: 'Ayudas',
    description: 'Soporte y preguntas frecuentes.'
  }
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterDrawerComponent, DepartamentoMapComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  // Texto principal que se muestra en la parte superior de la página.
  pageTitle = 'SISPACTOS';
  pageDescription = 'Resumen general.';
  currentPage = 'home';
  selectedCardLabel = 'Pactos Territoriales';

  // Aquí guardamos los filtros que el usuario elige en el panel lateral.
  activeFilters: FilterDrawerValues = { etapa: '', pacto: '', departamento: '' };
  // Sirve para adaptar el orden de los bloques cuando la pantalla es pequeña.
  isResponsiveView = false;
  isLoadingPactos = false;
  pactosError = '';
  private readonly destroy$ = new Subject<void>();
  pactoSeleccionado: PactoTablaDto | null = null;
  private userSelectedPacto = false;

  pactosFiltrados: PactoTablaDto[] = [];
  private pactosBase: PactoTablaDto[] = [];
  private readonly departmentTooltipMapCache: Record<string, { pactoNombre: string; valorIndicativo: number }> = {};

  /** Opciones de filtros derivadas de los mismos registros que alimentan la tabla. */
  filterEtapas: string[] = [];
  filterTiposPacto: string[] = [];
  filterDepartamentos: string[] = [];

  // Recibe los filtros del componente de filtros y actualiza la vista.
  onFiltersChange(values: FilterDrawerValues): void {
    this.activeFilters = values;
    this.applyFilters();
  }

  get departamentosMapaHome(): string[] {
    // Si el usuario seleccionó un pacto, el mapa refleja ese pacto.
    if (this.userSelectedPacto && this.pactoSeleccionado?.alcance) {
      const departamentos = this.extractDepartamentosFromAlcance(this.pactoSeleccionado.alcance);
      if (departamentos.length) {
        return departamentos;
      }
    }

    // Estado inicial: resaltar todos los departamentos presentes en los pactos cargados.
    const departamentos = new Set<string>();
    for (const pacto of this.pactosBase) {
      const direct = (pacto.departamento || '').trim();
      if (direct && direct !== 'N/A') {
        departamentos.add(direct);
      }
      for (const dep of this.extractDepartamentosFromAlcance(pacto.alcance)) {
        if (dep && dep !== 'N/A') {
          departamentos.add(dep);
        }
      }
    }

    // Si hay un filtro explícito, lo respetamos.
    const filtroDepartamento = (this.activeFilters.departamento || '').trim();
    if (filtroDepartamento) {
      return [filtroDepartamento];
    }

    return [...departamentos];
  }

  get tooltipDepartamentosMapaHome(): Record<string, { pactoNombre: string; valorIndicativo: number }> {
    // Recalcula a partir de los pactos visibles (base cargada). Es suficiente para tooltip.
    // (No hace requests; sólo arma un mapa "dpto -> mejor pacto".)
    const map: Record<string, { pactoNombre: string; valorIndicativo: number }> = {};

    const chooseBetter = (a: PactoTablaDto, b: PactoTablaDto): PactoTablaDto => {
      // Preferimos mayor valor indicativo; si empatan, el de mayor presupuesto comprometido.
      if ((b.valorIndicativo ?? 0) !== (a.valorIndicativo ?? 0)) {
        return (b.valorIndicativo ?? 0) > (a.valorIndicativo ?? 0) ? b : a;
      }
      return (b.presupuestoComprometido ?? 0) > (a.presupuestoComprometido ?? 0) ? b : a;
    };

    const normalizeKey = (v: string) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    for (const pacto of this.pactosBase || []) {
      const departamentos = new Set<string>();
      const direct = (pacto.departamento || '').trim();
      if (direct && direct !== 'N/A') {
        departamentos.add(direct);
      }
      for (const dep of this.extractDepartamentosFromAlcance(pacto.alcance)) {
        if (dep && dep !== 'N/A') {
          departamentos.add(dep);
        }
      }

      for (const dep of departamentos) {
        const key = normalizeKey(dep);
        if (!key) continue;

        const currentKey = Object.keys(map).find((k) => normalizeKey(k) === key);
        if (!currentKey) {
          map[dep] = { pactoNombre: pacto.nombrePacto, valorIndicativo: pacto.valorIndicativo ?? 0 };
          continue;
        }

        const currentPacto = (this.pactosBase || []).find((p) => p.nombrePacto === map[currentKey].pactoNombre) ?? pacto;
        const best = chooseBetter(currentPacto, pacto);
        map[currentKey] = { pactoNombre: best.nombrePacto, valorIndicativo: best.valorIndicativo ?? 0 };
      }
    }

    // Cache por si lo reusa el template con mismo objeto.
    Object.assign(this.departmentTooltipMapCache, map);
    return map;
  }

  // Da formato de moneda para que los valores se lean de forma clara.
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value);
  }

  // Define el color de la barra de avance según el porcentaje.
  getAvanceClass(value: number): string {
    if (value < 40) return 'avance-low';
    if (value < 70) return 'avance-mid';
    return 'avance-high';
  }

  // Relación entre nombre de ícono y su clase visual.
  iconClassMap: Partial<Record<string, string>> = {
    // Nota: en algunas versiones de Bootstrap Icons no existe `bi-handshake-fill`.
    // Usamos `bi-handshake` para asegurar que el ícono se renderice.
    handshake: 'bi-handshake',
    // Mismo ícono que el menú lateral para Pactos Territoriales.
    pin: 'bi-geo-alt',
    currency: 'bi-cash-stack',
    building: 'bi-buildings-fill',
    'map-marker': 'bi-geo-alt-fill',
    city: 'bi-building-fill',
    'folder-open': 'bi-folder2-open',
    'check-circle': 'bi-check-circle-fill',
    users: 'bi-people-fill',
    progress: 'bi-graph-up-arrow',
    'wallet-check': 'bi-wallet2'
  };

  // Tarjetas de resumen que se ven en la parte superior del Home.
  dashboardCards = [
    {
      icon: 'pin',
      label: 'Pactos Territoriales',
      value: '16',
      type: 'cantidad',
      size: 'medium',
      isWide: false
    },
    {
      icon: 'currency',
      label: 'Valor Indicativo',
      value: '$2.5B',
      type: 'valor',
      size: 'medium',
      isWide: false
    },
    {
      icon: 'folder-open',
      label: 'Proyectos',
      value: '247',
      type: 'cantidad',
      size: 'medium',
      isWide: false
    },
    {
      icon: 'check-circle',
      label: 'Proyectos en Ejecución/Terminados',
      value: '156',
      type: 'cantidad',
      size: 'wide',
      isWide: true
    },
    {
      icon: 'progress',
      label: 'Avance Comprometido/Indicativo',
      value: '68%',
      type: 'porcentaje',
      size: 'medium',
      isWide: true
    },
    {
      icon: 'wallet-check',
      label: 'Presupuesto Comprometido',
      value: '$1.7B',
      type: 'valor',
      size: 'medium',
      isWide: true
    }
  ];

  /**
   * Imagenes JPG/JPEG desde src/assets/carousel/ (servidas como /assets/carousel/...).
   * Ver src/assets/carousel/LEEME.txt.
   */
  carouselImages: CarouselImage[] = this.loadCarouselImagesFromAssets();
  carouselSlides: CarouselImage[][] = [];
  private carouselChunkSize = 2;

  currentCarousel = 0;
  carouselInterval: any;
  previewImage: { src: string; alt: string } | null = null;

  // Compromisos - Pactos (pagina: dashboard/compromisos-pactos)
  compromisos: CompromisoTabla[] = [
    {
      id: 'cp-1',
      pacto: 'Pacto Caribe',
      autor: 'Usuario SISPACTOS',
      instancia: 'Mesa técnica',
      noSesion: '001',
      fechaSesion: '2025-02-15',
      compromiso: 'Entregar cronograma de obra.',
      fechaCumplimiento: '2025-03-30',
      responsable: 'INVIAS',
      estado: 'En trámite'
    },
    {
      id: 'cp-2',
      pacto: 'Pacto Caribe',
      autor: 'Usuario SISPACTOS',
      instancia: 'Comité directivo',
      noSesion: '002',
      fechaSesion: '2025-04-10',
      compromiso: 'Radicar soporte financiero.',
      fechaCumplimiento: '2025-05-20',
      responsable: 'Gobernación',
      estado: 'No iniciado'
    }
  ];

  filtrosCompromisosPactos = {
    pacto: '',
    instancia: '',
    responsable: '',
    estado: '' as '' | CompromisoEstado,
    fechaCumplimientoDesde: '',
    fechaCumplimientoHasta: ''
  };

  showNuevoCompromisoPactosModal = false;
  nuevoCompromisoPactosForm: Omit<CompromisoTabla, 'id' | 'autor'> = {
    pacto: '',
    instancia: '',
    noSesion: '',
    fechaSesion: '',
    compromiso: '',
    fechaCumplimiento: '',
    responsable: '',
    estado: 'No iniciado'
  };

  get autorSesion(): string {
    return this.authService.getCurrentUser()?.username || 'Usuario SISPACTOS';
  }

  get hasAuthenticatedSession(): boolean {
    return this.authService.hasValidUserSession();
  }

  openNuevoCompromisoPactosModal(): void {
    this.showNuevoCompromisoPactosModal = true;
  }

  closeNuevoCompromisoPactosModal(): void {
    this.showNuevoCompromisoPactosModal = false;
  }

  limpiarFiltrosCompromisosPactos(): void {
    this.filtrosCompromisosPactos = {
      pacto: '',
      instancia: '',
      responsable: '',
      estado: '',
      fechaCumplimientoDesde: '',
      fechaCumplimientoHasta: ''
    };
  }

  get opcionesCompromisosPactosPacto(): string[] {
    // Preferimos los pactos cargados desde API; si aún no están, caemos a los pactos de los registros.
    const fromApi = this.uniqueSortedFieldValues((this.pactosBase ?? []).map((p) => p.nombrePacto));
    if (fromApi.length) return fromApi;
    return this.uniqueSortedFieldValues(this.compromisos.map((c) => c.pacto));
  }

  get opcionesCompromisosPactosInstancia(): string[] {
    return this.uniqueSortedFieldValues(this.compromisos.map((c) => c.instancia));
  }

  get opcionesCompromisosPactosResponsable(): string[] {
    return this.uniqueSortedFieldValues(this.compromisos.map((c) => c.responsable));
  }

  get compromisosPactosFiltrados(): CompromisoTabla[] {
    const base = this.compromisos;
    if (!base.length) return [];

    const f = this.filtrosCompromisosPactos;
    const desde = f.fechaCumplimientoDesde ? new Date(f.fechaCumplimientoDesde) : null;
    const hasta = f.fechaCumplimientoHasta ? new Date(f.fechaCumplimientoHasta) : null;

    return base.filter((c) => {
      const byPacto = !f.pacto || c.pacto === f.pacto;
      const byInstancia = !f.instancia || c.instancia === f.instancia;
      const byResp = !f.responsable || c.responsable === f.responsable;
      const byEstado = !f.estado || c.estado === f.estado;

      const fecha = c.fechaCumplimiento ? new Date(c.fechaCumplimiento) : null;
      const byDesde = !desde || (fecha && fecha >= desde);
      const byHasta = !hasta || (fecha && fecha <= hasta);

      return byPacto && byInstancia && byResp && byEstado && byDesde && byHasta;
    });
  }

  get resumenCompromisosPactosCards(): Array<{ label: string; value: number; color: string }> {
    const base = this.compromisosPactosFiltrados;
    const total = base.length;
    const noIniciados = base.filter((c) => c.estado === 'No iniciado').length;
    const enTramite = base.filter((c) => c.estado === 'En trámite').length;
    const cumplidos = base.filter((c) => c.estado === 'Cumplido').length;
    return [
      { label: 'Total compromisos', value: total, color: '#00a2a0' },
      { label: 'No iniciados', value: noIniciados, color: '#ffbf39' },
      { label: 'En trámite', value: enTramite, color: '#2ea3ff' },
      { label: 'Cumplidos', value: cumplidos, color: '#66bb6a' }
    ];
  }

  guardarNuevoCompromisoPactos(): void {
    const form = this.nuevoCompromisoPactosForm;
    const requiredOk =
      !!form.pacto.trim()
      !!form.instancia.trim()
      && !!form.noSesion.trim()
      && !!form.fechaSesion.trim()
      && !!form.compromiso.trim()
      && !!form.fechaCumplimiento.trim()
      && !!form.responsable.trim()
      && !!form.estado;

    if (!requiredOk) return;

    const next: CompromisoTabla = {
      id: `cp-${Date.now()}`,
      autor: this.autorSesion,
      ...form,
      instancia: form.instancia.trim(),
      noSesion: form.noSesion.trim(),
      compromiso: form.compromiso.trim(),
      responsable: form.responsable.trim()
    };

    this.compromisos = [next, ...this.compromisos];

    this.nuevoCompromisoPactosForm = {
      pacto: '',
      instancia: '',
      noSesion: '',
      fechaSesion: '',
      compromiso: '',
      fechaCumplimiento: '',
      responsable: '',
      estado: 'No iniciado'
    };

    this.closeNuevoCompromisoPactosModal();
  }

  ngOnInit() {
    this.loadPactosTablaAndFilters();

    // Aleatorizar imágenes al cargar
    this.carouselImages = this.shuffleArray(this.carouselImages);
    this.updateCarouselLayout();
    // Avance automático
    this.carouselInterval = setInterval(() => {
      this.nextCarousel();
    }, 4000);
  }

  ngOnDestroy() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  shuffleArray(array: any[]) {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  nextCarousel() {
    if (!this.carouselSlides.length) return;
    this.currentCarousel = (this.currentCarousel + 1) % this.carouselSlides.length;
  }

  prevCarousel() {
    if (!this.carouselSlides.length) return;
    this.currentCarousel = (this.currentCarousel - 1 + this.carouselSlides.length) % this.carouselSlides.length;
  }

  openCarouselPreview(img: { src: string; alt: string }): void {
    if (!img?.src) return;
    this.previewImage = { src: img.src, alt: img.alt || 'Imagen' };
  }

  closeCarouselPreview(): void {
    this.previewImage = null;
  }

  @HostListener('window:resize')
  onCarouselResize(): void {
    this.updateCarouselLayout();
  }

  private updateCarouselLayout(): void {
    // En móvil/tablet: 1 imagen por slide. En PC: 2 imágenes por slide.
    const nextChunk = window.innerWidth <= 991 ? 1 : 2;
    if (nextChunk === this.carouselChunkSize && this.carouselSlides.length) {
      return;
    }

    this.carouselChunkSize = nextChunk;
    this.carouselSlides = this.chunkCarouselImages(this.carouselImages, this.carouselChunkSize);
    this.currentCarousel = 0;
  }

  private chunkCarouselImages(images: CarouselImage[], chunkSize: number): CarouselImage[][] {
    const safeChunk = Math.max(1, Math.floor(chunkSize));
    const result: CarouselImage[][] = [];
    for (let i = 0; i < images.length; i += safeChunk) {
      result.push(images.slice(i, i + safeChunk));
    }
    return result;
  }

  private loadCarouselImagesFromAssets(): CarouselImage[] {
    const modules = import.meta.glob('/src/assets/carousel/slide-0*.{jpg,jpeg,png,webp}', {
      eager: true,
      query: '?url',
      import: 'default'
    }) as unknown as Record<string, string>;

    const entries = Object.entries(modules);
    entries.sort(([a], [b]) => this.compareSlidePaths(a, b));

    const resolved = entries.map(([path, url]) => {
      const filename = path.split('/').pop() ?? path;
      const alt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
      return {
        src: url,
        alt,
        caption: ''
      };
    }).filter((img) => !!img.src);

    if (resolved.length) {
      return resolved;
    }

    // Fallback: cuando el glob no devuelve assets (algunos setups), usamos la convención del proyecto.
    return FALLBACK_CAROUSEL_FILES.map((filename) => ({
      src: `/assets/carousel/${filename}`,
      alt: filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim(),
      caption: ''
    }));
  }

  private compareSlidePaths(a: string, b: string): number {
    const nameA = (a.split('/').pop() ?? a).toLowerCase();
    const nameB = (b.split('/').pop() ?? b).toLowerCase();
    const numA = Number((nameA.match(/\d+/)?.[0] ?? '0'));
    const numB = Number((nameB.match(/\d+/)?.[0] ?? '0'));
    if (numA !== numB) return numA - numB;
    return nameA.localeCompare(nameB, 'es-CO', { sensitivity: 'base' });
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pactosService: PactosService,
    private readonly authService: AuthService
  ) {
    // Al iniciar, revisa el tamaño de pantalla para organizar el layout.
    this.updateResponsiveView();

    // Lee la ruta actual para cambiar título y descripción de la sección.
    this.route.paramMap.subscribe((params) => {
      const key = params.get('page') ?? 'home';
      const previousPage = this.currentPage;
      this.currentPage = key;
      const data = PAGE_DATA[key] ?? {
        title: 'Seccion',
        description: 'Contenido disponible pronto.'
      };
      this.pageTitle = data.title;
      this.pageDescription = data.description;

      if (key !== 'home') {
        this.resetPactosViewState();
      }

      // La vista dashboard-page se reutiliza al cambiar entre subrutas.
      // Al regresar a "home" debemos reintentar carga desde API.
      if (key === 'home' && previousPage !== 'home') {
        this.activeFilters = { etapa: '', pacto: '', departamento: '' };
        this.resetPactosViewState();
        this.loadPactosTablaAndFilters();
      }
    });

  }

  onDepartamentoMapaClick(departamento: string): void {
    const dep = (departamento || '').trim();
    if (!dep) return;
    this.router.navigate(['/dashboard/pactos-territoriales'], { queryParams: { departamento: dep } });
  }

  private loadPactosTablaAndFilters(): void {
    this.isLoadingPactos = true;
    this.pactosError = '';

    this.pactosService
      .getPactosTablaFromApi()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: PactoTablaDto[]) => {
          // Si la API responde vacía en un fallo transitorio, conservamos la última data válida.
          if (rows.length === 0 && this.pactosBase.length > 0) {
            this.applyFilters();
            this.isLoadingPactos = false;
            return;
          }

          this.pactosBase = rows;
          this.applyFilterOptions(rows);
          this.applyFilters();
          this.ensureSelectedPacto();
          this.pactosError = '';
          this.isLoadingPactos = false;
        },
        error: () => {
          // Si ya hay datos pintados, no los limpiamos ante un fallo transitorio.
          if (this.pactosBase.length === 0) {
            this.pactosFiltrados = [];
            this.filterEtapas = [];
            this.filterTiposPacto = [];
            this.filterDepartamentos = [];
            this.pactosError = 'No fue posible conectar con el servicio de pactos (API no disponible).';
          }
          this.isLoadingPactos = false;
        }
      });
  }

  private applyFilterOptions(rows: PactoTablaDto[]): void {
    const opts: PactoTablaFilterOptions = {
      etapas: this.uniqueSortedFieldValues(rows.map((r) => r.etapa)),
      tiposPacto: this.uniqueSortedFieldValues(rows.map((r) => r.tipoPacto)),
      departamentos: this.uniqueSortedFieldValues(rows.map((r) => r.departamento))
    };

    this.filterEtapas = opts.etapas;
    this.filterTiposPacto = opts.tiposPacto;
    this.filterDepartamentos = opts.departamentos;
  }

  private applyFilters(): void {
    const etapa = (this.activeFilters.etapa || '').trim();
    const pacto = (this.activeFilters.pacto || '').trim();
    const departamento = (this.activeFilters.departamento || '').trim();

    this.pactosFiltrados = this.pactosBase.filter((item) => {
      const byEtapa = !etapa || item.etapa === etapa;
      const byPacto = !pacto || item.tipoPacto === pacto;
      const byDepartamento = !departamento || item.departamento === departamento;
      return byEtapa && byPacto && byDepartamento;
    });

    this.ensureSelectedPacto();
  }

  private uniqueSortedFieldValues(values: string[]): string[] {
    const normalized = values
      .map((v) => (v || '').trim())
      .filter((v) => v.length > 0);

    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => a.localeCompare(b, 'es-CO', { sensitivity: 'base' }));
    return unique;
  }

  private resetPactosViewState(): void {
    this.pactosBase = [];
    this.pactosFiltrados = [];
    this.pactoSeleccionado = null;
    this.userSelectedPacto = false;
    this.filterEtapas = [];
    this.filterTiposPacto = [];
    this.filterDepartamentos = [];
    this.pactosError = '';
    this.isLoadingPactos = false;
  }

  // Cuando cambia el tamaño de ventana, actualiza el modo responsive.
  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateResponsiveView();
  }

  // Define si la vista se considera móvil/tablet.
  private updateResponsiveView(): void {
    this.isResponsiveView = window.innerWidth <= 980;
  }

  // Marca la tarjeta seleccionada para resaltarla visualmente.
  selectCard(label: string): void {
    this.selectedCardLabel = label;
  }

  // Devuelve el ícono que se debe pintar en cada tarjeta.
  getIconClass(iconName: string): string {
    return this.iconClassMap[iconName] ?? 'bi-bar-chart-fill';
  }

  seleccionarPacto(item: PactoTablaDto): void {
    this.pactoSeleccionado = item;
    this.userSelectedPacto = true;
  }

  private ensureSelectedPacto(): void {
    // Inicialmente NO se selecciona pacto automáticamente.
    if (!this.userSelectedPacto) {
      this.pactoSeleccionado = null;
      return;
    }

    if (this.pactosFiltrados.length === 0) {
      this.pactoSeleccionado = null;
      return;
    }

    if (!this.pactoSeleccionado || !this.pactosFiltrados.includes(this.pactoSeleccionado)) {
      this.pactoSeleccionado = this.pactosFiltrados[0];
    }
  }

  private extractDepartamentosFromAlcance(alcance?: string): string[] {
    const safeAlcance = (alcance || '').trim();
    if (!safeAlcance) {
      return [];
    }

    const departments = new Set<string>();
    const segments = safeAlcance.split('|').map((segment) => segment.trim()).filter(Boolean);

    for (const segment of segments) {
      const normalized = segment
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      if (normalized.startsWith('departamentos:') || normalized.startsWith('departamento:')) {
        const value = segment.includes(':') ? segment.slice(segment.indexOf(':') + 1).trim() : segment.trim();
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => departments.add(item));
      }
    }

    return [...departments];
  }
}
