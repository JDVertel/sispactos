import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  aplicarTotalesComprometido,
  aplicarTotalesIndicativos,
  calcularTotalesComprometido,
  calcularTotalesIndicativos,
  FinancieraTotalesSesion
} from '../../core/financiera/proyecto-financiera.calculos';
import { AuthService } from '../../core/services/auth.service';
import { ProyectoFinancieraService } from '../../core/services/proyecto-financiera.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  ProyectoFinancieraData,
  ProyectoFinancieraVigencia,
  createEmptyProyectoFinancieraData,
  isProyectoFinancieraConpesRegistrado
} from '../../shared/models/proyecto-financiera.model';
import { Proyecto } from '../../shared/models';

type FinancieraTab = 'indicativos' | 'comprometido' | 'conpes';
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

@Component({
  selector: 'app-proyecto-financiera',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './proyecto-financiera.component.html',
  styleUrl: './proyecto-financiera.component.css'
})
export class ProyectoFinancieraComponent implements OnInit {
  proyecto: Proyecto | null = null;
  financiera: ProyectoFinancieraData = createEmptyProyectoFinancieraData(0);
  activeTab: FinancieraTab = 'indicativos';
  guardadoOk = false;
  vigenciaModalError = '';
  conpesModalError = '';
  private vigenciaEditIndex: number | null = null;
  conpesModalEsEdicion = false;
  vigenciaModalForm: VigenciaModalForm = this.emptyVigenciaModalForm();
  conpesModalForm: ConpesModalForm = this.emptyConpesModalForm();

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
    return calcularTotalesComprometido(this.financiera.comprometido);
  }

  get camposDetalleActivos(): FinancieraCampoDetalle[] {
    return this.activeTab === 'comprometido'
      ? this.camposDetalleComprometido
      : this.camposDetalleIndicativos;
  }

  setTab(tab: FinancieraTab): void {
    this.activeTab = tab;
    this.guardadoOk = false;
  }

  get valorTotalVigencias(): number {
    return this.vigenciasConpesOrdenadas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
  }

  get cantidadVigenciasRegistradas(): number {
    return this.financiera.conpes.vigencias.length;
  }

  valorCampo(campo: FinancieraCampoDetalle): number | null {
    const grupo =
      campo.group === 'indicativos' ? this.financiera.indicativos : this.financiera.comprometido;
    const raw = (grupo as unknown as Record<string, number | null>)[campo.key];
    return raw ?? null;
  }

  actualizarCampo(campo: FinancieraCampoDetalle, value: string): void {
    const parsed = value === '' ? null : Number(value);
    const num = parsed != null && Number.isFinite(parsed) ? parsed : null;
    if (campo.group === 'indicativos') {
      (this.financiera.indicativos as unknown as Record<string, number | null>)[campo.key] = num;
    } else {
      (this.financiera.comprometido as unknown as Record<string, number | null>)[campo.key] = num;
    }
    this.guardadoOk = false;
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
    setTimeout(() => this.showBootstrapModal('conpesSesionModal'), 0);
  }

  cerrarModalConpes(): void {
    this.hideBootstrapModal('conpesSesionModal');
    this.conpesModalError = '';
    this.conpesModalForm = this.emptyConpesModalForm();
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

    this.financieraService.save(this.financiera);
    this.guardadoOk = true;
    this.cerrarModalConpes();
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
    this.vigenciaModalError = '';
    this.abrirModalVigencia();
  }

  cerrarModalVigencia(): void {
    this.cerrarModalVigenciaUi();
    this.vigenciaEditIndex = null;
    this.vigenciaModalError = '';
    this.vigenciaModalForm = this.emptyVigenciaModalForm();
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

    this.financieraService.save(this.financiera);
    this.guardadoOk = true;
    this.cerrarModalVigencia();
  }

  quitarVigencia(vigencia: ProyectoFinancieraVigencia): void {
    this.financiera.conpes.vigencias = this.financiera.conpes.vigencias.filter((v) => v.id !== vigencia.id);
    this.financieraService.save(this.financiera);
    this.guardadoOk = true;
  }

  usuarioVigencia(vigencia: ProyectoFinancieraVigencia): string {
    return (vigencia.actualizadoPor || vigencia.registradoPor || '—').trim() || '—';
  }

  fechaVigencia(vigencia: ProyectoFinancieraVigencia): string {
    return this.formatIsoFechaHora(vigencia.actualizadoEn || vigencia.registradoEn);
  }

  guardar(): void {
    aplicarTotalesIndicativos(this.financiera.indicativos);
    aplicarTotalesComprometido(this.financiera.comprometido);
    this.financieraService.save(this.financiera);
    this.guardadoOk = true;
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
