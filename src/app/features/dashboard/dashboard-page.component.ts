import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterDrawerComponent, type FilterDrawerValues } from '../../shared/components/filter-drawer/filter-drawer.component';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';
import { PactosService, type PactoTablaDto } from '../../core/services/pactos.service';

interface PactoFila {
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

  pactosTabla: PactoFila[] = [];

  // Recibe los filtros del componente de filtros y actualiza la vista.
  onFiltersChange(values: FilterDrawerValues): void {
    this.activeFilters = values;
  }

  // Si hay departamento elegido, el mapa se centra allí; si no, muestra Colombia.
  get departamentoMapa(): string {
    return this.activeFilters.departamento;
  }

  // Esta lista se recalcula para mostrar solo los pactos que cumplen los filtros.
  get pactosFiltrados(): PactoFila[] {
    return this.pactosTabla.filter((pacto) => {
      const byEtapa = !this.activeFilters.etapa || pacto.etapa === this.activeFilters.etapa;
      const byPacto = !this.activeFilters.pacto || pacto.tipoPacto === this.activeFilters.pacto;
      const byDepartamento = !this.activeFilters.departamento || pacto.departamento === this.activeFilters.departamento;
      return byEtapa && byPacto && byDepartamento;
    });
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

  carouselImages = [
    {
      src: 'https://placehold.co/900x320/00c3c1/fff?text=Proyecto+de+Infraestructura',
      alt: 'Proyecto de infraestructura',
      caption: 'Proyecto de infraestructura comunitaria'
    },
    {
      src: 'https://placehold.co/900x320/ffbf39/232323?text=Comunidad+Participando',
      alt: 'Comunidad participando',
      caption: 'Participación de la comunidad en proyectos sociales'
    },
    {
      src: 'https://placehold.co/900x320/232323/ffbf39?text=Educación+y+Desarrollo',
      alt: 'Educación y desarrollo',
      caption: 'Iniciativas de educación y desarrollo local'
    }
  ];

  currentCarousel = 0;
  carouselInterval: any;

  ngOnInit() {
    this.loadPactosTabla();

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
      this.currentPage = key;
      const data = PAGE_DATA[key] ?? {
        title: 'Seccion',
        description: 'Contenido disponible pronto.'
      };
      this.pageTitle = data.title;
      this.pageDescription = data.description;
    });

  }

  private loadPactosTabla(): void {
    this.isLoadingPactos = true;
    this.pactosError = '';

    this.pactosService
      .getPactosTablaFromApi()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: PactoTablaDto[]) => {
          this.pactosTabla = rows;
          this.isLoadingPactos = false;
        },
        error: () => {
          this.pactosTabla = [];
          this.pactosError = 'No fue posible cargar el listado de pactos.';
          this.isLoadingPactos = false;
        }
      });
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
