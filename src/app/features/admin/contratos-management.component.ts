import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContratosService } from '../../core/services/contratos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Contrato } from '../../shared/models';
import { Observable } from 'rxjs';

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
    proyecto: '',
    contratista: '',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    contratoPadre: '',
    tipoContrato: '',
    contratante: '',
    valor: 0,
    supervisor: '',
    objeto: '',
    urlSecop: ''
  };

  tiposContrato: string[] = [];
  proyectosDisponibles: string[] = [];
  contratistasDisponibles: string[] = [];
  contratosPadreDisponibles: string[] = [];
  contratantesDisponibles: string[] = [];
  supervisoresDisponibles: string[] = [];

  constructor(
    private contratosService: ContratosService,
    private dashboardService: DashboardService
  ) {
    this.contratos$ = this.contratosService.getContratos();
  }

  ngOnInit(): void {
    this.tiposContrato = this.contratosService.getTiposContrato();
    this.proyectosDisponibles = this.contratosService.getProyectos();
    this.contratistasDisponibles = this.contratosService.getContratistas();
    this.contratosPadreDisponibles = this.contratosService.getContratosPadre();
    this.contratantesDisponibles = this.contratosService.getContratantes();
    this.supervisoresDisponibles = this.contratosService.getSupervisores();

    this.newContrato.proyecto = this.proyectosDisponibles[0] ?? '';
    this.newContrato.contratista = this.contratistasDisponibles[0] ?? '';
    this.newContrato.contratoPadre = this.contratosPadreDisponibles[0] ?? '';
    this.newContrato.tipoContrato = this.tiposContrato[0] ?? '';
    this.newContrato.contratante = this.contratantesDisponibles[0] ?? '';
    this.newContrato.supervisor = this.supervisoresDisponibles[0] ?? '';
  }

  addContrato(): void {
    const { proyecto, contratista, fechaInicio, fechaFin, contratoPadre, tipoContrato, contratante, valor, supervisor, objeto, urlSecop } = this.newContrato;

    if (
      !proyecto ||
      !contratista ||
      !fechaInicio ||
      !fechaFin ||
      !contratoPadre ||
      !tipoContrato ||
      !contratante ||
      valor <= 0 ||
      !supervisor ||
      !objeto.trim() ||
      !urlSecop.trim()
    ) {
      return;
    }

    this.contratosService.addContrato({
      ...this.newContrato,
      objeto: objeto.trim(),
      urlSecop: urlSecop.trim()
    });
    this.resetForm();
  }

  deleteContrato(id: number): void {
    this.contratosService.removeContrato(id);
  }

  resetForm(): void {
    this.newContrato = {
      proyecto: this.proyectosDisponibles[0] ?? '',
      contratista: this.contratistasDisponibles[0] ?? '',
      fechaInicio: new Date(),
      fechaFin: new Date(),
      contratoPadre: this.contratosPadreDisponibles[0] ?? '',
      tipoContrato: this.tiposContrato[0] ?? '',
      contratante: this.contratantesDisponibles[0] ?? '',
      valor: 0,
      supervisor: this.supervisoresDisponibles[0] ?? '',
      objeto: '',
      urlSecop: ''
    };
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
