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
  actaCdNumero: string;
  actaCdFecha: string;
  areaInfluencia: string;
  estadoProyecto: string;
  condicionProyecto: string;
  sector: string;
  lineaTematica: string;
  plazoEstimadoEjecucion: string;
  numeroEmpleosDirectos: number;
  numeroEmpleosIndirectos: number;
  consecutivoConpes: string;
  tieneViabilidad: boolean;
  fechaViabilidad: string;
  frpt: boolean;
  numeroContratoEspecifico: string;
  aporteNacion: string;
  municipioEntidad: string;
  entidadResponsablePi: string;
  inversionClimatica: boolean;
  alcance: string;
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
  // Lista observable de proyectos para la vista.
  proyectos$: Observable<Proyecto[]>;

  // Catálogos que alimentan los selectores del formulario.
  estadosProyecto: string[] = [];
  pactosDisponibles: string[] = [];
  areasInfluencia: string[] = ['Urbana', 'Rural', 'Mixta', 'Regional'];
  condicionesProyecto: string[] = ['Nuevo', 'En curso', 'Viabilizado', 'Ajustado'];
  sectores: string[] = ['Transporte', 'Educación', 'Salud', 'Ambiente', 'Vivienda', 'Agro'];
  lineasTematicas: string[] = ['Infraestructura', 'Social', 'Productiva', 'Ambiental'];
  aportesNacion: string[] = ['Total', 'Parcial', 'Sin aporte'];
  mecanismosInclusion: string[] = ['Consulta previa', 'Enfoque diferencial', 'Participación comunitaria'];
  sectoresAdminNacional: string[] = ['DNP', 'MinTransporte', 'MinEducación', 'MinSalud', 'MinAmbiente'];
  readonly entidadesPorMunicipio: Record<string, string[]> = {
    Bogota: ['Alcaldia de Bogota', 'Empresa Metro de Bogota', 'IDU'],
    Medellin: ['Alcaldia de Medellin', 'EDU Medellin', 'Metro de Medellin'],
    Cali: ['Alcaldia de Cali', 'EMCALI', 'Metrocali'],
    Barranquilla: ['Alcaldia de Barranquilla', 'Area Metropolitana BAQ'],
    Bucaramanga: ['Alcaldia de Bucaramanga', 'AMB']
  };
  // Datos del formulario para crear un nuevo proyecto.
  newProyecto: ProyectoFormData = this.getInitialFormData();

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
  }

  ngOnInit(): void {
    // Carga estados y pactos disponibles al iniciar la pantalla.
    const estados = this.proyectosService.getEstadosProyecto();
    this.estadosProyecto = estados.includes('No iniciado') ? estados : ['No iniciado', ...estados];
    this.newProyecto.estadoProyecto = 'No iniciado';
    this.pactosService.getPactos().subscribe((pactos: Pacto[]) => {
      this.pactosDisponibles = pactos.map((pacto) => pacto.nombre).filter(Boolean);
    });
  }

  // Crea un proyecto nuevo cuando pasa las validaciones principales.
  addProyecto(): void {
    const {
      nombre,
      pactoAsociado,
      codigo,
      bpin,
      nombreBpin,
      actaCdNumero,
      actaCdFecha,
      sector,
      lineaTematica,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes,
      tieneViabilidad,
      fechaViabilidad,
      frpt,
      numeroContratoEspecifico,
      municipioEntidad,
      entidadResponsablePi,
      estadoProyecto,
      alcance
    } = this.newProyecto;

    const bpinValido = /^\d{13}$/.test(bpin.trim());
    const consecutivoConpesValido = /^\d{5}$/.test(consecutivoConpes.trim());
    const contratoEspecificoValido = !frpt || !!numeroContratoEspecifico.trim();

    if (
      !nombre.trim() ||
      !pactoAsociado.trim() ||
      !codigo.trim() ||
      !bpinValido ||
      !consecutivoConpesValido ||
      !actaCdNumero.trim() ||
      !actaCdFecha ||
      !municipioEntidad.trim() ||
      !entidadResponsablePi.trim() ||
      !estadoProyecto ||
      !contratoEspecificoValido
    ) {
      return;
    }

    const actaCd = `${actaCdNumero.trim()} - ${actaCdFecha}`;
    const responsableProyecto = `${municipioEntidad.trim()} - ${entidadResponsablePi.trim()}`;

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion'> = {
      nombre: nombre.trim(),
      descripcion: (alcance || nombreBpin).trim(),
      pactoAsociado: pactoAsociado.trim(),
      codigo: codigo.trim(),
      bpin: bpin.trim(),
      actaCd,
      sector,
      lineaTematica,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes: Number(consecutivoConpes),
      tieneViabilidad,
      fechaViabilidad: fechaViabilidad ? new Date(fechaViabilidad) : undefined,
      frpt,
      numeroContratoEspecifico: frpt && numeroContratoEspecifico ? Number(numeroContratoEspecifico) : undefined,
      presupuesto: 0,
      responsable: responsableProyecto,
      estado: estadoProyecto,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      avance: 0
    };

    this.proyectosService.addProyecto(proyectoBase);
    this.resetForm();
  }

  // Elimina un proyecto del listado.
  deleteProyecto(id: number): void {
    this.proyectosService.removeProyecto(id);
  }

  // Reinicia el formulario a su estado inicial.
  resetForm(): void {
    this.newProyecto = this.getInitialFormData();
  }

  get municipiosEntidadDisponibles(): string[] {
    return Object.keys(this.entidadesPorMunicipio);
  }

  get entidadesResponsableDisponibles(): string[] {
    return this.entidadesPorMunicipio[this.newProyecto.municipioEntidad] ?? [];
  }

  // Si se desmarca viabilidad, limpia su fecha asociada.
  onTieneViabilidadChange(): void {
    if (!this.newProyecto.tieneViabilidad) {
      this.newProyecto.fechaViabilidad = '';
    }
  }

  // Si FRPT está desactivado, limpia el número de contrato específico.
  onFrptChange(): void {
    if (!this.newProyecto.frpt) {
      this.newProyecto.numeroContratoEspecifico = '';
    }
  }

  // Al cambiar municipio, se reinicia la entidad responsable.
  onMunicipioEntidadChange(): void {
    this.newProyecto.entidadResponsablePi = '';
  }

  private getInitialFormData(): ProyectoFormData {
    return {
      pactoAsociado: '',
      bpin: '',
      nombreBpin: '',
      codigo: '',
      nombre: '',
      actaCdNumero: '',
      actaCdFecha: '',
      areaInfluencia: '',
      estadoProyecto: 'No iniciado',
      condicionProyecto: '',
      sector: '',
      lineaTematica: '',
      plazoEstimadoEjecucion: '',
      numeroEmpleosDirectos: 0,
      numeroEmpleosIndirectos: 0,
      consecutivoConpes: '',
      tieneViabilidad: false,
      fechaViabilidad: '',
      frpt: false,
      numeroContratoEspecifico: '',
      aporteNacion: '',
      municipioEntidad: '',
      entidadResponsablePi: '',
      inversionClimatica: false,
      alcance: '',
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

  onConpesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 5);
    this.newProyecto.consecutivoConpes = value;
  }
}
