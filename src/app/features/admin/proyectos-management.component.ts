import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Proyecto } from '../../shared/models';
import { Observable } from 'rxjs';

interface ProyectoExtended extends Proyecto {
  pactoAsociado: string;
  fechaCreacion: Date;
}

@Component({
  selector: 'app-proyectos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos-management.component.html',
  styleUrl: './proyectos-management.component.css'
})
export class ProyectosManagementComponent implements OnInit {
  proyectos$: Observable<Proyecto[]>;

  newProyecto: Omit<ProyectoExtended, 'id' | 'fechaCreacion'> = {
    nombre: '',
    descripcion: '',
    codigo: '',
    presupuesto: 0,
    responsable: '',
    estado: 'Planeación',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    avance: 0,
    pactoAsociado: ''
  };

  estadosProyecto: string[] = [];
  pactosDisponibles: string[] = [];

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
  }

  ngOnInit(): void {
    this.estadosProyecto = this.proyectosService.getEstadosProyecto();
  }

  addProyecto(): void {
    const { nombre, descripcion, codigo, presupuesto, responsable, estado, fechaInicio, fechaFin, avance, pactoAsociado } = this.newProyecto;
    
    if (!nombre.trim() || !descripcion.trim() || !codigo.trim() || presupuesto <= 0 || !responsable.trim() || !pactoAsociado) {
      return;
    }

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion'> = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      codigo: codigo.trim(),
      presupuesto,
      responsable: responsable.trim(),
      estado,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      avance
    };

    this.proyectosService.addProyecto(proyectoBase);
    this.resetForm();
  }

  deleteProyecto(id: number): void {
    this.proyectosService.removeProyecto(id);
  }

  resetForm(): void {
    this.newProyecto = {
      nombre: '',
      descripcion: '',
      codigo: '',
      presupuesto: 0,
      responsable: '',
      estado: 'Planeación',
      fechaInicio: new Date(),
      fechaFin: new Date(),
      avance: 0,
      pactoAsociado: ''
    };
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  formatDate(date: Date): string {
    return this.dashboardService.formatDate(date);
  }

  getTotalPresupuesto(): number {
    return this.proyectosService.getTotalPresupuesto();
  }

  getProyectosPorEstado(estado: string): number {
    return this.proyectosService.getProyectosPorEstado(estado);
  }

  getAvancePromedio(): number {
    return this.proyectosService.getAvancePromedio();
  }
}
