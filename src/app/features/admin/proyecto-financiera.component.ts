import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  createEmptyComprometidoDetalle,
  detalleToComprometidoCompleto,
  etiquetaNuevaVersionComprometido,
  relabelVersionesComprometido,
  sumarComprometidoDetalles,
  tipoVersionNuevaComprometido
} from '../../core/financiera/proyecto-financiera-comprometido.util';
import {
  calcularDetalleLiberacionSugerida,
  LIBERACION_RUBROS,
  LiberacionRubroPar
} from '../../core/financiera/proyecto-financiera-liberacion.util';
import {
  aplicarTotalesComprometido,
  aplicarTotalesIndicativos,
  calcularTotalesComprometidoDesdeDetalle,
  calcularTotalesIndicativos,
  FinancieraTotalesSesion
} from '../../core/financiera/proyecto-financiera.calculos';
import { AuthService } from '../../core/services/auth.service';
import { ProyectoFinancieraService } from '../../core/services/proyecto-financiera.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  ProyectoFinancieraComprometidoDetalle,
  ProyectoFinancieraComprometidoVersion,
  ProyectoFinancieraData,
  ProyectoFinancieraVigencia,
  createEmptyProyectoFinancieraData,
  isProyectoFinancieraConpesRegistrado
} from '../../shared/models/proyecto-financiera.model';
import { Proyecto } from '../../shared/models';

type FinancieraTab = 'indicativos' | 'comprometido' | 'liberacion' | 'conpes';
type FinancieraGrupo = 'indicativos' | 'comprometido';

interface VigenciaModalForm {
  valor: number | null;
  valorDisplay: string;
  anio: number | null;
}

interface ConpesModalForm {
  numeroConpes: string;
  fechaConpes: string;
  consecutivoProyecto: string;
}

interface FinancieraCampoDetalle {
  key: string;
  label: string;
  group: FinancieraGrupo;
}

export type FinancieraEstadoGuardado = 'guardado' | 'pendiente' | 'guardando';

@Component({
  selector: 'app-proyecto-financiera',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './proyecto-financiera.component.html',
  styleUrl: './proyecto-financiera.component.css'
})
export class ProyectoFinancieraComponent implements OnInit, OnDestroy {
  proyecto: Proyecto | null = null;
  financiera: ProyectoFinancieraData = createEmptyProyectoFinancieraData(0);
  activeTab: FinancieraTab = 'indicativos';
  guardadoOk = false;
  guardadoAutomaticoReciente = false;
  estadoGuardado: FinancieraEstadoGuardado = 'guardado';
  vigenciaModalError = '';
  conpesModalError = '';
  comprometidoModalError = '';
  comprometidoVersionSeleccionadaId: string | null = null;
  comprometidoModalForm: ProyectoFinancieraComprometidoDetalle = createEmptyComprometidoDetalle();
  private vigenciaEditIndex: number | null = null;
  conpesModalEsEdicion = false;
  vigenciaModalForm: VigenciaModalForm = this.emptyVigenciaModalForm();
  conpesModalForm: ConpesModalForm = this.emptyConpesModalForm();

  private ultimoSnapshotGuardado = '';
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private guardadoAutomaticoTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AUTOSAVE_MS = 600;
  private modalComprometidoAbierto = false;
  private modalConpesAbierto = false;
  private modalVigenciaAbierto = false;
  private conpesModalSnapshotInicial = '';
  private vigenciaModalSnapshotInicial = '';

  readonly camposDetalleIndicativos: FinancieraCampoDetalle[] = [
    { key: 'aporteIndicativoDnpFrpt', label: 'Aporte indicativo DNP FRPT', group: 'indicativos' },
    { key: 'aporteIndicativoDnpDistribucion', label: 'Aporte indicativo DNP distribucion', group: 'indicativos' },
    { key: 'aporteIndicativoSector', label: 'Aporte indicativo sector', group: 'indicativos' },
    { key: 'aporteIndicativoPropiosEtDptos', label: 'Aporte indicativo propios ET Dptos', group: 'indicativos' },
    { key: 'aporteIndicativoEtMunicipios', label: 'Aporte indicativo ET Municipios', group: 'indicativos' },
    { key: 'aporteIndicativoRegaliasDirectasDptos', label: 'Aporte indicativo Regalias directas Dptos', group: 'indicativos' },
    { key: 'aporteIndicativoRegaliasDirectasMunicipios', label: 'Aporte indicativo Regalias directas Municipios', group: 'indicativos' },
    {
      key: 'aporteIndicativoAsignacionFondoRegionalSgr60',
      label: 'Aporte indicativo asignacion fondo regional SGR (60%)',
      group: 'indicativos'
    },
    {
      key: 'aporteIndicativoAsignacionFondoRegionalSgr40',
      label: 'Aporte indicativo asignacion fondo regional SGR (40%)',
      group: 'indicativos'
    },
    { key: 'aporteIndicativoCtelSgr', label: 'Aporte indicativo CTEL-SGR', group: 'indicativos' },
    { key: 'aporteIndicativoAsignacionAmbiental', label: 'Aporte indicativo asignacion ambiental', group: 'indicativos' },
    {
      key: 'aporteIndicativoAsignacionInversionLocalSgr',
      label: 'Aporte indicativo asignacion para inversion local SGR',
      group: 'indicativos'
    },
    { key: 'aporteIndicativoOcadPaz', label: 'Aporte indicativo OCAD PAZ', group: 'indicativos' },
    { key: 'aporteIndicativoOtrosTerritorio', label: 'Aporte indicativo otros territorio', group: 'indicativos' },
    { key: 'aporteIndicativoOtros', label: 'Aporte indicativo otros', group: 'indicativos' }
  ];

