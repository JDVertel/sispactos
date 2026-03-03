import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const PAGE_DATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'SISPACTOS',
    description: 'Resumen general'
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
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  pageTitle = 'SISPACTOS';
  pageDescription = 'Resumen general.';
  currentPage = 'home';

  dashboardCards = [
    { 
      icon: 'handshake', 
      label: 'Pactos Territoriales', 
      value: '16',
      color: '#3b82f6',
      size: 'medium',
      isWide: false
    },
    { 
      icon: 'currency', 
      label: 'Valor Indicativo', 
      value: '$2.5B',
      color: '#10b981',
      size: 'medium',
      isWide: false
    },
    { 
      icon: 'building', 
      label: 'Área Metropolitana', 
      value: '8',
      color: '#6366f1',
      size: 'small',
      isWide: false
    },
    { 
      icon: 'map-marker', 
      label: 'Departamentos', 
      value: '32',
      color: '#8b5cf6',
      size: 'small',
      isWide: false
    },
    { 
      icon: 'city', 
      label: 'Municipios', 
      value: '1,103',
      color: '#ec4899',
      size: 'small',
      isWide: false
    },
    { 
      icon: 'folder-open', 
      label: 'Proyectos', 
      value: '247',
      color: '#f59e0b',
      size: 'medium',
      isWide: false
    },
    { 
      icon: 'check-circle', 
      label: 'Proyectos en Ejecución/Terminados', 
      value: '156',
      color: '#14b8a6',
      size: 'wide',
      isWide: true
    },
    { 
      icon: 'users', 
      label: 'Habitantes del Área de Influencia', 
      value: '24.5M',
      color: '#06b6d4',
      size: 'large',
      isWide: true
    },
    { 
      icon: 'progress', 
      label: 'Avance Comprometido/Indicativo', 
      value: '68%',
      color: '#84cc16',
      size: 'medium',
      isWide: true
    },
    { 
      icon: 'wallet-check', 
      label: 'Presupuesto Comprometido', 
      value: '$1.7B',
      color: '#22c55e',
      size: 'medium',
      isWide: true
    }
  ];

  constructor(private route: ActivatedRoute) {
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
    
    this.dashboardCards.forEach(card => {
      const labelLength = card.label.length;
      const valueLength = card.value.length;
      if (labelLength > 25 || valueLength > 6) {
        card.isWide = true;
      }
    });
  }
}
