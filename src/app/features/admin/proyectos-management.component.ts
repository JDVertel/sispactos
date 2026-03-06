import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Pacto, Proyecto } from '../../shared/models';
import { Observable } from 'rxjs';
import { PactosService } from '../../core/services/pactos.service';

interface ProyectoFormData {
  pactoAsociado: string;
  bpin: string;
  nombreBpin: string;
  codigo: string;
  nombre: string;
  actaCd: string;
  areaInfluencia: string;
  estadoProyecto: string;
  condicionProyecto: string;
  sector: string;
  lineaTematica: string;
  tipoProyecto: string;
  fechaInicio: string;
  fechaFin: string;
  plazoEstimadoEjecucion: string;
  fechaReporte: string;
  numeroEmpleosDirectos: number;
  numeroEmpleosIndirectos: number;
  consecutivoConpes: number;
  tieneViabilidad: boolean;
  fechaViabilidad: string;
  numeroContratoEspecifico: number;
  fechaFinalizacionCe: string;
  faseInversion: string;
  aporteNacion: string;
  entidadProyecto: string;
  inversionClimatica: boolean;
  derivado: boolean;
  tipoOferta: string;
  fondo: boolean;
  identificacionProblemas: string;
  objetivoGeneral: string;
  alcance: string;
  presupuestoDnp: number;
  presupuestoSector: number;
  presupuestoTerritorial: number;
  presupuestoOtros: number;
  presupuestoTotal: number;
  aporteRealDnp: number;
  aporteParcialIndicativo: number;
  valorGestionar: number;
  indicadorMedicionOg: string;
  unidadMedidaOg: string;
  metaIndicadorOg: string;
  productoAlcance: string;
  unidadMedida: string;
  metaPa: string;
  mecanismoInclusion: string;
  sectorAdminNacional: string;
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

  estadosProyecto: string[] = [];
  pactosDisponibles: string[] = [];
  areasInfluencia: string[] = ['Urbana', 'Rural', 'Mixta', 'Regional'];
  condicionesProyecto: string[] = ['Nuevo', 'En curso', 'Viabilizado', 'Ajustado'];
  sectores: string[] = ['Transporte', 'Educación', 'Salud', 'Ambiente', 'Vivienda', 'Agro'];
  lineasTematicas: string[] = ['Infraestructura', 'Social', 'Productiva', 'Ambiental'];
  tiposProyectoCatalogo: string[] = ['Estratégico', 'Misional', 'Infraestructura', 'Social'];
  fasesInversion: string[] = ['Prefactibilidad', 'Factibilidad', 'Ejecución', 'Operación'];
  aportesNacion: string[] = ['Total', 'Parcial', 'Sin aporte'];
  tiposOferta: string[] = ['Oferta institucional', 'Oferta territorial', 'Oferta mixta'];
  mecanismosInclusion: string[] = ['Consulta previa', 'Enfoque diferencial', 'Participación comunitaria'];
  sectoresAdminNacional: string[] = ['DNP', 'MinTransporte', 'MinEducación', 'MinSalud', 'MinAmbiente'];
  newProyecto: ProyectoFormData = this.getInitialFormData();

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
  }

  ngOnInit(): void {
    this.estadosProyecto = this.proyectosService.getEstadosProyecto();
    this.pactosService.getPactos().subscribe((pactos: Pacto[]) => {
      this.pactosDisponibles = pactos.map((pacto) => pacto.nombre).filter(Boolean);
    });
  }

  addProyecto(): void {
    const {
      nombre,
      pactoAsociado,
      codigo,
      bpin,
      sector,
      lineaTematica,
      tipoProyecto,
      faseInversion,
      fechaReporte,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes,
      tieneViabilidad,
      fechaViabilidad,
      numeroContratoEspecifico,
      fechaFinalizacionCe,
      entidadProyecto,
      estadoProyecto,
      fechaInicio,
      fechaFin,
      presupuestoTotal,
      objetivoGeneral,
      identificacionProblemas,
      alcance
    } = this.newProyecto;

    const bpinValido = /^\d{13}$/.test(bpin.trim());

    if (
      !nombre.trim() ||
      !pactoAsociado.trim() ||
      !codigo.trim() ||
      !bpinValido ||
      !entidadProyecto.trim() ||
      !estadoProyecto ||
      !fechaInicio ||
      !fechaFin ||
      presupuestoTotal <= 0
    ) {
      return;
    }

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion'> = {
      nombre: nombre.trim(),
      descripcion: (objetivoGeneral || identificacionProblemas || alcance).trim(),
      pactoAsociado: pactoAsociado.trim(),
      codigo: codigo.trim(),
      bpin: bpin.trim(),
      sector,
      lineaTematica,
      tipoProyecto,
      faseInversion,
      fechaReporte: fechaReporte ? new Date(fechaReporte) : undefined,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes,
      tieneViabilidad,
      fechaViabilidad: fechaViabilidad ? new Date(fechaViabilidad) : undefined,
      numeroContratoEspecifico,
      fechaFinalizacionCe: fechaFinalizacionCe ? new Date(fechaFinalizacionCe) : undefined,
      presupuesto: presupuestoTotal,
      responsable: entidadProyecto.trim(),
      estado: estadoProyecto,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      avance: 0
    };

    this.proyectosService.addProyecto(proyectoBase);
    this.resetForm();
  }

  deleteProyecto(id: number): void {
    this.proyectosService.removeProyecto(id);
  }

  resetForm(): void {
    this.newProyecto = this.getInitialFormData();
  }

  private getInitialFormData(): ProyectoFormData {
    return {
      pactoAsociado: '',
      bpin: '',
      nombreBpin: '',
      codigo: '',
      nombre: '',
      actaCd: '',
      areaInfluencia: '',
      estadoProyecto: this.estadosProyecto?.[0] ?? '',
      condicionProyecto: '',
      sector: '',
      lineaTematica: '',
      tipoProyecto: '',
      fechaInicio: '',
      fechaFin: '',
      plazoEstimadoEjecucion: '',
      fechaReporte: '',
      numeroEmpleosDirectos: 0,
      numeroEmpleosIndirectos: 0,
      consecutivoConpes: 0,
      tieneViabilidad: false,
      fechaViabilidad: '',
      numeroContratoEspecifico: 0,
      fechaFinalizacionCe: '',
      faseInversion: '',
      aporteNacion: '',
      entidadProyecto: '',
      inversionClimatica: false,
      derivado: false,
      tipoOferta: '',
      fondo: false,
      identificacionProblemas: '',
      objetivoGeneral: '',
      alcance: '',
      presupuestoDnp: 0,
      presupuestoSector: 0,
      presupuestoTerritorial: 0,
      presupuestoOtros: 0,
      presupuestoTotal: 0,
      aporteRealDnp: 0,
      aporteParcialIndicativo: 0,
      valorGestionar: 0,
      indicadorMedicionOg: '',
      unidadMedidaOg: '',
      metaIndicadorOg: '',
      productoAlcance: '',
      unidadMedida: '',
      metaPa: '',
      mecanismoInclusion: '',
      sectorAdminNacional: ''
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

  getTotalEmpleosDirectos(): number {
    return this.proyectosService.getTotalEmpleosDirectos();
  }

  getTotalEmpleosIndirectos(): number {
    return this.proyectosService.getTotalEmpleosIndirectos();
  }

  onBpinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 13);
    this.newProyecto.bpin = value;
  }
}