  readonly camposDetalleComprometido: FinancieraCampoDetalle[] = [
    { key: 'presupuestoComprometidoDnpFrpt', label: 'Presupuesto comprometido DNP-FRPT', group: 'comprometido' },
    { key: 'presupuestoComprometidoDnpDistribucion', label: 'Presupuesto comprometido DNP-distribucion', group: 'comprometido' },
    { key: 'presupuestoComprometidoSector', label: 'Presupuesto comprometido sector', group: 'comprometido' },
    { key: 'presupuestoComprometidoPropiosEtDptos', label: 'Presupuesto comprometido propios ET Dptos', group: 'comprometido' },
    { key: 'presupuestoComprometidoEtMunicipios', label: 'Presupuesto comprometido ET Municipios', group: 'comprometido' },
    { key: 'presupuestoComprometidoRegaliasDirectasDpto', label: 'Presupuesto comprometido regalias directas Dpto', group: 'comprometido' },
    {
      key: 'presupuestoComprometidoRegaliasDirectasMunicipios',
      label: 'Presupuesto comprometido regalias directas Municipios',
      group: 'comprometido'
    },
    {
      key: 'presupuestoComprometidoFondoRegionalSgr60',
      label: 'Presupuesto comprometido fondo regional SGR (60%)',
      group: 'comprometido'
    },
    {
      key: 'presupuestoComprometidoFondoRegionalSgr40',
      label: 'Presupuesto comprometido fondo regional SGR (40%)',
      group: 'comprometido'
    },
    { key: 'presupuestoComprometidoCtelSgr', label: 'Presupuesto comprometido CTEL-SGR', group: 'comprometido' },
    {
      key: 'presupuestoComprometidoAsignacionAmbiental',
      label: 'Presupuesto comprometido asignacion ambiental',
      group: 'comprometido'
    },
    {
      key: 'presupuestoComprometidoAsignacionInversionLocalSgr',
      label: 'Presupuesto comprometido asignacion para inversion local SGR',
      group: 'comprometido'
    },
    { key: 'presupuestoComprometidoOcadPaz', label: 'Presupuesto comprometido OCAD PAZ', group: 'comprometido' },
    { key: 'presupuestoComprometidoOtrosTerritorios', label: 'Presupuesto comprometido otros territorios', group: 'comprometido' },
    { key: 'presupuestoComprometidoAportesOtros', label: 'Presupuesto comprometido aportes otros', group: 'comprometido' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly proyectosService: ProyectosService,
    private readonly financieraService: ProyectoFinancieraService,
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('proyectoId');
    const proyectoId = Number(idParam);
    if (!Number.isFinite(proyectoId) || proyectoId < 1) {
      void this.router.navigate(['/dashboard/gestion-proyectos']);
      return;
    }

    this.proyecto =
      this.proyectosService.getProyectosSnapshot().find((p) => (p.apiId ?? p.id) === proyectoId) ?? null;
    if (!this.proyecto) {
      void this.router.navigate(['/dashboard/gestion-proyectos']);
      return;
    }

    this.financiera = this.financieraService.getByProyectoId(proyectoId);
    this.sincronizarComprometidoDesdeVersiones();
    this.seleccionarPrimeraVersionComprometidoSiHay();
    this.actualizarSnapshotGuardado();
    setTimeout(() => this.registrarCierreModalesBootstrap(), 0);
  }

  ngOnDestroy(): void {
    this.cancelarAutosaveProgramado();
    if (this.guardadoAutomaticoTimer) {
      clearTimeout(this.guardadoAutomaticoTimer);
    }
    this.desregistrarCierreModalesBootstrap();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.requiereConfirmacionAlSalir()) {
      event.preventDefault();
    }
  }

  get tieneCambiosPendientes(): boolean {
    return this.estadoGuardado === 'pendiente';
  }

