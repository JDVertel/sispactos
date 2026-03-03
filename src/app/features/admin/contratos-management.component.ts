import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContratosService } from '../../core/services/contratos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Contrato } from '../../shared/models';
import { Observable } from 'rxjs';

interface ContratoExtended extends Contrato {
  proyectoAsociado: string;
  supervisor: string;
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
    numero: '',
    objeto: '',
    contratista: '',
    valorContrato: 0,
    tipoContrato: 'Obra Pública',
    estado: 'En Trámite',
    fechaSuscripcion: new Date(),
    fechaInicio: new Date(),
    fechaTerminacion: new Date(),
    proyectoAsociado: '',
    supervisor: ''
  };

  tiposContrato: string[] = [];
  estadosContrato: string[] = [];
  proyectosDisponibles: string[] = [];

  constructor(
    private contratosService: ContratosService,
    private dashboardService: DashboardService
  ) {
    this.contratos$ = this.contratosService.getContratos();
  }

  ngOnInit(): void {
    this.tiposContrato = this.contratosService.getTiposContrato();
    this.estadosContrato = this.contratosService.getEstadosContrato();
  }

  addContrato(): void {
    const { numero, objeto, contratista, valorContrato, tipoContrato, estado, fechaSuscripcion, fechaInicio, fechaTerminacion, proyectoAsociado, supervisor } = this.newContrato;
    
    if (!numero.trim() || !objeto.trim() || !contratista.trim() || valorContrato <= 0 || !proyectoAsociado || !supervisor.trim()) {
      return;
    }

    this.contratosService.addContrato(this.newContrato);
    this.resetForm();
  }

  deleteContrato(id: number): void {
    this.contratosService.removeContrato(id);
  }

  resetForm(): void {
    this.newContrato = {
      numero: '',
      objeto: '',
      contratista: '',
      valorContrato: 0,
      tipoContrato: 'Obra Pública',
      estado: 'En Trámite',
      fechaSuscripcion: new Date(),
      fechaInicio: new Date(),
      fechaTerminacion: new Date(),
      proyectoAsociado: '',
      supervisor: ''
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

  getContratosPorEstado(estado: string): number {
    return this.contratosService.getContratosPorEstado(estado);
  }

  getContratosPorTipo(tipo: string): number {
    return this.contratosService.getContratosPorTipo(tipo);
  }
}
