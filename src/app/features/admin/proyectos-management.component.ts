import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateProyectoCommand, ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Pacto, Proyecto } from '../../shared/models';
import { Observable } from 'rxjs';
import { PactosService } from '../../core/services/pactos.service';
import { type ProyectoApiRow } from '../../core/services/proyectos.service';

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
  proyectosApi$: Observable<ProyectoApiRow[]>;

  // Catálogos que alimentan los selectores del formulario.
  estadosProyecto: string[] = [];
  pactosDisponibles: string[] = [];
  private pactosCatalogo: Pacto[] = [];
  private pactosOptionsFallback: Array<{ id: number; nombre: string }> = [];
  areasInfluencia: string[] = ['Urbana', 'Rural', 'Mixta', 'Regional'];
  condicionesProyecto: string[] = ['Nuevo', 'En curso', 'Viabilizado', 'Ajustado'];
  sectores: string[] = ['Transporte', 'Educación', 'Salud', 'Ambiente', 'Vivienda', 'Agro'];
  // Línea temática depende del pacto seleccionado (lineasTematicas del pacto).
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
  isSavingProyecto = false;
  saveProyectoError = '';

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
    this.proyectosApi$ = this.proyectosService.getProyectosCreadosDesdePactosApi();
  }

  ngOnInit(): void {
    // Carga estados y pactos disponibles al iniciar la pantalla.
    const estados = this.proyectosService.getEstadosProyecto();
    this.estadosProyecto = estados.includes('No iniciado') ? estados : ['No iniciado', ...estados];
    this.newProyecto.estadoProyecto = 'No iniciado';
    this.pactosService.getPactos().subscribe((pactos: Pacto[]) => {
      this.pactosCatalogo = pactos;
      this.pactosDisponibles = pactos.map((pacto) => pacto.nombre).filter(Boolean);

      // Fallback: si el cache está vacío, consultamos solo opciones mínimas desde API.
      if (!this.pactosDisponibles.length) {
        this.pactosService.getPactosOptionsFromApi().subscribe((rows) => {
          this.pactosOptionsFallback = rows;
          this.pactosDisponibles = rows.map((p) => p.nombre).filter(Boolean);
        });
      }
    });
  }

  get lineasTematicasDisponibles(): string[] {
    const pactoNombre = (this.newProyecto.pactoAsociado || '').trim();
    if (!pactoNombre) return [];

    const hit = this.pactosCatalogo.find((p) => (p.nombre || '').trim() === pactoNombre);
    const lineas = hit?.lineasTematicas ?? [];
    return Array.isArray(lineas) ? lineas.filter((x) => !!(x || '').trim()) : [];
  }

  onPactoAsociadoChange(): void {
    // Al cambiar pacto, reseteamos la línea temática si no aplica.
    const opciones = this.lineasTematicasDisponibles;
    if (!opciones.length) {
      this.newProyecto.lineaTematica = '';
      return;
    }
    if (this.newProyecto.lineaTematica && !opciones.includes(this.newProyecto.lineaTematica)) {
      this.newProyecto.lineaTematica = '';
    }
  }

  // Crea un proyecto nuevo cuando pasa las validaciones principales.
  addProyecto(): void {
    if (this.isSavingProyecto) return;
    this.saveProyectoError = '';

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
      console.warn('[SISPACTOS] No se guarda proyecto: validacion fallida.', {
        nombre: !!nombre.trim(),
        pactoAsociado: !!pactoAsociado.trim(),
        codigo: !!codigo.trim(),
        bpinValido,
        consecutivoConpesValido,
        actaCdNumero: !!actaCdNumero.trim(),
        actaCdFecha: !!actaCdFecha,
        municipioEntidad: !!municipioEntidad.trim(),
        entidadResponsablePi: !!entidadResponsablePi.trim(),
        estadoProyecto: !!estadoProyecto,
        contratoEspecificoValido
      });
      return;
    }

    const actaCd = `${actaCdNumero.trim()} - ${actaCdFecha}`;
    const responsableProyecto = `${municipioEntidad.trim()} - ${entidadResponsablePi.trim()}`;

    const idPactoTerritorial = this.findPactoIdByNombre(pactoAsociado.trim());
    if (!idPactoTerritorial) {
      this.saveProyectoError = 'No fue posible identificar el pacto seleccionado.';
      return;
    }

    const nowIso = new Date().toISOString();
    const command: CreateProyectoCommand = {
      idPactoTerritorial,
      idEntidadProyecto: entidadResponsablePi.trim(),
      bpin: bpin.trim(),
      nombreBpin: nombreBpin.trim(),
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      actaCd,
      idAreaInfluencia: 0,
      idEstadoProyecto: 0,
      idCondicionProyecto: 0,
      idSector: 0,
      idLineaTematica: 0,
      fechaInicio: nowIso,
      fechaFin: nowIso,
      plazoEstimadoEjecucion: 0,
      idFaseInversion: 0,
      idAportanteNacion: 0,
      entidadProyecto: municipioEntidad.trim(),
      esInversionClimatica: !!this.newProyecto.inversionClimatica,
      idTipoOferta: 0,
      esFondo: !!frpt,
      alcance: (alcance || nombreBpin).trim(),
      metaPa: (this.newProyecto.metaPa || '').trim(),
      idMecanismoInclusion: 0,
      idSectorAdministracionNacional: 0,
      fechaReporte: nowIso,
      numeroEmpleosDirectos: Number(numeroEmpleosDirectos) || 0,
      numeroEmpleosIndirectos: Number(numeroEmpleosIndirectos) || 0,
      consecutivoConpes: consecutivoConpes.trim(),
      tieneViabilidad: !!tieneViabilidad,
      fechaViabilidad: fechaViabilidad ? new Date(fechaViabilidad).toISOString() : nowIso,
      numeroContratoEspecifico: frpt ? String(numeroContratoEspecifico ?? '').trim() : ''
    };

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

    this.isSavingProyecto = true;
    this.proyectosService.createProyecto(command).subscribe((result) => {
      this.isSavingProyecto = false;
      if (!result.success) {
        this.saveProyectoError = result.message || 'No fue posible crear el proyecto.';
        return;
      }

      // Mientras el listado venga de almacenamiento local, agregamos el registro también al estado local.
      if (result.nombre) {
        proyectoBase.nombre = result.nombre;
      }
      this.proyectosService.addProyecto(proyectoBase);
      this.resetForm();
      this.tryCloseNuevoProyectoModal();
    });
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

  private findPactoIdByNombre(nombre: string): number | null {
    const hit = this.pactosCatalogo.find((p) => (p.nombre || '').trim() === nombre.trim());
    if (hit?.id) return hit.id;

    const fallback = this.pactosOptionsFallback.find((p) => (p.nombre || '').trim() === nombre.trim());
    return fallback?.id ?? null;
  }

  private tryCloseNuevoProyectoModal(): void {
    const el = document.getElementById('nuevoProyectoModal');
    if (!el) return;

    // Bootstrap puede estar disponible como global (bundle).
    const anyWindow = window as any;
    const bootstrap = anyWindow?.bootstrap;
    try {
      const instance = bootstrap?.Modal?.getOrCreateInstance?.(el);
      instance?.hide?.();
    } catch {
      // noop
    }
  }
}
