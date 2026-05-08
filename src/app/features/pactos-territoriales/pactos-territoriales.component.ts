import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';
import { PactosService, type PactoTablaDto } from '../../core/services/pactos.service';

interface Pacto {
  id: number;
  nombre: string;
  departamento: string;
  municipio?: string;
  ciudad?: string;
  idTipoPacto?: number;
  tipoPacto?: string;
  descripcion?: string;
  objetivo?: string;
  fechaSuscripcion?: string;
  fechaVencimiento?: string;
  idEtapa?: string;
  alcance?: string;
  urlDocPEI?: string;
  urlDocMinuta?: string;
}

interface AporteDetalle {
  sectorInversion: string;
  tipoOferta: string;
  estadoProyecto: string;
  entidadEjecutora: string;
  totalAporteEstimado: number;
  aporteEstimadoNacion: number;
  aporteEstimadoTerritorio: number;
  aporteEstimadoOtros: number;
  totalAporte: number;
}

interface IniciativaDetalle {
  sectorInversion: string;
  tipoOferta: string;
  estadoProyecto: string;
  entidadAportante: string;
  entidadTerritorioAportante: string;
}

interface IniciativaTabla {
  lineaTematica: string;
  sectorInversion: string;
  nombreProyecto: string;
  inversionTotal: number;
  presupuestoComprometidoTotal: number;
  tipoOferta: string;
  estadoProyecto: string;
  entidadAportante: string;
  entidadTerritorioAportante: string;
}

type ProyectoFuente = 'FRPT' | 'NT';

interface ProyectoTabla {
  fuente: ProyectoFuente;
  sector: string;
  proyecto: string;
  estadoProyecto: 'En ejecución' | 'No iniciado' | 'Terminado';
  nivelEstadoProyecto: string;
  valorIndicativo: number;
  aporteConsolidadoNacion: number;
  aporteIndicativoEntidadesTerritoriales: number;
  aporteIndicativoOtros: number;
  entidadResponsablePei: string;
}

type CompromisoEstado = 'No iniciado' | 'En trámite' | 'Cumplido';

interface CompromisoTabla {
  id: string;
  instancia: string;
  noSesion: string;
  fechaSesion: string; // YYYY-MM-DD
  compromiso: string;
  fechaCumplimiento: string; // YYYY-MM-DD
  responsable: string;
  estado: CompromisoEstado;
}
// ...existing code...

@Component({
  selector: 'app-pactos-territoriales',
  standalone: true,
  imports: [CommonModule, FormsModule, DepartamentoMapComponent],
  templateUrl: './pactos-territoriales.component.html',
  styleUrls: ['./pactos-territoriales.component.css']
})
export class PactosTerritorialesComponent implements OnInit {
  @ViewChild('carouselTrack') carouselTrack!: ElementRef<HTMLElement>;

  tabActivo = 'info';
  etapaSeleccionada = '';
  tipoPactoSeleccionado = '';
  pactos: Pacto[] = [];
  pactoSeleccionado: Pacto | null = null;
  isLoadingPactos = false;
  pactosError = '';
  galeria: Record<number, string[]> = {
    1: [
      'https://placehold.co/300x200/00c3c1/fff?text=Caribe+1',
      'https://placehold.co/300x200/ffbf39/232323?text=Caribe+2',
      'https://placehold.co/300x200/232323/ffbf39?text=Caribe+3'
    ],
    2: [
      'https://placehold.co/300x200/00c3c1/fff?text=Santander+1',
      'https://placehold.co/300x200/ffbf39/232323?text=Santander+2'
    ],
    3: [
      'https://placehold.co/300x200/00c3c1/fff?text=Nariño+1',
      'https://placehold.co/300x200/ffbf39/232323?text=Nariño+2',
      'https://placehold.co/300x200/232323/ffbf39?text=Nariño+3',
      'https://placehold.co/300x200/7F8181/fff?text=Nariño+4'
    ],
    4: [
      'https://placehold.co/300x200/00c3c1/fff?text=Antioquia+1',
      'https://placehold.co/300x200/ffbf39/232323?text=Antioquia+2'
    ],
    5: [
      'https://placehold.co/300x200/00c3c1/fff?text=Pacífico+1',
      'https://placehold.co/300x200/ffbf39/232323?text=Pacífico+2'
    ]
  };
  datosClave: Record<number, any> = {
    1: {
      fechaSuscripcion: '2022-01-15',
      plazoAnios: 7,
      vencimiento: '2029-01-15',
      mesesParaVencimiento: 34,
      porcentajeTiempo: 52,
      totalProyectos: 18,
      valorIndicativo: 250000000,
      aporteNacion: 120000000,
      aporteTerritorio: 130000000,
      ejecucionFisica: 62,
      ejecucionFinanciera: 55,
      valorEjecutado: 120000000,
      valorPorEjecutar: 80000000,
      proyectosEnEjecucion: 7,
      valorEnEjecucion: 45000000,
      proyectosTerminados: 6,
      proyectosNoIniciados: 5,
      valorNoIniciados: 35000000,
      comprometidoSector: 50000000,
      comprometidoDnpFrpt: 32000000,
      comprometidoTerritorio: 28000000,
      comprometidoAportesOtros: 10000000
    },
    2: {
      fechaSuscripcion: '2021-06-10',
      plazoAnios: 6,
      vencimiento: '2027-06-10',
      mesesParaVencimiento: 15,
      porcentajeTiempo: 80,
      totalProyectos: 12,
      valorIndicativo: 180000000,
      aporteNacion: 90000000,
      aporteTerritorio: 90000000,
      ejecucionFisica: 70,
      ejecucionFinanciera: 60,
      valorEjecutado: 100000000,
      valorPorEjecutar: 80000000,
      proyectosEnEjecucion: 4,
      valorEnEjecucion: 30000000,
      proyectosTerminados: 5,
      proyectosNoIniciados: 3,
      valorNoIniciados: 25000000,
      comprometidoSector: 38000000,
      comprometidoDnpFrpt: 24000000,
      comprometidoTerritorio: 22000000,
      comprometidoAportesOtros: 9000000
    },
    3: {
      fechaSuscripcion: '2023-03-20',
      plazoAnios: 5,
      vencimiento: '2028-03-20',
      mesesParaVencimiento: 24,
      porcentajeTiempo: 30,
      totalProyectos: 9,
      valorIndicativo: 95000000,
      aporteNacion: 50000000,
      aporteTerritorio: 45000000,
      ejecucionFisica: 48,
      ejecucionFinanciera: 40,
      valorEjecutado: 40000000,
      valorPorEjecutar: 55000000,
      proyectosEnEjecucion: 3,
      valorEnEjecucion: 18000000,
      proyectosTerminados: 2,
      proyectosNoIniciados: 4,
      valorNoIniciados: 22000000,
      comprometidoSector: 15000000,
      comprometidoDnpFrpt: 12000000,
      comprometidoTerritorio: 8000000,
      comprometidoAportesOtros: 4000000
    },
    4: {
      fechaSuscripcion: '2020-09-01',
      plazoAnios: 8,
      vencimiento: '2028-09-01',
      mesesParaVencimiento: 29,
      porcentajeTiempo: 65,
      totalProyectos: 15,
      valorIndicativo: 210000000,
      aporteNacion: 110000000,
      aporteTerritorio: 100000000,
      ejecucionFisica: 80,
      ejecucionFinanciera: 75,
      valorEjecutado: 160000000,
      valorPorEjecutar: 50000000,
      proyectosEnEjecucion: 4,
      valorEnEjecucion: 26000000,
      proyectosTerminados: 9,
      proyectosNoIniciados: 2,
      valorNoIniciados: 12000000,
      comprometidoSector: 60000000,
      comprometidoDnpFrpt: 40000000,
      comprometidoTerritorio: 30000000,
      comprometidoAportesOtros: 12000000
    },
    5: {
      fechaSuscripcion: '2024-02-10',
      plazoAnios: 6,
      vencimiento: '2030-02-10',
      mesesParaVencimiento: 47,
      porcentajeTiempo: 10,
      totalProyectos: 11,
      valorIndicativo: 150000000,
      aporteNacion: 70000000,
      aporteTerritorio: 80000000,
      ejecucionFisica: 20,
      ejecucionFinanciera: 15,
      valorEjecutado: 20000000,
      valorPorEjecutar: 130000000,
      proyectosEnEjecucion: 3,
      valorEnEjecucion: 22000000,
      proyectosTerminados: 1,
      proyectosNoIniciados: 7,
      valorNoIniciados: 85000000,
      comprometidoSector: 18000000,
      comprometidoDnpFrpt: 13000000,
      comprometidoTerritorio: 9000000,
      comprometidoAportesOtros: 5000000
    }
  };

