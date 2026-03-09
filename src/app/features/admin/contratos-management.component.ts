import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContratosService } from '../../core/services/contratos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Contrato, Pacto, Proyecto } from '../../shared/models';
import { Observable } from 'rxjs';
import { PactosService } from '../../core/services/pactos.service';
import { ProyectosService } from '../../core/services/proyectos.service';

interface ContratoExtended extends Contrato {
  fechaCreacion: Date;
}

@Component({
  selector: 'app-contratos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contratos-management.component.html',
  styleUrl: './contratos-management.component.css'
})
export class ContratosManagementComponent implements OnInit {
  contratos$: Observable<ContratoExtended[]>;

  newContrato: Omit<ContratoExtended, 'id' | 'fechaCreacion'> = {
    pacto: '',
    proyecto: '',
    contratista: '',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    contratoPadre: '',
    tipoContrato: '',
    contratante: '',
    valorInicial: 0,
    supervisor: '',
    objeto: '',
    urlSecop: ''
  };

  tiposContrato: string[] = [];
  pactosDisponibles: string[] = [];
  proyectosPorPacto: Record<string, string[]> = {};
  proyectosDisponibles: string[] = [];
  contratistasDisponibles: string[] = [];
  contratosPadreDisponibles: string[] = [];
  contratantesDisponibles: string[] = [];
  supervisoresDisponibles: string[] = [];

  constructor(
    private contratosService: ContratosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService,
    private proyectosService: ProyectosService
  ) {
    this.contratos$ = this.contratosService.getContratos();
  }

  ngOnInit(): void {
    this.tiposContrato = this.contratosService.getTiposContrato();
    this.contratistasDisponibles = this.contratosService.getContratistas();
    this.contratosPadreDisponibles = this.contratosService.getContratosPadre();
    this.contratantesDisponibles = this.contratosService.getContratantes();
    this.supervisoresDisponibles = this.contratosService.getSupervisores();

    this.pactosService.getPactos().subscribe((pactos: Pacto[]) => {
      this.pactosDisponibles = pactos.map((pacto) => pacto.nombre).filter(Boolean);
      this.ensureDefaultPactoProyecto();
    });

    this.proyectosService.getProyectos().subscribe((proyectos: Proyecto[]) => {
      const agrupados: Record<string, string[]> = {};
      proyectos.forEach((proyecto) => {
        const pactoNombre = proyecto.pactoAsociado?.trim();
        if (!pactoNombre) {
          return;
        }
        if (!agrupados[pactoNombre]) {
          agrupados[pactoNombre] = [];
        }
        agrupados[pactoNombre].push(proyecto.nombre);
      });

      this.proyectosPorPacto = agrupados;
      this.ensureDefaultPactoProyecto();
    });

    this.newContrato.contratista = this.contratistasDisponibles[0] ?? '';
    this.newContrato.contratoPadre = this.contratosPadreDisponibles[0] ?? '';
    this.newContrato.tipoContrato = this.tiposContrato[0] ?? '';
    this.newContrato.contratante = this.contratantesDisponibles[0] ?? '';
    this.newContrato.supervisor = this.supervisoresDisponibles[0] ?? '';
  }

  addContrato(): void {
    const { pacto, proyecto, contratista, fechaInicio, fechaFin, contratoPadre, tipoContrato, contratante, valorInicial, supervisor, objeto, urlSecop } = this.newContrato;
    const contratoPadreValido = /^[a-zA-Z0-9-]+$/.test(contratoPadre.trim());

    if (
      !pacto ||
      !proyecto ||
      !contratista ||
      !fechaInicio ||
      !fechaFin ||
      !contratoPadreValido ||
      !tipoContrato ||
      !contratante ||
      valorInicial <= 0 ||
      !supervisor ||
      !objeto.trim() ||
      !urlSecop.trim()
    ) {
      return;
    }

    this.contratosService.addContrato({
      ...this.newContrato,
      contratoPadre: contratoPadre.trim(),
      objeto: objeto.trim(),
      urlSecop: urlSecop.trim()
    });
    this.resetForm();
  }

  deleteContrato(id: number): void {
    this.contratosService.removeContrato(id);
  }

  resetForm(): void {
    const pacto = this.pactosDisponibles[0] ?? '';
    this.newContrato = {
      pacto,
      proyecto: this.getProyectosPorPacto(pacto)[0] ?? '',
      contratista: this.contratistasDisponibles[0] ?? '',
      fechaInicio: new Date(),
      fechaFin: new Date(),
      contratoPadre: this.contratosPadreDisponibles[0] ?? '',
      tipoContrato: this.tiposContrato[0] ?? '',
      contratante: this.contratantesDisponibles[0] ?? '',
      valorInicial: 0,
      supervisor: this.supervisoresDisponibles[0] ?? '',
      objeto: '',
      urlSecop: ''
    };
    this.proyectosDisponibles = this.getProyectosPorPacto(this.newContrato.pacto);
  }

  onPactoChange(): void {
    this.proyectosDisponibles = this.getProyectosPorPacto(this.newContrato.pacto);
    this.newContrato.proyecto = this.proyectosDisponibles[0] ?? '';
  }

  onContratoPadreInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newContrato.contratoPadre = input.value.replace(/[^a-zA-Z0-9-]/g, '');
  }

  private getProyectosPorPacto(pacto: string): string[] {
    return this.proyectosPorPacto[pacto] ?? [];
  }

  private ensureDefaultPactoProyecto(): void {
    if (!this.newContrato.pacto) {
      this.newContrato.pacto = this.pactosDisponibles[0] ?? '';
    }
    this.proyectosDisponibles = this.getProyectosPorPacto(this.newContrato.pacto);
    if (!this.newContrato.proyecto) {
      this.newContrato.proyecto = this.proyectosDisponibles[0] ?? '';
    }
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  formatDate(date: Date): string {
    return this.dashboardService.formatDate(date);
  }

  getTotalValorContratos(): number {
    return this.contratosService.getTotalValorContratos();
  }

  getContratosConSecop(): number {
    return this.contratosService.getContratosConSecop();
  }
}
