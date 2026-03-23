import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartamentoMapComponent } from '../../shared/components/departamento-map/departamento-map.component';

interface Pacto {
  id: number;
  nombre: string;
  departamento: string;
  estado: 'implementacion' | 'cierre';
}
// ...existing code...

@Component({
  selector: 'app-pactos-territoriales',
  standalone: true,
  imports: [CommonModule, DepartamentoMapComponent],
  templateUrl: './pactos-territoriales.component.html',
  styleUrls: ['./pactos-territoriales.component.css']
})
export class PactosTerritorialesComponent {
  tabActivo = 'info';
  estadoSeleccionado: 'implementacion' | 'cierre' = 'implementacion';
  pactos: Pacto[] = [
    { id: 1, nombre: 'Pacto Caribe', departamento: 'Atlántico', estado: 'implementacion' },
    { id: 2, nombre: 'Pacto Santander', departamento: 'Santander', estado: 'cierre' },
    { id: 3, nombre: 'Pacto Nariño', departamento: 'Nariño', estado: 'implementacion' },
    { id: 4, nombre: 'Pacto Antioquia', departamento: 'Antioquia', estado: 'cierre' },
    { id: 5, nombre: 'Pacto Pacífico', departamento: 'Valle del Cauca', estado: 'implementacion' }
  ];
  pactoSeleccionado: Pacto | null = null;
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
      valorPorEjecutar: 80000000
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
      valorPorEjecutar: 80000000
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
      valorPorEjecutar: 55000000
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
      valorPorEjecutar: 50000000
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
      valorPorEjecutar: 130000000
    }
  };

  get pactosFiltrados() {
    return this.pactos.filter(p => p.estado === this.estadoSeleccionado);
  }

  seleccionarEstado(estado: 'implementacion' | 'cierre') {
    this.estadoSeleccionado = estado;
    this.pactoSeleccionado = null;
  }

  seleccionarPacto(pacto: Pacto) {
    this.pactoSeleccionado = pacto;
  }

  get datosClaveSeguro() {
    if (!this.pactoSeleccionado) return null;
    return this.datosClave[this.pactoSeleccionado.id] || null;
  }
}