  aportesDetallePorPacto: Record<number, AporteDetalle[]> = {
    1: [
      {
        sectorInversion: 'Transporte',
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadEjecutora: 'INVIAS',
        totalAporteEstimado: 42000000,
        aporteEstimadoNacion: 26000000,
        aporteEstimadoTerritorio: 12000000,
        aporteEstimadoOtros: 4000000,
        totalAporte: 42000000
      },
      {
        sectorInversion: 'Educación',
        tipoOferta: 'Dotación',
        estadoProyecto: 'No iniciado',
        entidadEjecutora: 'Gobernación',
        totalAporteEstimado: 18000000,
        aporteEstimadoNacion: 9000000,
        aporteEstimadoTerritorio: 7000000,
        aporteEstimadoOtros: 2000000,
        totalAporte: 18000000
      },
      {
        sectorInversion: 'Agua y saneamiento',
        tipoOferta: 'Obra',
        estadoProyecto: 'Terminado',
        entidadEjecutora: 'Alcaldía',
        totalAporteEstimado: 30000000,
        aporteEstimadoNacion: 17000000,
        aporteEstimadoTerritorio: 10000000,
        aporteEstimadoOtros: 3000000,
        totalAporte: 30000000
      }
    ],
    2: [
      {
        sectorInversion: 'Salud',
        tipoOferta: 'Dotación',
        estadoProyecto: 'En ejecución',
        entidadEjecutora: 'ESE Departamental',
        totalAporteEstimado: 22000000,
        aporteEstimadoNacion: 12000000,
        aporteEstimadoTerritorio: 8000000,
        aporteEstimadoOtros: 2000000,
        totalAporte: 22000000
      },
      {
        sectorInversion: 'Vivienda',
        tipoOferta: 'Subsidio',
        estadoProyecto: 'Terminado',
        entidadEjecutora: 'Caja de Vivienda',
        totalAporteEstimado: 15000000,
        aporteEstimadoNacion: 7000000,
        aporteEstimadoTerritorio: 6000000,
        aporteEstimadoOtros: 2000000,
        totalAporte: 15000000
      }
    ],
    3: [
      {
        sectorInversion: 'Transporte',
        tipoOferta: 'Obra',
        estadoProyecto: 'No iniciado',
        entidadEjecutora: 'Secretaría de Infraestructura',
        totalAporteEstimado: 19000000,
        aporteEstimadoNacion: 9000000,
        aporteEstimadoTerritorio: 7000000,
        aporteEstimadoOtros: 3000000,
        totalAporte: 19000000
      }
    ],
    4: [
      {
        sectorInversion: 'Educación',
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadEjecutora: 'Gobernación',
        totalAporteEstimado: 28000000,
        aporteEstimadoNacion: 16000000,
        aporteEstimadoTerritorio: 9000000,
        aporteEstimadoOtros: 3000000,
        totalAporte: 28000000
      },
      {
        sectorInversion: 'Salud',
        tipoOferta: 'Obra',
        estadoProyecto: 'Terminado',
        entidadEjecutora: 'Alcaldía',
        totalAporteEstimado: 21000000,
        aporteEstimadoNacion: 11000000,
        aporteEstimadoTerritorio: 8000000,
        aporteEstimadoOtros: 2000000,
        totalAporte: 21000000
      }
    ],
    5: [
      {
        sectorInversion: 'Agua y saneamiento',
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadEjecutora: 'Empresa de Servicios Públicos',
        totalAporteEstimado: 24000000,
        aporteEstimadoNacion: 13000000,
        aporteEstimadoTerritorio: 9000000,
        aporteEstimadoOtros: 2000000,
        totalAporte: 24000000
      }
    ]
  };

  filtrosAportes = {
    sectorInversion: '',
    tipoOferta: '',
    estadoProyecto: '',
    entidadEjecutora: ''
  };

  iniciativasPorPacto: Record<number, IniciativaDetalle[]> = {
    1: [
      {
        sectorInversion: 'Transporte',
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'Ministerio de Transporte',
        entidadTerritorioAportante: 'Gobernación del Atlántico'
      },
      {
        sectorInversion: 'Educación',
        tipoOferta: 'Dotación',
        estadoProyecto: 'No iniciado',
        entidadAportante: 'MEN',
        entidadTerritorioAportante: 'Alcaldía de Barranquilla'
      }
    ],
    2: [
      {
        sectorInversion: 'Salud',
        tipoOferta: 'Dotación',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'Ministerio de Salud',
        entidadTerritorioAportante: 'Gobernación de Santander'
      }
    ],
    3: [
      {
        sectorInversion: 'Agua y saneamiento',
        tipoOferta: 'Obra',
        estadoProyecto: 'Terminado',
        entidadAportante: 'MVCT',
        entidadTerritorioAportante: 'Alcaldía de Pasto'
      }
    ],
    4: [
      {
        sectorInversion: 'Vivienda',
        tipoOferta: 'Subsidio',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'FONVIVIENDA',
        entidadTerritorioAportante: 'Gobernación de Antioquia'
      }
    ],
    5: [
      {
        sectorInversion: 'Transporte',
        tipoOferta: 'Obra',
        estadoProyecto: 'No iniciado',
        entidadAportante: 'INVIAS',
        entidadTerritorioAportante: 'Alcaldía de Cali'
      }
    ]
  };

