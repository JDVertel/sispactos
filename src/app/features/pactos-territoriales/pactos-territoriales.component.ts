import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';
import { PactosService } from '../../core/services/pactos.service';
import { Pacto as PactoModel } from '../../shared/models';

interface Pacto {
  id: number;
  nombre: string;
  departamento: string;
  estado: 'implementacion' | 'cierre';
  tipoPacto?: string;
  descripcion?: string;
  objetivo?: string;
  fechaSuscripcion?: string;
  fechaVencimiento?: string;
  idEtapa?: string;
  alcance?: string;
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
// ...existing code...

@Component({
  selector: 'app-pactos-territoriales',
  standalone: true,
  imports: [CommonModule, FormsModule, DepartamentoMapComponent],
  templateUrl: './pactos-territoriales.component.html',
  styleUrls: ['./pactos-territoriales.component.css']
})
export class PactosTerritorialesComponent implements OnInit {
  tabActivo = 'info';
  estadoSeleccionado: 'implementacion' | 'cierre' = 'implementacion';
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

  filtrosIniciativas = {
    sectorInversion: '',
    tipoOferta: '',
    estadoProyecto: '',
    entidadAportante: '',
    entidadTerritorioAportante: ''
  };

  constructor(private readonly pactosService: PactosService) {}

  ngOnInit(): void {
    this.loadPactos();
  }

  get pactosFiltrados() {
    return this.pactos.filter(p => p.estado === this.estadoSeleccionado);
  }

  seleccionarEstado(estado: 'implementacion' | 'cierre') {
    this.estadoSeleccionado = estado;

    if (this.pactoSeleccionado?.estado === estado) {
      return;
    }

    this.pactoSeleccionado = this.pactosFiltrados[0] ?? null;
  }

  seleccionarPacto(pacto: Pacto) {
    this.pactoSeleccionado = pacto;
    this.limpiarFiltrosAportes();
    this.limpiarFiltrosIniciativas();
  }

  get datosClaveSeguro() {
    if (!this.pactoSeleccionado) return null;

    const datosBase = this.datosClave[this.pactoSeleccionado.id] || {};

    return {
      ...datosBase,
      fechaSuscripcion: this.pactoSeleccionado.fechaSuscripcion || datosBase.fechaSuscripcion || 'N/A',
      vencimiento: this.pactoSeleccionado.fechaVencimiento || datosBase.vencimiento || 'N/A'
    };
  }

  get resumenPactoSeleccionado() {
    if (!this.pactoSeleccionado) {
      return [];
    }

    return [
      { label: 'Tipo de pacto', value: this.pactoSeleccionado.tipoPacto || 'N/A' },
      { label: 'Etapa', value: this.pactoSeleccionado.idEtapa || 'N/A' },
      { label: 'Departamento', value: this.pactoSeleccionado.departamento || 'N/A' },
      { label: 'Alcance', value: this.pactoSeleccionado.alcance || 'N/A' }
    ];
  }

  get descripcionPactoSeleccionado(): string {
    return this.pactoSeleccionado?.descripcion || 'Sin descripción registrada.';
  }

  get objetivoPactoSeleccionado(): string {
    return this.pactoSeleccionado?.objetivo || 'Sin objetivo registrado.';
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
      { label: 'Valor ejecutado', value: this.formatearMoneda(datos.valorEjecutado) },
      { label: 'Por comprometer: proyectos no iniciados', value: datos.proyectosNoIniciados ?? 0 },
      { label: 'Por comprometer: valor no iniciados', value: this.formatearMoneda(datos.valorNoIniciados) }
    ];
  }

  get indicadoresCompromisos() {
    const datos = this.datosClaveSeguro;
    if (!datos) {
      return [];
    }

    return [
      { label: 'Valor ejecutado', value: this.formatearMoneda(datos.valorEjecutado) },
      { label: 'Comprometido sector', value: this.formatearMoneda(datos.comprometidoSector) },
      { label: 'Comprometido DNP FRPT', value: this.formatearMoneda(datos.comprometidoDnpFrpt) },
      { label: 'Comprometido Territorio', value: this.formatearMoneda(datos.comprometidoTerritorio) },
      { label: 'Comprometido Aportes Otros', value: this.formatearMoneda(datos.comprometidoAportesOtros) }
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

  get indicadoresIniciativas() {
    const tabla = this.pactoSeleccionado
      ? (this.iniciativasTablaPorPacto[this.pactoSeleccionado.id] ?? [])
      : [];
    return [
      { label: 'Total de iniciativas', value: tabla.length },
      { label: 'Inversión total estimada', value: this.formatearMoneda(tabla.reduce((s, i) => s + i.inversionTotal, 0)) }
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

    this.pactosService.getPactos().subscribe({
      next: (rows) => {
        this.pactos = rows.map((item) => this.mapPacto(item));
        this.pactoSeleccionado = this.pactosFiltrados[0] ?? this.pactos[0] ?? null;
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

  private mapPacto(item: PactoModel): Pacto {
    const etapa = (item.idEtapa || '').trim();

    return {
      id: item.id,
      nombre: item.nombre,
      departamento: this.extractDepartamento(item.alcance),
      estado: this.mapEstado(etapa),
      tipoPacto: item.tipoPacto,
      descripcion: item.descripcion,
      objetivo: item.objetivo,
      fechaSuscripcion: item.fechaSuscripcion,
      fechaVencimiento: item.fechaVencimiento,
      idEtapa: etapa,
      alcance: item.alcance
    };
  }

  private mapEstado(etapa: string): 'implementacion' | 'cierre' {
    const normalized = etapa
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized.includes('cierre') ? 'cierre' : 'implementacion';
  }

  private extractDepartamento(alcance?: string): string {
    const safeAlcance = (alcance || '').trim();

    if (!safeAlcance) {
      return 'N/A';
    }

    const afterColon = safeAlcance.split(':').pop()?.trim() || safeAlcance;
    const departamento = afterColon.split('|')[0].split('-')[0].trim();

    return departamento || 'N/A';
  }
}
