import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterDrawerComponent, type FilterDrawerValues } from '../../shared/components/filter-drawer/filter-drawer.component';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';
import { PactosService, type PactoTablaDto, type PactoTablaFilterOptions } from '../../core/services/pactos.service';

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
  imports: [CommonModule, FilterDrawerComponent, DepartamentoMapComponent],
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

  pactosFiltrados: PactoTablaDto[] = [];
  private pactosBase: PactoTablaDto[] = [];

  /** Opciones de filtros derivadas de los mismos registros que alimentan la tabla. */
  filterEtapas: string[] = [];
  filterTiposPacto: string[] = [];
  filterDepartamentos: string[] = [];

  // Recibe los filtros del componente de filtros y actualiza la vista.
  onFiltersChange(values: FilterDrawerValues): void {
    this.activeFilters = values;
    this.applyFilters();
  }

  // Si hay departamento elegido, el mapa se centra allí; si no, muestra Colombia.
  get departamentoMapa(): string {
    return this.activeFilters.departamento;
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
    handshake: 'bi-handshake-fill',
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
      icon: 'handshake',
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
  carouselImages = [
    {
      src: '/assets/carousel/slide-01.jpg',
      alt: 'Proyecto de infraestructura',
      caption: 'Proyecto de infraestructura comunitaria'
    },
    {
      src: '/assets/carousel/slide-02.jpg',
      alt: 'Comunidad participando',
      caption: 'Participación de la comunidad en proyectos sociales'
    },
    {
      src: '/assets/carousel/slide-03.jpeg',
      alt: 'Educación y desarrollo',
      caption: 'Iniciativas de educación y desarrollo local'
    }
  ];

  currentCarousel = 0;
  carouselInterval: any;

  ngOnInit() {
    this.loadPactosTablaAndFilters();

    // Aleatorizar imágenes al cargar
    this.carouselImages = this.shuffleArray(this.carouselImages);
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
    this.currentCarousel = (this.currentCarousel + 1) % this.carouselImages.length;
  }

  prevCarousel() {
    this.currentCarousel = (this.currentCarousel - 1 + this.carouselImages.length) % this.carouselImages.length;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pactosService: PactosService
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
}