  get etiquetaEstadoGuardado(): string {
    switch (this.estadoGuardado) {
      case 'guardando':
        return 'Guardando…';
      case 'pendiente':
        return 'Guardando cambios…';
      default:
        return 'Guardado automáticamente';
    }
  }

  /** Usado por el guard de ruta y el enlace Volver. */
  confirmarNavegacionFuera(): boolean {
    this.sincronizarEstadoModales();
    if (!this.confirmarSiModalAbiertoConCambios()) {
      return false;
    }
    this.flushAutosaveSiPendiente();
    return true;
  }

  onVolverClick(event: MouseEvent): void {
    if (!this.confirmarNavegacionFuera()) {
      event.preventDefault();
    }
  }

  get conpesRegistrado(): boolean {
    return isProyectoFinancieraConpesRegistrado(this.financiera.conpes);
  }

  get conpesModalTitulo(): string {
    return this.conpesModalEsEdicion ? 'Editar sesión CONPES' : 'Registrar sesión CONPES';
  }

  get vigenciasConpesOrdenadas(): ProyectoFinancieraVigencia[] {
    return [...this.financiera.conpes.vigencias].sort((a, b) => (a.anio ?? 0) - (b.anio ?? 0));
  }

  get vigenciaModalTitulo(): string {
    return this.vigenciaEditIndex != null ? 'Editar vigencia por año' : 'Agregar vigencia por año';
  }

  get totalesIndicativos(): FinancieraTotalesSesion {
    return calcularTotalesIndicativos(this.financiera.indicativos);
  }

  get totalesComprometido(): FinancieraTotalesSesion {
    const detalle = sumarComprometidoDetalles(this.financiera.comprometidoSesion.versiones);
    return calcularTotalesComprometidoDesdeDetalle(detalle);
  }

  readonly rubrosLiberacion: LiberacionRubroPar[] = LIBERACION_RUBROS;

  get detalleComprometidoAcumulado(): ProyectoFinancieraComprometidoDetalle {
    return sumarComprometidoDetalles(this.financiera.comprometidoSesion.versiones);
  }

  get detalleLiberacionSugerida(): ProyectoFinancieraComprometidoDetalle {
    return calcularDetalleLiberacionSugerida(this.financiera.indicativos, this.detalleComprometidoAcumulado);
  }

  get totalesLiberacionSugerida(): FinancieraTotalesSesion {
    return calcularTotalesComprometidoDesdeDetalle(this.detalleLiberacionSugerida);
  }

  valorIndicativoRubro(rubro: LiberacionRubroPar): number {
    return Number(this.financiera.indicativos[rubro.indicativoKey]) || 0;
  }

  valorComprometidoRubro(rubro: LiberacionRubroPar): number {
    return Number(this.detalleComprometidoAcumulado[rubro.comprometidoKey]) || 0;
  }

  valorSugeridoLiberacionRubro(rubro: LiberacionRubroPar): number {
    return Number(this.detalleLiberacionSugerida[rubro.comprometidoKey]) || 0;
  }

  get comprometidoModalTitulo(): string {
    const etiqueta = etiquetaNuevaVersionComprometido(this.financiera.comprometidoSesion.versiones);
    return `Registrar ${etiqueta}`;
  }

  get versionesComprometidoOrdenadas(): ProyectoFinancieraComprometidoVersion[] {
    return [...this.financiera.comprometidoSesion.versiones].sort(
      (a, b) => new Date(a.registradoEn || 0).getTime() - new Date(b.registradoEn || 0).getTime()
    );
  }

  get comprometidoVersionSeleccionada(): ProyectoFinancieraComprometidoVersion | null {
    if (!this.comprometidoVersionSeleccionadaId) {
      return null;
    }
    return (
      this.financiera.comprometidoSesion.versiones.find(
        (v) => v.id === this.comprometidoVersionSeleccionadaId
      ) ?? null
    );
  }

  get cantidadVersionesComprometido(): number {
    return this.financiera.comprometidoSesion.versiones.length;
  }

  setTab(tab: FinancieraTab): void {
    if (tab === this.activeTab) {
      return;
    }
    this.sincronizarEstadoModales();
    if (!this.confirmarSiModalAbiertoConCambios()) {
      return;
    }
    const habiaPendientes = this.tieneCambiosPendientesEnDatos();
    this.flushAutosaveSiPendiente();
    this.activeTab = tab;
    if (habiaPendientes) {
      this.mostrarAvisoGuardadoAutomatico();
    }
  }

  get valorTotalVigencias(): number {
    return this.vigenciasConpesOrdenadas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
  }

  get cantidadVigenciasRegistradas(): number {
    return this.financiera.conpes.vigencias.length;
  }

  valorCampo(campo: FinancieraCampoDetalle): number | null {
    const raw = (this.financiera.indicativos as unknown as Record<string, number | null>)[campo.key];
    return raw ?? null;
  }

