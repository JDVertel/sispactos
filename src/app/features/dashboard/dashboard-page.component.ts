import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FilterDrawerComponent, type FilterDrawerValues } from '../../shared/components/filter-drawer/filter-drawer.component';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';

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
export class DashboardPageComponent {
  // Texto principal que se muestra en la parte superior de la página.
  pageTitle = 'SISPACTOS';
  pageDescription = 'Resumen general.';
  currentPage = 'home';
  selectedCardLabel = 'Pactos Territoriales';

  // Aquí guardamos los filtros que el usuario elige en el panel lateral.
  activeFilters: FilterDrawerValues = { etapa: '', pacto: '', departamento: '' };
  // Sirve para adaptar el orden de los bloques cuando la pantalla es pequeña.
  isResponsiveView = false;

  // Datos de ejemplo para poblar la tabla de pactos en Home.
  pactosTabla: PactoFila[] = [
    {
      nombrePacto: 'Pacto Territorial Caribe',
      fechaSubscripcion: '2021-03-15',
      fechaVencimiento: '2027-03-15',
      etapa: 'Ejecución',
      valorIndicativo: 520000000,
      presupuestoComprometido: 330000000,
      avanceComprometido: 64,
      departamento: 'Atlántico',
      tipoPacto: 'Pacto Territorial'
    },
    {
      nombrePacto: 'Contrato Plan Santander',
      fechaSubscripcion: '2020-08-10',
      fechaVencimiento: '2026-12-30',
      etapa: 'Ejecución',
      valorIndicativo: 610000000,
      presupuestoComprometido: 470000000,
      avanceComprometido: 77,
      departamento: 'Santander',
      tipoPacto: 'Contrato Plan'
    },
    {
      nombrePacto: 'Pacto de Borde Nariño',
      fechaSubscripcion: '2022-05-21',
      fechaVencimiento: '2028-05-21',
      etapa: 'Suscripción',
      valorIndicativo: 300000000,
      presupuestoComprometido: 90000000,
      avanceComprometido: 31,
      departamento: 'Nariño',
      tipoPacto: 'Pacto de Borde'
    },
    {
      nombrePacto: 'Pacto Subregional Antioquia Norte',
      fechaSubscripcion: '2019-11-05',
      fechaVencimiento: '2025-11-05',
      etapa: 'Terminado',
      valorIndicativo: 415000000,
      presupuestoComprometido: 415000000,
      avanceComprometido: 100,
      departamento: 'Antioquia',
      tipoPacto: 'Pacto Subregional'
    },
    {
      nombrePacto: 'Pacto Metropolitano Centro',
      fechaSubscripcion: '2023-01-30',
      fechaVencimiento: '2029-01-30',
      etapa: 'Negociación',
      valorIndicativo: 250000000,
      presupuestoComprometido: 52000000,
      avanceComprometido: 18,
      departamento: 'Cundinamarca',
      tipoPacto: 'Pacto Metropolitano'
    }
  ];

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
      size: 'medium',
      isWide: false
    },
    {
      icon: 'currency',
      label: 'Valor Indicativo',
      value: '$2.5B',
      size: 'medium',
      isWide: false
    },
    {
      icon: 'building',
      label: 'Área Metropolitana',
      value: '8',
      size: 'small',
      isWide: false
    },
    {
      icon: 'map-marker',
      label: 'Departamentos',
      value: '32',
      size: 'small',
      isWide: false
    },
    {
      icon: 'city',
      label: 'Municipios',
      value: '1,103',
      size: 'small',
      isWide: false
    },
    {
      icon: 'folder-open',
      label: 'Proyectos',
      value: '247',
      size: 'medium',
      isWide: false
    },
    {
      icon: 'check-circle',
      label: 'Proyectos en Ejecución/Terminados',
      value: '156',
      size: 'wide',
      isWide: true
    },
    {
      icon: 'users',
      label: 'Habitantes del Área de Influencia',
      value: '24.5M',
      size: 'large',
      isWide: true
    },
    {
      icon: 'progress',
      label: 'Avance Comprometido/Indicativo',
      value: '68%',
      size: 'medium',
      isWide: true
    },
    {
      icon: 'wallet-check',
      label: 'Presupuesto Comprometido',
      value: '$1.7B',
      size: 'medium',
      isWide: true
    }
  ];

  constructor(private route: ActivatedRoute) {
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
