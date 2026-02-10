import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const PAGE_DATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Home',
    description: 'Resumen general del tablero.'
  },
  'acerca-de': {
    title: 'Acerca de',
    description: 'Informacion general del portal DNP.'
  },
  'pacto-territorial': {
    title: 'Pacto territorial',
    description: 'Panorama de acuerdos y actores territoriales.'
  },
  proyectos: {
    title: 'Proyectos',
    description: 'Listado y seguimiento de proyectos clave.'
  },
  financiero: {
    title: 'Financiero',
    description: 'Estado financiero y reportes principales.'
  },
  'plan-accion': {
    title: 'Plan de accion',
    description: 'Linea de tiempo y tareas en curso.'
  },
  avances: {
    title: 'Avances',
    description: 'Indicadores de progreso por frente.'
  },
  contratos: {
    title: 'Contratos',
    description: 'Gestion contractual y documentos asociados.'
  },
  compromisos: {
    title: 'Compromisos',
    description: 'Seguimiento a compromisos vigentes.'
  },
  mapas: {
    title: 'Mapas',
    description: 'Visualizacion geografica de los datos.'
  },
  'tablero-mando': {
    title: 'Tablero de mando',
    description: 'Indicadores estrategicos y alertas.'
  },
  'herramientas-sesion': {
    title: 'Herramientas (sesion)',
    description: 'Accesos rapidos y utilidades de sesion.'
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
  pageTitle = 'Home';
  pageDescription = 'Resumen general del tablero.';

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe((params) => {
      const key = params.get('page') ?? 'home';
      const data = PAGE_DATA[key] ?? {
        title: 'Seccion',
        description: 'Contenido disponible pronto.'
      };
      this.pageTitle = data.title;
      this.pageDescription = data.description;
    });
  }
}