  valorCampoVersionComprometido(campo: FinancieraCampoDetalle): number | null {
    const version = this.comprometidoVersionSeleccionada;
    if (!version) {
      return null;
    }
    const raw = (version.detalle as unknown as Record<string, number | null>)[campo.key];
    return raw ?? null;
  }

  totalesVersionComprometido(version: ProyectoFinancieraComprometidoVersion): FinancieraTotalesSesion {
    return calcularTotalesComprometidoDesdeDetalle(version.detalle);
  }

  /** Totales acumulados hasta la versión indicada (inclusive), alineados con la cabecera. */
  totalesComprometidoAcumuladosHasta(version: ProyectoFinancieraComprometidoVersion): FinancieraTotalesSesion {
    const ordenadas = this.versionesComprometidoOrdenadas;
    const indice = ordenadas.findIndex((v) => v.id === version.id);
    const hasta = indice < 0 ? [] : ordenadas.slice(0, indice + 1);
    const detalle = sumarComprometidoDetalles(hasta);
    return calcularTotalesComprometidoDesdeDetalle(detalle);
  }

  get totalesVersionComprometidoSeleccionada(): FinancieraTotalesSesion | null {
    const version = this.comprometidoVersionSeleccionada;
    return version ? this.totalesVersionComprometido(version) : null;
  }

  get totalesAcumuladosVersionSeleccionada(): FinancieraTotalesSesion | null {
    const version = this.comprometidoVersionSeleccionada;
    return version ? this.totalesComprometidoAcumuladosHasta(version) : null;
  }

  actualizarCampo(campo: FinancieraCampoDetalle, value: string): void {
    const parsed = value === '' ? null : Number(value);
    const num = parsed != null && Number.isFinite(parsed) ? parsed : null;
    (this.financiera.indicativos as unknown as Record<string, number | null>)[campo.key] = num;
    this.programarAutosave();
  }

  actualizarComprometidoModalCampo(campo: FinancieraCampoDetalle, value: string): void {
    const parsed = value === '' ? null : Number(value);
    const num = parsed != null && Number.isFinite(parsed) ? parsed : null;
    (this.comprometidoModalForm as unknown as Record<string, number | null>)[campo.key] = num;
    this.comprometidoModalError = '';
  }

  valorComprometidoModalCampo(campo: FinancieraCampoDetalle): number | null {
    const raw = (this.comprometidoModalForm as unknown as Record<string, number | null>)[campo.key];
    return raw ?? null;
  }

  seleccionarVersionComprometido(version: ProyectoFinancieraComprometidoVersion): void {
    this.comprometidoVersionSeleccionadaId = version.id;
  }

  abrirModalNuevaVersionComprometido(): void {
    this.comprometidoModalForm = createEmptyComprometidoDetalle();
    this.comprometidoModalError = '';
    this.modalComprometidoAbierto = true;
    setTimeout(() => this.showBootstrapModal('comprometidoVersionModal'), 0);
  }

  cerrarModalComprometido(): void {
    if (!this.confirmarCerrarModalComprometido()) {
      return;
    }
    this.hideBootstrapModal('comprometidoVersionModal');
    this.comprometidoModalError = '';
    this.comprometidoModalForm = createEmptyComprometidoDetalle();
    this.modalComprometidoAbierto = false;
  }

  guardarComprometidoModal(): void {
    const error = this.validarComprometidoModal();
    if (error) {
      this.comprometidoModalError = error;
      return;
    }

    const usuario = this.usuarioActualEtiqueta();
    const ahora = new Date().toISOString();
    const versiones = this.financiera.comprometidoSesion.versiones;
    const etiqueta = etiquetaNuevaVersionComprometido(versiones);
    const tipoVersion = tipoVersionNuevaComprometido(versiones);
    const nueva: ProyectoFinancieraComprometidoVersion = {
      id: this.nuevoIdComprometidoVersion(),
      etiqueta,
      tipoVersion,
      detalle: { ...this.comprometidoModalForm },
      registradoPor: usuario,
      registradoEn: ahora
    };

    this.financiera.comprometidoSesion = {
      versiones: relabelVersionesComprometido([...versiones, nueva])
    };
    this.comprometidoVersionSeleccionadaId = nueva.id;
    this.persistirFinanciera({ silencioso: true });
    this.cerrarModalComprometidoForzado();
  }

  usuarioComprometidoVersion(version: ProyectoFinancieraComprometidoVersion): string {
    return (version.registradoPor || '—').trim() || '—';
  }

  fechaComprometidoVersion(version: ProyectoFinancieraComprometidoVersion): string {
    return this.formatIsoFechaHora(version.registradoEn);
  }