  iniciativasTablaPorPacto: Record<number, IniciativaTabla[]> = {
    1: [
      {
        lineaTematica: 'Movilidad y conectividad',
        sectorInversion: 'Transporte',
        nombreProyecto: 'Mejoramiento vía Barranquilla–Puerto Colombia',
        inversionTotal: 18500000,
        presupuestoComprometidoTotal: 14000000,
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'Ministerio de Transporte',
        entidadTerritorioAportante: 'Gobernación del Atlántico'
      },
      {
        lineaTematica: 'Educación de calidad',
        sectorInversion: 'Educación',
        nombreProyecto: 'Dotación de aulas rurales Atlántico',
        inversionTotal: 9200000,
        presupuestoComprometidoTotal: 0,
        tipoOferta: 'Dotación',
        estadoProyecto: 'No iniciado',
        entidadAportante: 'MEN',
        entidadTerritorioAportante: 'Alcaldía de Barranquilla'
      },
      {
        lineaTematica: 'Agua y saneamiento básico',
        sectorInversion: 'Agua y saneamiento',
        nombreProyecto: 'Acueducto veredal Palmar de Varela',
        inversionTotal: 12300000,
        presupuestoComprometidoTotal: 10000000,
        tipoOferta: 'Obra',
        estadoProyecto: 'Terminado',
        entidadAportante: 'MVCT',
        entidadTerritorioAportante: 'Alcaldía de Barranquilla'
      }
    ],
    2: [
      {
        lineaTematica: 'Salud y bienestar',
        sectorInversion: 'Salud',
        nombreProyecto: 'Ampliación hospital San Juan de Dios',
        inversionTotal: 22000000,
        presupuestoComprometidoTotal: 19000000,
        tipoOferta: 'Dotación',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'Ministerio de Salud',
        entidadTerritorioAportante: 'Gobernación de Santander'
      },
      {
        lineaTematica: 'Vivienda digna',
        sectorInversion: 'Vivienda',
        nombreProyecto: 'Subsidios vivienda rural Santander',
        inversionTotal: 15000000,
        presupuestoComprometidoTotal: 15000000,
        tipoOferta: 'Subsidio',
        estadoProyecto: 'Terminado',
        entidadAportante: 'FONVIVIENDA',
        entidadTerritorioAportante: 'Gobernación de Santander'
      }
    ],
    3: [
      {
        lineaTematica: 'Agua y saneamiento básico',
        sectorInversion: 'Agua y saneamiento',
        nombreProyecto: 'Alcantarillado Tumaco',
        inversionTotal: 19000000,
        presupuestoComprometidoTotal: 0,
        tipoOferta: 'Obra',
        estadoProyecto: 'No iniciado',
        entidadAportante: 'MVCT',
        entidadTerritorioAportante: 'Alcaldía de Pasto'
      },
      {
        lineaTematica: 'Movilidad y conectividad',
        sectorInversion: 'Transporte',
        nombreProyecto: 'Pavimentación vía Ipiales–Tumaco',
        inversionTotal: 21000000,
        presupuestoComprometidoTotal: 8000000,
        tipoOferta: 'Obra',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'INVIAS',
        entidadTerritorioAportante: 'Alcaldía de Pasto'
      }
    ],
    4: [
      {
        lineaTematica: 'Educación de calidad',
        sectorInversion: 'Educación',
        nombreProyecto: 'Liceos del Futuro Antioquia Fase II',
        inversionTotal: 28000000,
        presupuestoComprometidoTotal: 20000000,
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'MEN',
        entidadTerritorioAportante: 'Gobernación de Antioquia'
      },
      {
        lineaTematica: 'Salud y bienestar',
        sectorInversion: 'Salud',
        nombreProyecto: 'Unidades médicas rurales Bajo Cauca',
        inversionTotal: 21000000,
        presupuestoComprometidoTotal: 21000000,
        tipoOferta: 'Obra',
        estadoProyecto: 'Terminado',
        entidadAportante: 'Ministerio de Salud',
        entidadTerritorioAportante: 'Gobernación de Antioquia'
      }
    ],
    5: [
      {
        lineaTematica: 'Movilidad y conectividad',
        sectorInversion: 'Transporte',
        nombreProyecto: 'Corredor vial Buenaventura–Cali',
        inversionTotal: 24000000,
        presupuestoComprometidoTotal: 0,
        tipoOferta: 'Obra',
        estadoProyecto: 'No iniciado',
        entidadAportante: 'INVIAS',
        entidadTerritorioAportante: 'Alcaldía de Cali'
      },
      {
        lineaTematica: 'Agua y saneamiento básico',
        sectorInversion: 'Agua y saneamiento',
        nombreProyecto: 'Planta de tratamiento Dagua',
        inversionTotal: 16000000,
        presupuestoComprometidoTotal: 9000000,
        tipoOferta: 'Infraestructura',
        estadoProyecto: 'En ejecución',
        entidadAportante: 'MVCT',
        entidadTerritorioAportante: 'Alcaldía de Cali'
      }
    ]
  };