  trackComprometidoVersion(_index: number, version: ProyectoFinancieraComprometidoVersion): string {
    return version.id;
  }

  abrirModalRegistrarConpes(): void {
    this.conpesModalEsEdicion = this.conpesRegistrado;
    const c = this.financiera.conpes;
    this.conpesModalForm = {
      numeroConpes: c.numeroConpes || '',
      fechaConpes: c.fechaConpes || '',
      consecutivoProyecto:
        c.consecutivoProyecto
        || (this.proyecto?.consecutivoConpes != null ? String(this.proyecto.consecutivoConpes) : '')
    };
    this.conpesModalError = '';
    this.conpesModalSnapshotInicial = this.snapshotConpesModalForm();
    this.modalConpesAbierto = true;
    setTimeout(() => this.showBootstrapModal('conpesSesionModal'), 0);
  }

  cerrarModalConpes(): void {
    if (!this.confirmarCerrarModalConpes()) {
      return;
    }
    this.cerrarModalConpesForzado();
  }

  guardarConpesModal(): void {
    const error = this.validarConpesModal();
    if (error) {
      this.conpesModalError = error;
      return;
    }

    const usuario = this.usuarioActualEtiqueta();
    const ahora = new Date().toISOString();
    const prev = this.financiera.conpes;

    this.financiera.conpes = {
      ...prev,
      numeroConpes: this.conpesModalForm.numeroConpes.trim(),
      fechaConpes: this.conpesModalForm.fechaConpes.trim(),
      consecutivoProyecto: this.conpesModalForm.consecutivoProyecto.trim()
    };

    if (!this.conpesModalEsEdicion) {
      this.financiera.conpes.registradoPor = usuario;
      this.financiera.conpes.registradoEn = ahora;
    } else {
      this.financiera.conpes.actualizadoPor = usuario;
      this.financiera.conpes.actualizadoEn = ahora;
    }

    this.persistirFinanciera({ silencioso: true });
    this.cerrarModalConpesForzado();
  }

  usuarioConpes(): string {
    const c = this.financiera.conpes;
    return (c.actualizadoPor || c.registradoPor || '—').trim() || '—';
  }

  fechaRegistroConpes(): string {
    return this.formatIsoFechaHora(
      this.financiera.conpes.actualizadoEn || this.financiera.conpes.registradoEn
    );
  }

  fechaConpesDisplay(): string {
    const ymd = this.financiera.conpes.fechaConpes;
    if (!ymd) {
      return '—';
    }
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return ymd;
    }
    return d.toLocaleDateString('es-CO', { dateStyle: 'medium' });
  }

  abrirModalNuevaVigencia(): void {
    if (!this.conpesRegistrado) {
      this.conpesModalError = '';
      return;
    }
    this.vigenciaEditIndex = null;
    this.vigenciaModalForm = {
      valor: null,
      valorDisplay: '',
      anio: new Date().getFullYear()
    };
    this.vigenciaModalSnapshotInicial = this.snapshotVigenciaModalForm();
    this.modalVigenciaAbierto = true;
    this.vigenciaModalError = '';
    this.abrirModalVigencia();
  }

  abrirModalEditarVigencia(vigencia: ProyectoFinancieraVigencia): void {
    const index = this.financiera.conpes.vigencias.findIndex((v) => v.id === vigencia.id);
    if (index < 0) {
      return;
    }
    this.vigenciaEditIndex = index;
    const valor = vigencia.valor;
    this.vigenciaModalForm = {
      valor,
      valorDisplay: valor != null && Number.isFinite(valor) ? this.formatCurrencyInput(valor) : '',
      anio: vigencia.anio
    };
    this.vigenciaModalSnapshotInicial = this.snapshotVigenciaModalForm();
    this.modalVigenciaAbierto = true;
    this.vigenciaModalError = '';
    this.abrirModalVigencia();
  }

  cerrarModalVigencia(): void {
    if (!this.confirmarCerrarModalVigencia()) {
      return;
    }
    this.cerrarModalVigenciaForzado();
  }

  onVigenciaModalValorChange(raw: string): void {
    this.vigenciaModalForm.valorDisplay = raw;
    this.vigenciaModalForm.valor = this.parseCurrencyInput(raw);
    this.vigenciaModalError = '';
  }

  onVigenciaModalValorFocus(): void {
    const valor = this.vigenciaModalForm.valor;
    if (valor != null && Number.isFinite(valor)) {
      this.vigenciaModalForm.valorDisplay = String(Math.trunc(valor));
    }
  }

  onVigenciaModalValorBlur(): void {
    const valor = this.vigenciaModalForm.valor;
    this.vigenciaModalForm.valorDisplay =
      valor != null && Number.isFinite(valor) ? this.formatCurrencyInput(valor) : '';
  }

  guardarVigenciaModal(): void {
    const error = this.validarVigenciaModal();
    if (error) {
      this.vigenciaModalError = error;
      return;
    }

    const usuario = this.usuarioActualEtiqueta();
    const ahora = new Date().toISOString();
    const anio = this.vigenciaModalForm.anio!;
    const valor = this.vigenciaModalForm.valor!;

    if (this.vigenciaEditIndex != null) {
      const actual = this.financiera.conpes.vigencias[this.vigenciaEditIndex];
      this.financiera.conpes.vigencias[this.vigenciaEditIndex] = {
        ...actual,
        anio,
        valor,
        actualizadoPor: usuario,
        actualizadoEn: ahora
      };
    } else {
      this.financiera.conpes.vigencias = [
        ...this.financiera.conpes.vigencias,
        {
          id: this.nuevoIdVigencia(),
          anio,
          valor,
          registradoPor: usuario,
          registradoEn: ahora
        }
      ];
    }

    this.persistirFinanciera({ silencioso: true });
    this.cerrarModalVigenciaForzado();
  }

  quitarVigencia(vigencia: ProyectoFinancieraVigencia): void {
    this.financiera.conpes.vigencias = this.financiera.conpes.vigencias.filter((v) => v.id !== vigencia.id);
    this.persistirFinanciera({ silencioso: true });
  }

  usuarioVigencia(vigencia: ProyectoFinancieraVigencia): string {
    return (vigencia.actualizadoPor || vigencia.registradoPor || '—').trim() || '—';
  }

  fechaVigencia(vigencia: ProyectoFinancieraVigencia): string {
    return this.formatIsoFechaHora(vigencia.actualizadoEn || vigencia.registradoEn);
  }

  guardar(): void {
    this.flushAutosaveSiPendiente();
    this.persistirFinanciera({ silencioso: false });
  }

  private persistirFinanciera(opciones: { silencioso?: boolean } = {}): void {
    const silencioso = opciones.silencioso ?? false;
    this.cancelarAutosaveProgramado();
    this.estadoGuardado = 'guardando';
    aplicarTotalesIndicativos(this.financiera.indicativos);
    this.financiera.comprometidoSesion = {
      versiones: relabelVersionesComprometido(this.financiera.comprometidoSesion.versiones)
    };
    this.sincronizarComprometidoDesdeVersiones();
    this.financieraService.save(this.financiera);
    this.actualizarSnapshotGuardado();
    this.estadoGuardado = 'guardado';
    if (silencioso) {
      this.mostrarAvisoGuardadoAutomatico();
    } else {
      this.guardadoOk = true;
      this.guardadoAutomaticoReciente = false;
    }
  }

  private programarAutosave(): void {
    this.estadoGuardado = 'pendiente';
    this.cancelarAutosaveProgramado();
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      if (this.tieneCambiosPendientesEnDatos()) {
        this.persistirFinanciera({ silencioso: true });
      } else {
        this.estadoGuardado = 'guardado';
      }
    }, this.AUTOSAVE_MS);
  }

  private flushAutosaveSiPendiente(): void {
    this.cancelarAutosaveProgramado();
    if (this.tieneCambiosPendientesEnDatos()) {
      this.persistirFinanciera({ silencioso: true });
    }
  }

  private cancelarAutosaveProgramado(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  private tieneCambiosPendientesEnDatos(): boolean {
    return this.snapshotDesdeEstado() !== this.ultimoSnapshotGuardado;
  }

  private requiereConfirmacionAlSalir(): boolean {
    return this.tieneCambiosPendientesEnDatos() || this.modalAbiertoConCambios();
  }

  private confirmarSiModalAbiertoConCambios(): boolean {
    if (!this.modalAbiertoConCambios()) {
      return true;
    }
    return window.confirm(
      'Tiene un formulario abierto con cambios sin guardar. ¿Desea salir sin guardarlos?'
    );
  }

  private confirmarCerrarModalComprometido(): boolean {
    if (!this.modalComprometidoAbierto || !this.comprometidoModalTieneDatos()) {
      return true;
    }
    return window.confirm(
      'Hay valores ingresados en el formulario que no se han guardado. ¿Desea cerrar sin guardar?'
    );
  }

  private confirmarCerrarModalConpes(): boolean {
    if (!this.modalConpesAbierto || !this.conpesModalTieneCambios()) {
      return true;
    }
    return window.confirm(
      'Hay cambios en la sesión CONPES sin guardar. ¿Desea cerrar sin guardar?'
    );
  }

  private confirmarCerrarModalVigencia(): boolean {
    if (!this.modalVigenciaAbierto || !this.vigenciaModalTieneCambios()) {
      return true;
    }
    return window.confirm(
      'Hay cambios en la vigencia sin guardar. ¿Desea cerrar sin guardar?'
    );
  }

  private modalAbiertoConCambios(): boolean {
    this.sincronizarEstadoModales();
    return (
      (this.modalComprometidoAbierto && this.comprometidoModalTieneDatos())
      || (this.modalConpesAbierto && this.conpesModalTieneCambios())
      || (this.modalVigenciaAbierto && this.vigenciaModalTieneCambios())
    );
  }

  /** Evita bloquear pestañas si el modal se cerró con X o clic fuera sin pasar por cerrarModal*. */
  private sincronizarEstadoModales(): void {
    if (!this.isBootstrapModalVisible('comprometidoVersionModal')) {
      this.modalComprometidoAbierto = false;
    }
    if (!this.isBootstrapModalVisible('conpesSesionModal')) {
      this.modalConpesAbierto = false;
    }
    if (!this.isBootstrapModalVisible('conpesVigenciaModal')) {
      this.modalVigenciaAbierto = false;
    }
  }

  private isBootstrapModalVisible(elementId: string): boolean {
    const el = document.getElementById(elementId);
    return el?.classList.contains('show') ?? false;
  }

  private readonly modalHiddenHandlers = new Map<string, () => void>();

  private registrarCierreModalesBootstrap(): void {
    this.vincularCierreModal('comprometidoVersionModal', () => {
      this.modalComprometidoAbierto = false;
      this.comprometidoModalForm = createEmptyComprometidoDetalle();
      this.comprometidoModalError = '';
    });
    this.vincularCierreModal('conpesSesionModal', () => {
      this.modalConpesAbierto = false;
      this.conpesModalForm = this.emptyConpesModalForm();
      this.conpesModalError = '';
      this.conpesModalSnapshotInicial = '';
    });
    this.vincularCierreModal('conpesVigenciaModal', () => {
      this.modalVigenciaAbierto = false;
      this.vigenciaEditIndex = null;
      this.vigenciaModalForm = this.emptyVigenciaModalForm();
      this.vigenciaModalError = '';
      this.vigenciaModalSnapshotInicial = '';
    });
  }

  private vincularCierreModal(elementId: string, onHidden: () => void): void {
    const el = document.getElementById(elementId);
    if (!el) {
      return;
    }
    const handler = (): void => onHidden();
    el.addEventListener('hidden.bs.modal', handler);
    this.modalHiddenHandlers.set(elementId, handler);
  }

  private desregistrarCierreModalesBootstrap(): void {
    for (const [elementId, handler] of this.modalHiddenHandlers) {
      document.getElementById(elementId)?.removeEventListener('hidden.bs.modal', handler);
    }
    this.modalHiddenHandlers.clear();
  }

  private comprometidoModalTieneDatos(): boolean {
    return this.camposDetalleComprometido.some((campo) => {
      const val = this.valorComprometidoModalCampo(campo);
      return val != null && val !== 0;
    });
  }

  private conpesModalTieneCambios(): boolean {
    return this.snapshotConpesModalForm() !== this.conpesModalSnapshotInicial;
  }

  private vigenciaModalTieneCambios(): boolean {
    return this.snapshotVigenciaModalForm() !== this.vigenciaModalSnapshotInicial;
  }

  private snapshotConpesModalForm(): string {
    return JSON.stringify(this.conpesModalForm);
  }

  private snapshotVigenciaModalForm(): string {
    return JSON.stringify(this.vigenciaModalForm);
  }

  private snapshotDesdeEstado(): string {
    const data = JSON.parse(JSON.stringify(this.financiera)) as ProyectoFinancieraData;
    aplicarTotalesIndicativos(data.indicativos);
    const detalle = sumarComprometidoDetalles(data.comprometidoSesion.versiones);
    Object.assign(data.comprometido, detalleToComprometidoCompleto(detalle));
    aplicarTotalesComprometido(data.comprometido);
    const { updatedAt: _u, ...rest } = data;
    return JSON.stringify(rest);
  }

  private actualizarSnapshotGuardado(): void {
    this.ultimoSnapshotGuardado = this.snapshotDesdeEstado();
  }

  private mostrarAvisoGuardadoAutomatico(): void {
    this.guardadoAutomaticoReciente = true;
    this.guardadoOk = false;
    if (this.guardadoAutomaticoTimer) {
      clearTimeout(this.guardadoAutomaticoTimer);
    }
    this.guardadoAutomaticoTimer = setTimeout(() => {
      this.guardadoAutomaticoReciente = false;
      this.guardadoAutomaticoTimer = null;
    }, 3500);
  }

  private cerrarModalComprometidoForzado(): void {
    this.hideBootstrapModal('comprometidoVersionModal');
    this.comprometidoModalError = '';
    this.comprometidoModalForm = createEmptyComprometidoDetalle();
    this.modalComprometidoAbierto = false;
  }

  private cerrarModalConpesForzado(): void {
    this.hideBootstrapModal('conpesSesionModal');
    this.conpesModalError = '';
    this.conpesModalForm = this.emptyConpesModalForm();
    this.modalConpesAbierto = false;
    this.conpesModalSnapshotInicial = '';
  }

  private cerrarModalVigenciaForzado(): void {
    this.cerrarModalVigenciaUi();
    this.vigenciaEditIndex = null;
    this.vigenciaModalError = '';
    this.vigenciaModalForm = this.emptyVigenciaModalForm();
    this.modalVigenciaAbierto = false;
    this.vigenciaModalSnapshotInicial = '';
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  trackVigencia(_index: number, vigencia: ProyectoFinancieraVigencia): string {
    return vigencia.id;
  }

  private validarConpesModal(): string | null {
    if (!this.conpesModalForm.numeroConpes.trim()) {
      return 'Indique el número de CONPES.';
    }
    if (!this.conpesModalForm.fechaConpes.trim()) {
      return 'Indique la fecha de la sesión CONPES.';
    }
    return null;
  }

  private validarVigenciaModal(): string | null {
    if (!this.conpesRegistrado) {
      return 'Debe registrar la sesión CONPES antes de agregar vigencias.';
    }
    const anio = this.vigenciaModalForm.anio;
    if (anio == null || !Number.isInteger(anio) || anio < 1900 || anio > 2100) {
      return 'Indique un año valido (1900–2100).';
    }
    const valor = this.vigenciaModalForm.valor;
    if (valor == null || !Number.isFinite(valor) || valor < 0) {
      return 'Indique un valor en pesos mayor o igual a cero.';
    }
    const duplicado = this.financiera.conpes.vigencias.some(
      (v, i) => v.anio === anio && i !== this.vigenciaEditIndex
    );
    if (duplicado) {
      return `Ya existe una vigencia registrada para el año ${anio}.`;
    }
    return null;
  }

  private usuarioActualEtiqueta(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.username?.trim()) {
      return 'Usuario';
    }
    const rol = this.authService.getSessionRoleLabel();
    return rol ? `${user.username} (${rol})` : user.username;
  }

  private nuevoIdVigencia(): string {
    return `vig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private nuevoIdComprometidoVersion(): string {
    return `comp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private sincronizarComprometidoDesdeVersiones(): void {
    const detalle = sumarComprometidoDetalles(this.financiera.comprometidoSesion.versiones);
    const completo = detalleToComprometidoCompleto(detalle);
    Object.assign(this.financiera.comprometido, completo);
    aplicarTotalesComprometido(this.financiera.comprometido);
  }

  private seleccionarPrimeraVersionComprometidoSiHay(): void {
    const ordenadas = this.versionesComprometidoOrdenadas;
    if (ordenadas.length && !this.comprometidoVersionSeleccionadaId) {
      this.comprometidoVersionSeleccionadaId = ordenadas[0].id;
    }
  }

  private validarComprometidoModal(): string | null {
    for (const campo of this.camposDetalleComprometido) {
      const val = this.valorComprometidoModalCampo(campo);
      if (val != null && (!Number.isFinite(val) || val < 0)) {
        return `El valor de "${campo.label}" debe ser mayor o igual a cero.`;
      }
    }
    return null;
  }

  private emptyVigenciaModalForm(): VigenciaModalForm {
    return { valor: null, valorDisplay: '', anio: null };
  }

  private emptyConpesModalForm(): ConpesModalForm {
    return { numeroConpes: '', fechaConpes: '', consecutivoProyecto: '' };
  }

  private formatIsoFechaHora(iso?: string): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  private abrirModalVigencia(): void {
    setTimeout(() => this.showBootstrapModal('conpesVigenciaModal'), 0);
  }

  private cerrarModalVigenciaUi(): void {
    this.hideBootstrapModal('conpesVigenciaModal');
  }

  private showBootstrapModal(elementId: string): void {
    const el = document.getElementById(elementId);
    if (!el) {
      return;
    }
    const bootstrap = (window as { bootstrap?: { Modal?: { getOrCreateInstance?: (el: Element) => { show?: () => void } } } })
      .bootstrap;
    try {
      bootstrap?.Modal?.getOrCreateInstance?.(el)?.show?.();
    } catch {
      // noop
    }
  }

  private hideBootstrapModal(elementId: string): void {
    const el = document.getElementById(elementId);
    if (!el) {
      return;
    }
    const bootstrap = (window as { bootstrap?: { Modal?: { getInstance?: (el: Element) => { hide?: () => void } } } })
      .bootstrap;
    try {
      bootstrap?.Modal?.getInstance?.(el)?.hide?.();
    } catch {
      // noop
    }
  }

  private parseCurrencyInput(value: string): number | null {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }

  private formatCurrencyInput(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