  proyectosPorPacto: Record<number, ProyectoTabla[]> = {
    1: [
      {
        fuente: 'FRPT',
        sector: 'Transporte',
        proyecto: 'Mejoramiento vía Barranquilla–Puerto Colombia',
        estadoProyecto: 'En ejecución',
        nivelEstadoProyecto: 'Fase II',
        valorIndicativo: 18500000,
        aporteConsolidadoNacion: 12000000,
        aporteIndicativoEntidadesTerritoriales: 6500000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'INVIAS'
      },
      {
        fuente: 'NT',
        sector: 'Educación',
        proyecto: 'Dotación de aulas rurales Atlántico',
        estadoProyecto: 'No iniciado',
        nivelEstadoProyecto: 'Formulación',
        valorIndicativo: 9200000,
        aporteConsolidadoNacion: 5000000,
        aporteIndicativoEntidadesTerritoriales: 4200000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'MEN'
      },
      {
        fuente: 'FRPT',
        sector: 'Agua y saneamiento',
        proyecto: 'Acueducto veredal Palmar de Varela',
        estadoProyecto: 'Terminado',
        nivelEstadoProyecto: 'Cierre',
        valorIndicativo: 12300000,
        aporteConsolidadoNacion: 7000000,
        aporteIndicativoEntidadesTerritoriales: 5300000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'MVCT'
      }
    ],
    2: [
      {
        fuente: 'FRPT',
        sector: 'Salud',
        proyecto: 'Ampliación hospital San Juan de Dios',
        estadoProyecto: 'En ejecución',
        nivelEstadoProyecto: 'Obra',
        valorIndicativo: 22000000,
        aporteConsolidadoNacion: 12000000,
        aporteIndicativoEntidadesTerritoriales: 10000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'Minsalud'
      },
      {
        fuente: 'NT',
        sector: 'Vivienda',
        proyecto: 'Subsidios vivienda rural Santander',
        estadoProyecto: 'Terminado',
        nivelEstadoProyecto: 'Entrega',
        valorIndicativo: 15000000,
        aporteConsolidadoNacion: 7000000,
        aporteIndicativoEntidadesTerritoriales: 8000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'FONVIVIENDA'
      }
    ],
    3: [
      {
        fuente: 'NT',
        sector: 'Agua y saneamiento',
        proyecto: 'Alcantarillado Tumaco',
        estadoProyecto: 'No iniciado',
        nivelEstadoProyecto: 'Prefactibilidad',
        valorIndicativo: 19000000,
        aporteConsolidadoNacion: 10000000,
        aporteIndicativoEntidadesTerritoriales: 9000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'MVCT'
      },
      {
        fuente: 'FRPT',
        sector: 'Transporte',
        proyecto: 'Pavimentación vía Ipiales–Tumaco',
        estadoProyecto: 'En ejecución',
        nivelEstadoProyecto: 'Obra',
        valorIndicativo: 21000000,
        aporteConsolidadoNacion: 14000000,
        aporteIndicativoEntidadesTerritoriales: 7000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'INVIAS'
      }
    ],
    4: [
      {
        fuente: 'NT',
        sector: 'Educación',
        proyecto: 'Liceos del Futuro Antioquia Fase II',
        estadoProyecto: 'En ejecución',
        nivelEstadoProyecto: 'Fase II',
        valorIndicativo: 28000000,
        aporteConsolidadoNacion: 16000000,
        aporteIndicativoEntidadesTerritoriales: 12000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'MEN'
      }
    ],
    5: [
      {
        fuente: 'FRPT',
        sector: 'Transporte',
        proyecto: 'Corredor vial Buenaventura–Cali',
        estadoProyecto: 'No iniciado',
        nivelEstadoProyecto: 'Formulación',
        valorIndicativo: 24000000,
        aporteConsolidadoNacion: 16000000,
        aporteIndicativoEntidadesTerritoriales: 8000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'INVIAS'
      },
      {
        fuente: 'NT',
        sector: 'Agua y saneamiento',
        proyecto: 'Planta de tratamiento Dagua',
        estadoProyecto: 'En ejecución',
        nivelEstadoProyecto: 'Obra',
        valorIndicativo: 16000000,
        aporteConsolidadoNacion: 9000000,
        aporteIndicativoEntidadesTerritoriales: 7000000,
        aporteIndicativoOtros: 0,
        entidadResponsablePei: 'MVCT'
      }
    ]
  };

  proyectosTabActivo: ProyectoFuente = 'FRPT';

  filtrosProyectos = {
    estadoProyecto: '',
    nivelEstadoProyecto: '',
    frpt: '', // '', 'si', 'no'
    sector: '',
    entidadResponsablePei: ''
  };

  compromisosPorPacto: Record<number, CompromisoTabla[]> = {
    1: [
      {
        id: 'c-1',
        instancia: 'Mesa técnica',
        noSesion: '001',
        fechaSesion: '2025-02-15',
        compromiso: 'Entregar cronograma de obra.',
        fechaCumplimiento: '2025-03-30',
        responsable: 'INVIAS',
        estado: 'En trámite'
      },
      {
        id: 'c-2',
        instancia: 'Comité directivo',
        noSesion: '002',
        fechaSesion: '2025-04-10',
        compromiso: 'Radicar soporte financiero.',
        fechaCumplimiento: '2025-05-20',
        responsable: 'Gobernación',
        estado: 'No iniciado'
      }
    ],
    2: [],
    3: [],
    4: [],
    5: []
  };

  filtrosCompromisos = {
    instancia: '',
    responsable: '',
    estado: '' as '' | CompromisoEstado,
    fechaCumplimientoDesde: '',
    fechaCumplimientoHasta: ''
  };

  showNuevoCompromisoModal = false;
  nuevoCompromisoForm: Omit<CompromisoTabla, 'id'> = {
    instancia: '',
    noSesion: '',
    fechaSesion: '',
    compromiso: '',
    fechaCumplimiento: '',
    responsable: '',
    estado: 'No iniciado'
  };

  filtrosIniciativas = {
    sectorInversion: '',
    tipoOferta: '',
    estadoProyecto: '',
    entidadAportante: '',
    entidadTerritorioAportante: ''
  };

  private requestedDepartamento = '';

  constructor(
    private readonly pactosService: PactosService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.requestedDepartamento = (params.get('departamento') || '').trim();
      this.applyRequestedDepartamentoSelection();
    });
    this.loadPactos();
  }

  get pactosFiltrados() {
    return this.pactos.filter((pacto) => {
      const byEtapa = !this.etapaSeleccionada || pacto.idEtapa === this.etapaSeleccionada;
      const byTipoPacto = !this.tipoPactoSeleccionado || (pacto.tipoPacto || '') === this.tipoPactoSeleccionado;
      return byEtapa && byTipoPacto;
    });
  }

  get opcionesEtapa() {
    return this.obtenerOpcionesUnicas(this.pactos.map((item) => item.idEtapa || 'Sin etapa'));
  }

  get opcionesTipoPacto() {
    return this.obtenerOpcionesUnicas(this.pactos.map((item) => item.tipoPacto || 'No definido'))
      .map((item) => ({ value: item, label: item }));
  }

  onFiltrosPactosChange() {
    if (this.pactoSeleccionado && this.pactosFiltrados.some((item) => item.id === this.pactoSeleccionado?.id)) {
      return;
    }

    this.pactoSeleccionado = this.pactosFiltrados[0] ?? null;
  }

  limpiarFiltrosPactos() {
    this.etapaSeleccionada = '';
    this.tipoPactoSeleccionado = '';
    this.pactoSeleccionado = this.pactosFiltrados[0] ?? this.pactos[0] ?? null;
  }

  scrollCarousel(direction: -1 | 1) {
    if (!this.carouselTrack?.nativeElement) return;
    const track = this.carouselTrack.nativeElement;
    const scrollAmount = 220 * 2; // 2 cards
    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  }

  seleccionarPacto(pacto: Pacto) {
    this.pactoSeleccionado = pacto;
    this.limpiarFiltrosAportes();
    this.limpiarFiltrosIniciativas();
    this.limpiarFiltrosProyectos();
    this.limpiarFiltrosCompromisos();
  }

  private applyRequestedDepartamentoSelection(): void {
    const dep = (this.requestedDepartamento || '').trim();
    if (!dep || !this.pactos?.length) {
      return;
    }

    const match = this.findPactoForDepartamento(dep);
    if (!match) {
      return;
    }

    this.seleccionarPacto(match);
  }

  private findPactoForDepartamento(departamento: string): Pacto | null {
    const target = this.normalizeText(departamento);
    if (!target) return null;

    // 1) Match directo por campo `departamento`.
    const direct = this.pactos.find((p) => this.normalizeText(p.departamento) === target);
    if (direct) return direct;

    // 2) Match por alcance (si el backend entrega "Departamentos: ...")
    const byAlcance = this.pactos.find((p) => {
      const deps = this.extractDepartamentosFromAlcance(p.alcance);
      return deps.some((d) => this.normalizeText(d) === target);
    });
    if (byAlcance) return byAlcance;

    // 3) Fallback: contains (por variaciones de nombre)
    return this.pactos.find((p) => this.normalizeText(p.departamento).includes(target) || target.includes(this.normalizeText(p.departamento))) ?? null;
  }

  get datosClaveSeguro() {
    if (!this.pactoSeleccionado) return null;

    const datosBase = this.datosClave[this.pactoSeleccionado.id] || {};
    const fechaSuscripcion = this.pactoSeleccionado.fechaSuscripcion || datosBase.fechaSuscripcion || '';
    const fechaVencimiento = this.pactoSeleccionado.fechaVencimiento || datosBase.vencimiento || '';
    const plazoAniosCalculado = this.calculatePlazoAnios(fechaSuscripcion, fechaVencimiento);
    const mesesParaVencimientoCalculado = this.calculateMesesParaVencimiento(fechaVencimiento);

    return {
      ...datosBase,
      fechaSuscripcion: fechaSuscripcion || 'N/A',
      plazoAnios: plazoAniosCalculado ?? (datosBase.plazoAnios ?? 'N/A'),
      vencimiento: fechaVencimiento || 'N/A',
      mesesParaVencimiento: mesesParaVencimientoCalculado ?? (datosBase.mesesParaVencimiento ?? 'N/A')
    };
  }

  get resumenPactoSeleccionado() {
    if (!this.pactoSeleccionado) {
      return [];
    }

    return [
      { label: 'Tipo de pacto', value: this.pactoSeleccionado.tipoPacto || 'N/A' },
      { label: 'Etapa', value: this.formatEtapa(this.pactoSeleccionado.idEtapa) }
    ];
  }

  get departamentosPactoSeleccionado(): string[] {
    if (!this.pactoSeleccionado) {
      return [];
    }

    return this.extractDepartamentosFromAlcance(this.pactoSeleccionado.alcance);
  }

  get municipiosPactoSeleccionado(): string[] {
    if (!this.pactoSeleccionado) {
      return [];
    }

    const fromAlcance = this.extractMunicipiosFromAlcance(this.pactoSeleccionado.alcance);
    if (fromAlcance.length) {
      return fromAlcance;
    }

    const municipio = (this.pactoSeleccionado.municipio || '').trim();
    return municipio ? [municipio] : [];
  }

  get municipiosContextoPactoSeleccionado(): Array<{ name: string; department?: string }> {
    if (!this.pactoSeleccionado) {
      return [];
    }

    const municipios = this.municipiosPactoSeleccionado;
    if (!municipios.length) {
      return [];
    }

    const departamentos = this.extractDepartamentosFromAlcance(this.pactoSeleccionado.alcance);
    const fallbackDepartamento = (this.pactoSeleccionado.departamento || '').trim();
    const uniqueDepartment = departamentos.length === 1 ? departamentos[0] : (fallbackDepartamento || '');
    const department = uniqueDepartment && uniqueDepartment !== 'N/A' ? uniqueDepartment : undefined;

    return municipios.map((name) => ({
      name,
      department
    }));
  }

  /** URL para «Ver PEI vigente pacto territorial» (API / documento PEI o pacto). */
  get urlPeiVigentePacto(): string {
    return (this.pactoSeleccionado?.urlDocPEI || '').trim();
  }

  /** URL para «Ver minuta pacto territorial». */
  get urlMinutaPacto(): string {
    return (this.pactoSeleccionado?.urlDocMinuta || '').trim();
  }

  get suscribientesPactoSeleccionado(): string {
    const texto = (this.pactoSeleccionado?.descripcion || '').trim();
    return texto || 'Sin suscribientes registrados.';
  }

  get objetivoPactoSeleccionado(): string {
    const texto = (this.pactoSeleccionado?.objetivo || '').trim();
    return texto || 'Sin objetivo registrado.';
  }

  get indicadoresEjecucion() {
    const datos = this.datosClaveSeguro;
    if (!datos) {
      return [];
    }

    return [
      { label: 'Proyectos en ejecución', value: datos.proyectosEnEjecucion ?? 0 },
      { label: 'Valor en ejecución', value: this.formatearMoneda(datos.valorEnEjecucion) },
      { label: 'Proyectos terminados', value: datos.proyectosTerminados ?? 0 },
      { label: 'Valor en ejecución/terminado', value: this.formatearMoneda(datos.valorEjecutado) },
      { label: 'Por comprometer: proyectos no iniciados', value: datos.proyectosNoIniciados ?? 0 },
      { label: 'Por comprometer: valor no iniciados', value: this.formatearMoneda(datos.valorNoIniciados) }
    ];
  }

  get indicadoresCompromisos() {
    const datos = this.datosClaveSeguro;
    if (!datos) {
      return [];
    }

    const valorEnEjecucion = datos.valorEjecutado ?? 0;
    const comprometidoSector = datos.comprometidoSector ?? 0;
    const comprometidoDnpFrpt = datos.comprometidoDnpFrpt ?? 0;
    const comprometidoTerritorio = datos.comprometidoTerritorio ?? 0;
    const comprometidoAportesOtros = datos.comprometidoAportesOtros ?? 0;
    const totalReferencia =
      valorEnEjecucion +
      comprometidoSector +
      comprometidoDnpFrpt +
      comprometidoTerritorio +
      comprometidoAportesOtros;

    const porcentaje = (valor: number) => {
      if (!totalReferencia) {
        return '0%';
      }

      return `${((valor / totalReferencia) * 100).toFixed(1)}%`;
    };

    return [
      { label: 'Valor en ejecución/terminado', value: this.formatearMoneda(valorEnEjecucion), porcentaje: porcentaje(valorEnEjecucion) },
      { label: 'Comprometido sector', value: this.formatearMoneda(comprometidoSector), porcentaje: porcentaje(comprometidoSector) },
      { label: 'Comprometido DNP FRPT', value: this.formatearMoneda(comprometidoDnpFrpt), porcentaje: porcentaje(comprometidoDnpFrpt) },
      { label: 'Comprometido Territorio', value: this.formatearMoneda(comprometidoTerritorio), porcentaje: porcentaje(comprometidoTerritorio) },
      { label: 'Comprometido Aportes Otros', value: this.formatearMoneda(comprometidoAportesOtros), porcentaje: porcentaje(comprometidoAportesOtros) }
    ];
  }

  get aportesDetalleFiltrados() {
    const detalle = this.detalleAportesActual;
    return detalle.filter(item => {
      const cumpleSector = !this.filtrosAportes.sectorInversion || item.sectorInversion === this.filtrosAportes.sectorInversion;
      const cumpleOferta = !this.filtrosAportes.tipoOferta || item.tipoOferta === this.filtrosAportes.tipoOferta;
      const cumpleEstado = !this.filtrosAportes.estadoProyecto || item.estadoProyecto === this.filtrosAportes.estadoProyecto;
      const cumpleEntidad = !this.filtrosAportes.entidadEjecutora || item.entidadEjecutora === this.filtrosAportes.entidadEjecutora;
      return cumpleSector && cumpleOferta && cumpleEstado && cumpleEntidad;
    });
  }

  get opcionesSectorInversion() {
    return this.obtenerOpcionesUnicas(this.detalleAportesActual.map(item => item.sectorInversion));
  }

  get opcionesTipoOferta() {
    return this.obtenerOpcionesUnicas(this.detalleAportesActual.map(item => item.tipoOferta));
  }

  get opcionesEstadoProyecto() {
    return this.obtenerOpcionesUnicas(this.detalleAportesActual.map(item => item.estadoProyecto));
  }

  get opcionesEntidadEjecutora() {
    return this.obtenerOpcionesUnicas(this.detalleAportesActual.map(item => item.entidadEjecutora));
  }

  limpiarFiltrosAportes() {
    this.filtrosAportes = {
      sectorInversion: '',
      tipoOferta: '',
      estadoProyecto: '',
      entidadEjecutora: ''
    };
  }

  get opcionesIniciativasSectorInversion() {
    return this.obtenerOpcionesUnicas(this.detalleIniciativasActual.map(item => item.sectorInversion));
  }

  get opcionesIniciativasTipoOferta() {
    return this.obtenerOpcionesUnicas(this.detalleIniciativasActual.map(item => item.tipoOferta));
  }

  get opcionesIniciativasEstadoProyecto() {
    return this.obtenerOpcionesUnicas(this.detalleIniciativasActual.map(item => item.estadoProyecto));
  }

  get opcionesIniciativasEntidadAportante() {
    return this.obtenerOpcionesUnicas(this.detalleIniciativasActual.map(item => item.entidadAportante));
  }

  get opcionesIniciativasEntidadTerritorioAportante() {
    return this.obtenerOpcionesUnicas(this.detalleIniciativasActual.map(item => item.entidadTerritorioAportante));
  }

  limpiarFiltrosIniciativas() {
    this.filtrosIniciativas = {
      sectorInversion: '',
      tipoOferta: '',
      estadoProyecto: '',
      entidadAportante: '',
      entidadTerritorioAportante: ''
    };
  }

  limpiarFiltrosProyectos(): void {
    this.filtrosProyectos = {
      estadoProyecto: '',
      nivelEstadoProyecto: '',
      frpt: '',
      sector: '',
      entidadResponsablePei: ''
    };
  }

  limpiarFiltrosCompromisos(): void {
    this.filtrosCompromisos = {
      instancia: '',
      responsable: '',
      estado: '',
      fechaCumplimientoDesde: '',
      fechaCumplimientoHasta: ''
    };
  }

  get compromisosBaseActual(): CompromisoTabla[] {
    if (!this.pactoSeleccionado) return [];
    return this.compromisosPorPacto[this.pactoSeleccionado.id] ?? [];
  }

  get compromisosFiltrados(): CompromisoTabla[] {
    const base = this.compromisosBaseActual;
    if (!base.length) return [];

    const f = this.filtrosCompromisos;
    const desde = f.fechaCumplimientoDesde ? new Date(f.fechaCumplimientoDesde) : null;
    const hasta = f.fechaCumplimientoHasta ? new Date(f.fechaCumplimientoHasta) : null;

    return base.filter((c) => {
      const byInstancia = !f.instancia || c.instancia === f.instancia;
      const byResp = !f.responsable || c.responsable === f.responsable;
      const byEstado = !f.estado || c.estado === f.estado;

      const fecha = c.fechaCumplimiento ? new Date(c.fechaCumplimiento) : null;
      const byDesde = !desde || (fecha && fecha >= desde);
      const byHasta = !hasta || (fecha && fecha <= hasta);

      return byInstancia && byResp && byEstado && byDesde && byHasta;
    });
  }

  get opcionesCompromisosInstancia(): string[] {
    return this.obtenerOpcionesUnicas(this.compromisosBaseActual.map((c) => c.instancia));
  }

  get opcionesCompromisosResponsable(): string[] {
    return this.obtenerOpcionesUnicas(this.compromisosBaseActual.map((c) => c.responsable));
  }

  get resumenCompromisosCards(): Array<{ label: string; value: number; color: string }> {
    const base = this.compromisosFiltrados;
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

  openNuevoCompromisoModal(): void {
    this.showNuevoCompromisoModal = true;
  }

  closeNuevoCompromisoModal(): void {
    this.showNuevoCompromisoModal = false;
  }

  guardarNuevoCompromiso(): void {
    if (!this.pactoSeleccionado) {
      this.closeNuevoCompromisoModal();
      return;
    }

    const form = this.nuevoCompromisoForm;
    const requiredOk =
      !!form.instancia.trim()
      && !!form.noSesion.trim()
      && !!form.fechaSesion.trim()
      && !!form.compromiso.trim()
      && !!form.fechaCumplimiento.trim()
      && !!form.responsable.trim()
      && !!form.estado;

    if (!requiredOk) {
      return;
    }

    const id = `c-${Date.now()}`;
    const next: CompromisoTabla = {
      id,
      ...form,
      instancia: form.instancia.trim(),
      noSesion: form.noSesion.trim(),
      compromiso: form.compromiso.trim(),
      responsable: form.responsable.trim()
    };

    const pactoId = this.pactoSeleccionado.id;
    const current = this.compromisosPorPacto[pactoId] ?? [];
    this.compromisosPorPacto[pactoId] = [next, ...current];

    this.nuevoCompromisoForm = {
      instancia: '',
      noSesion: '',
      fechaSesion: '',
      compromiso: '',
      fechaCumplimiento: '',
      responsable: '',
      estado: 'No iniciado'
    };

    this.closeNuevoCompromisoModal();
  }

  get proyectosBaseActual(): ProyectoTabla[] {
    if (!this.pactoSeleccionado) {
      return [];
    }
    return this.proyectosPorPacto[this.pactoSeleccionado.id] ?? [];
  }

  get proyectosFiltradosTodos(): ProyectoTabla[] {
    const base = this.proyectosBaseActual;
    if (!base.length) return [];

    const f = this.filtrosProyectos;
    return base.filter((p) => {
      const byEstado = !f.estadoProyecto || p.estadoProyecto === f.estadoProyecto;
      const byNivel = !f.nivelEstadoProyecto || p.nivelEstadoProyecto === f.nivelEstadoProyecto;
      const byFrpt = !f.frpt || (f.frpt === 'si' ? p.fuente === 'FRPT' : p.fuente !== 'FRPT');
      const bySector = !f.sector || p.sector === f.sector;
      const byEntidad = !f.entidadResponsablePei || p.entidadResponsablePei === f.entidadResponsablePei;
      return byEstado && byNivel && byFrpt && bySector && byEntidad;
    });
  }

  get proyectosTablaFiltrada(): ProyectoTabla[] {
    return this.proyectosFiltradosTodos.filter((p) => p.fuente === this.proyectosTabActivo);
  }

  get opcionesProyectosEstado(): string[] {
    return this.obtenerOpcionesUnicas(this.proyectosBaseActual.map((p) => p.estadoProyecto));
  }

  get opcionesProyectosNivelEstado(): string[] {
    return this.obtenerOpcionesUnicas(this.proyectosBaseActual.map((p) => p.nivelEstadoProyecto));
  }

  get opcionesProyectosSector(): string[] {
    return this.obtenerOpcionesUnicas(this.proyectosBaseActual.map((p) => p.sector));
  }

  get opcionesProyectosEntidadResponsablePei(): string[] {
    return this.obtenerOpcionesUnicas(this.proyectosBaseActual.map((p) => p.entidadResponsablePei));
  }

  get proyectosResumenEstados(): Array<{ key: 'En ejecución' | 'No iniciado' | 'Terminado'; label: string; value: number; color: string }> {
    const base = this.proyectosFiltradosTodos;
    if (!base.length) {
      // Dummy data para que siempre se vea la gráfica.
      return [
        { key: 'En ejecución', label: 'En ejecución', value: 6, color: '#00c3c1' },
        { key: 'No iniciado', label: 'No iniciados', value: 3, color: '#ffbf39' },
        { key: 'Terminado', label: 'Terminados', value: 2, color: '#66bb6a' }
      ];
    }
    const count = (k: 'En ejecución' | 'No iniciado' | 'Terminado') => base.filter((p) => p.estadoProyecto === k).length;
    return [
      { key: 'En ejecución', label: 'En ejecución', value: count('En ejecución'), color: '#00c3c1' },
      { key: 'No iniciado', label: 'No iniciados', value: count('No iniciado'), color: '#ffbf39' },
      { key: 'Terminado', label: 'Terminados', value: count('Terminado'), color: '#66bb6a' }
    ];
  }

  get proyectosSectoresResumen(): Array<{ sector: string; cantidad: number; color: string }> {
    const base = this.proyectosFiltradosTodos;
    if (!base.length) {
      // Dummy data para que siempre se vea la gráfica.
      return [
        { sector: 'Transporte', cantidad: 4, color: 'hsl(0, 70%, 45%)' },
        { sector: 'Salud', cantidad: 3, color: 'hsl(137.508, 70%, 45%)' },
        { sector: 'Educación', cantidad: 2, color: 'hsl(275.016, 70%, 45%)' },
        { sector: 'Agua y saneamiento', cantidad: 2, color: 'hsl(52.524, 70%, 45%)' }
      ];
    }
    const mapa: Record<string, number> = {};
    for (const p of base) {
      const key = (p.sector || '').trim() || 'Sin sector';
      mapa[key] = (mapa[key] ?? 0) + 1;
    }
    const entries = Object.entries(mapa).map(([sector, cantidad], idx) => ({
      sector,
      cantidad,
      color: `hsl(${(idx * 137.508) % 360}, 70%, 45%)`
    }));
    entries.sort((a, b) => b.cantidad - a.cantidad);
    return entries;
  }

  get indicadoresIniciativas() {
    const tabla = this.pactoSeleccionado
      ? (this.iniciativasTablaPorPacto[this.pactoSeleccionado.id] ?? [])
      : [];
    return [
      { label: 'Total de proyectos PEI', value: tabla.length },
      { label: 'Valor indicativo', value: this.formatearMoneda(tabla.reduce((s, i) => s + i.inversionTotal, 0)) }
    ];
  }

  get barrasGraficoIniciativas() {
    const tabla = this.pactoSeleccionado
      ? (this.iniciativasTablaPorPacto[this.pactoSeleccionado.id] ?? [])
      : [];
    const mapa: Record<string, number> = {};
    for (const item of tabla) {
      mapa[item.sectorInversion] = (mapa[item.sectorInversion] ?? 0) + 1;
    }
    const sectores = Object.entries(mapa).map(([sector, cantidad]) => ({ sector, cantidad }));
    if (sectores.length === 0) { return { barras: [], svgWidth: 200 }; }
    const maxVal = Math.max(...sectores.map(s => s.cantidad));
    const chartHeight = 130;
    const barWidth = 50;
    const gap = 18;
    const startX = 40;
    const barras = sectores.map((s, i) => ({
      sector: s.sector,
      cantidad: s.cantidad,
      x: startX + i * (barWidth + gap),
      y: 10 + chartHeight - Math.round((s.cantidad / maxVal) * chartHeight),
      height: Math.round((s.cantidad / maxVal) * chartHeight),
      width: barWidth,
      labelX: startX + i * (barWidth + gap) + barWidth / 2
    }));
    const svgWidth = startX + sectores.length * (barWidth + gap) + 20;
    return { barras, svgWidth };
  }

  get iniciativasTablaFiltradas() {
    const tabla = this.pactoSeleccionado
      ? (this.iniciativasTablaPorPacto[this.pactoSeleccionado.id] ?? [])
      : [];
    return tabla.filter(item => {
      const cumpleSector = !this.filtrosIniciativas.sectorInversion || item.sectorInversion === this.filtrosIniciativas.sectorInversion;
      const cumpleOferta = !this.filtrosIniciativas.tipoOferta || item.tipoOferta === this.filtrosIniciativas.tipoOferta;
      const cumpleEstado = !this.filtrosIniciativas.estadoProyecto || item.estadoProyecto === this.filtrosIniciativas.estadoProyecto;
      const cumpleAportante = !this.filtrosIniciativas.entidadAportante || item.entidadAportante === this.filtrosIniciativas.entidadAportante;
      const cumpleTerritorio = !this.filtrosIniciativas.entidadTerritorioAportante || item.entidadTerritorioAportante === this.filtrosIniciativas.entidadTerritorioAportante;
      return cumpleSector && cumpleOferta && cumpleEstado && cumpleAportante && cumpleTerritorio;
    });
  }

  private formatearMoneda(valor?: number) {
    return '$' + (valor ?? 0).toLocaleString();
  }

  private get detalleAportesActual() {
    if (!this.pactoSeleccionado) {
      return [];
    }
    return this.aportesDetallePorPacto[this.pactoSeleccionado.id] ?? [];
  }

  private get detalleIniciativasActual() {
    if (!this.pactoSeleccionado) {
      return [];
    }
    return this.iniciativasPorPacto[this.pactoSeleccionado.id] ?? [];
  }

  private obtenerOpcionesUnicas(valores: string[]) {
    return [...new Set(valores)].sort((a, b) => a.localeCompare(b));
  }

  private loadPactos(): void {
    this.isLoadingPactos = true;
    this.pactosError = '';

    this.pactosService.getPactosTablaFromApi().subscribe({
      next: (rows) => {
        this.pactos = rows.map((item) => this.mapPactoFromTabla(item));
        this.pactoSeleccionado = this.pactosFiltrados[0] ?? this.pactos[0] ?? null;
        this.applyRequestedDepartamentoSelection();
        this.isLoadingPactos = false;
      },
      error: () => {
        this.pactos = [];
        this.pactoSeleccionado = null;
        this.pactosError = 'No fue posible cargar los pactos territoriales.';
        this.isLoadingPactos = false;
      }
    });
  }

  private mapPactoFromTabla(item: PactoTablaDto): Pacto {
    return {
      id: this.readNumericId(item),
      nombre: item.nombrePacto,
      departamento: item.departamento || 'N/A',
      municipio: item.municipio || '',
      ciudad: '',
      tipoPacto: item.tipoPacto,
      descripcion: (item.suscribientes || '').trim(),
      objetivo: (item.objetivo || '').trim(),
      fechaSuscripcion: item.fechaSubscripcion,
      fechaVencimiento: item.fechaVencimiento,
      idEtapa: item.etapa || 'Sin etapa',
      alcance: item.alcance || '',
      urlDocPEI: (item.urlDocPEI || '').trim(),
      urlDocMinuta: (item.urlDocMinuta || '').trim()
    };
  }

  private readNumericId(item: PactoTablaDto): number {
    const encoded = `${item.nombrePacto}|${item.fechaSubscripcion}|${item.tipoPacto}`;
    let hash = 0;
    for (let i = 0; i < encoded.length; i += 1) {
      hash = (hash * 31 + encoded.charCodeAt(i)) >>> 0;
    }
    return hash || Date.now();
  }

  getEtapaBadgeClass(etapa?: string): string {
    const normalized = this.normalizeText(etapa);

    if (normalized.includes('construccion') || normalized.includes('suscripcion')) {
      return 'badge-etapa-construccion';
    }

    if (normalized.includes('implementacion')) {
      return 'badge-etapa-implementacion';
    }

    if (normalized.includes('cierre')) {
      return 'badge-etapa-cierre';
    }

    return 'badge-etapa-default';
  }

  formatEtapa(etapa?: string): string {
    const safeEtapa = (etapa || '').trim();
    return safeEtapa || 'Sin etapa';
  }

  private normalizeText(value?: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private calculatePlazoAnios(fechaSuscripcion: string, fechaVencimiento: string): number | null {
    if (!fechaSuscripcion || !fechaVencimiento) {
      return null;
    }

    const start = new Date(fechaSuscripcion);
    const end = new Date(fechaVencimiento);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return null;
    }

    const diffMs = end.getTime() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(years);
  }

  private calculateMesesParaVencimiento(fechaVencimiento: string): number | null {
    if (!fechaVencimiento) {
      return null;
    }

    const end = new Date(fechaVencimiento);
    const now = new Date();

    if (Number.isNaN(end.getTime())) {
      return null;
    }

    if (end <= now) {
      return 0;
    }

    const diffMs = end.getTime() - now.getTime();
    const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375);
    return Math.ceil(months);
  }

  private mapEstado(etapa: string): 'implementacion' | 'cierre' {
    const normalized = etapa
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized.includes('cierre') ? 'cierre' : 'implementacion';
  }

  private extractUbicacion(alcance?: string): { departamento: string; ciudad: string } {
    const safeAlcance = (alcance || '').trim();

    if (!safeAlcance) {
      return { departamento: 'N/A', ciudad: '' };
    }

    const segments = safeAlcance
      .split('|')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const locationSegment = segments.find((segment) => {
      const normalized = segment
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      return normalized.includes('departamento')
        || normalized.includes('dptos de intervencion')
        || normalized.includes('municipio')
        || normalized.includes('ciudad');
    }) || segments[0];

    const cleanLocation = locationSegment.includes(':')
      ? locationSegment.slice(locationSegment.indexOf(':') + 1).trim()
      : locationSegment;

    const dashParts = cleanLocation.split('-').map((part) => part.trim()).filter(Boolean);
    if (dashParts.length >= 2) {
      return {
        departamento: dashParts[0] || 'N/A',
        ciudad: dashParts.slice(1).join(' - ')
      };
    }

    const commaParts = cleanLocation.split(',').map((part) => part.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      return {
        departamento: commaParts[commaParts.length - 1] || 'N/A',
        ciudad: commaParts.slice(0, -1).join(', ')
      };
    }

    return {
      departamento: cleanLocation || 'N/A',
      ciudad: ''
    };
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

  private extractMunicipiosFromAlcance(alcance?: string): string[] {
    const safeAlcance = (alcance || '').trim();
    if (!safeAlcance) {
      return [];
    }

    const municipios = new Set<string>();
    const segments = safeAlcance.split('|').map((segment) => segment.trim()).filter(Boolean);

    for (const segment of segments) {
      const normalized = segment
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      if (normalized.startsWith('municipios:') || normalized.startsWith('municipio:')) {
        const value = segment.includes(':') ? segment.slice(segment.indexOf(':') + 1).trim() : segment.trim();
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => municipios.add(item));
      }
    }

    return [...municipios];
  }

}
