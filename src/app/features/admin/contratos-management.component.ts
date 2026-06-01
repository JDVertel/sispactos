import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ContratosService } from '../../core/services/contratos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ActoresMaestroService } from '../../core/services/actores-maestro.service';
import {
  CATALOGO_TIPO_CONDICION_CONTRATO,
  CATALOGO_TIPO_ESTADO_CONTRATO,
  CATALOGO_TIPO_TIPO_CONTRATO,
  CatalogoOption,
  PactoApiOption,
  PactosService
} from '../../core/services/pactos.service';
import { ProyectoApiOption, ProyectosService } from '../../core/services/proyectos.service';
import { AvancesContratoService } from '../../core/services/avances-contrato.service';
import { DesembolsosProgramadosService } from '../../core/services/desembolsos-programados.service';
import { ModificacionesContractualesService } from '../../core/services/modificaciones-contractuales.service';
import { SeguimientoTecnicoContratoService } from '../../core/services/seguimiento-tecnico-contrato.service';
import { Contrato } from '../../shared/models';
import { AvanceContrato } from '../../shared/models/avance-contrato.model';
import { DesembolsoProgramado } from '../../shared/models/desembolso-programado.model';
import { SeguimientoTecnicoContrato } from '../../shared/models/seguimiento-tecnico-contrato.model';
import { ContratoModificacionesPanelComponent } from './contrato-modificaciones-panel.component';

interface ContratoExtended extends Contrato {
  fechaCreacion: Date;
}

type ContratoForm = Omit<ContratoExtended, 'id' | 'fechaCreacion'>;

interface DesembolsoFormState {
  numeroDesembolso: number | null;
  fechaEstimadaProgramada: string;
  valor: number;
  hito: string;
}

interface ReporteContratoFormState {
  fechaReporte: string;
  detalle: string;
}

export type ContratoDetalleTab = 'modificaciones' | 'desembolsos' | 'avances' | 'segTecnico';

export interface ContratoDetalleTabDef {
  id: ContratoDetalleTab;
  label: string;
}

interface ContratoFiltroOpcion {
  key: string;
  label: string;
}

export interface ContratoMonitores {
  modificaciones: number;
  desembolsos: number;
  avances: number;
  segTecnico: number;
}

@Component({
  selector: 'app-contratos-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ContratoModificacionesPanelComponent],
  templateUrl: './contratos-management.component.html',
  styleUrl: './contratos-management.component.css'
})
export class ContratosManagementComponent implements OnInit {
  contratos: ContratoExtended[] = [];

  readonly contratoDetalleTabs: ContratoDetalleTabDef[] = [
    { id: 'modificaciones', label: 'MODIFICACIONES CONTRACTUALES' },
    { id: 'desembolsos', label: 'P_DESEMBOLSOS' },
    { id: 'avances', label: 'AVANCES' },
    { id: 'segTecnico', label: 'SEG TECNICO' }
  ];

  /** Pestaña activa por contrato (objeto nuevo en cada cambio para disparar detección de cambios). */
  contratoTabsActivo: Partial<Record<number, ContratoDetalleTab>> = {};

  /** Contrato abierto en el modal de gestión (pestañas y detalle). */
  contratoGestionActivo: ContratoExtended | null = null;

  /** Contadores por contrato para la fila compacta de la lista. */
  monitoresPorContrato: Record<number, ContratoMonitores> = {};

  /** Listas en memoria; se refrescan al guardar o al cambiar de pestaña. */
  desembolsosPorContrato: Record<number, DesembolsoProgramado[]> = {};
  private desembolsoFormPorContrato: Record<number, DesembolsoFormState> = {};
  desembolsoValorDisplayPorContrato: Record<number, string> = {};
  desembolsoErrorPorContrato: Record<number, string> = {};
  modalDesembolsoAbierto = false;
  modalAvanceAbierto = false;
  modalSegTecnicoAbierto = false;
  avanceForm: ReporteContratoFormState = this.emptyReporteForm();
  segTecnicoForm: ReporteContratoFormState = this.emptyReporteForm();
  avanceFormError = '';
  segTecnicoFormError = '';

  newContrato: ContratoForm = this.createEmptyContrato();

  pactosCatalogo: PactoApiOption[] = [];
  /** Todos los proyectos desde GET `/api/Proyecto`. */
  proyectosApiCatalogo: ProyectoApiOption[] = [];
  proyectosFiltrados: ProyectoApiOption[] = [];

  tiposContratoCatalogo: CatalogoOption[] = [];
  estadosContratoCatalogo: CatalogoOption[] = [];
  condicionesContratoCatalogo: CatalogoOption[] = [];

  contratistasDisponibles: string[] = [];
  contratantesDisponibles: string[] = [];
  interventoresDisponibles: string[] = [];
  contratosPadreOpciones: string[] = [];

  isLoadingCatalogos = false;
  valorInicialDisplay = '';
  formularioError = '';

  /** Filtros de la lista (cascada pacto → proyecto → contrato). */
  filtroListaPactoKey = '';
  filtroListaProyectoKey = '';
  filtroListaContratoId: number | null = null;

  /** Paginación de la lista (solo si hay más registros que `tamanoPagina`). */
  readonly tamanoPaginaOpciones = [25, 50, 100];
  tamanoPagina = 25;
  paginaActual = 1;

  constructor(
    private readonly contratosService: ContratosService,
    private readonly dashboardService: DashboardService,
    private readonly pactosService: PactosService,
    private readonly proyectosService: ProyectosService,
    private readonly actoresMaestro: ActoresMaestroService,
    private readonly modificacionesService: ModificacionesContractualesService,
    private readonly desembolsosService: DesembolsosProgramadosService,
    private readonly avancesContratoService: AvancesContratoService,
    private readonly seguimientoTecnicoService: SeguimientoTecnicoContratoService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contratosService.getContratos().subscribe((rows) => {
      this.contratos = rows;
      this.actualizarContratosPadreOpciones();
      this.refrescarTodosDesembolsos();
      this.refrescarMonitores();
      this.ajustarPaginaActual();
    });

    this.desembolsosService.watchDesembolsos().subscribe(() => {
      this.refrescarTodosDesembolsos();
      this.refrescarMonitores();
      this.cdr.detectChanges();
    });

    this.modificacionesService.watchModificaciones().subscribe(() => {
      this.refrescarMonitores();
      this.cdr.detectChanges();
    });

    this.avancesContratoService.watchAvances().subscribe(() => {
      this.refrescarMonitores();
      this.cdr.detectChanges();
    });

    this.seguimientoTecnicoService.watchRegistros().subscribe(() => {
      this.refrescarMonitores();
      this.cdr.detectChanges();
    });

    this.contratistasDisponibles = this.actoresMaestro.getContratistas();
    this.contratantesDisponibles = this.actoresMaestro.getContratantes();
    this.interventoresDisponibles = this.actoresMaestro.getInterventores();

    this.isLoadingCatalogos = true;
    forkJoin({
      pactos: this.pactosService.getPactosOptionsFromApi(),
      proyectos: this.proyectosService.getProyectosFromApi(),
      tiposContrato: this.pactosService.getCatalogoByTipo(CATALOGO_TIPO_TIPO_CONTRATO),
      estadosContrato: this.pactosService.getCatalogoByTipo(CATALOGO_TIPO_ESTADO_CONTRATO),
      condicionesContrato: this.pactosService.getCatalogoByTipo(CATALOGO_TIPO_CONDICION_CONTRATO)
    }).subscribe({
      next: ({ pactos, proyectos, tiposContrato, estadosContrato, condicionesContrato }) => {
        this.pactosCatalogo = pactos;
        this.proyectosApiCatalogo = proyectos;
        this.tiposContratoCatalogo = this.sortCatalog(tiposContrato);
        this.estadosContratoCatalogo = this.sortCatalog(estadosContrato);
        this.condicionesContratoCatalogo = this.sortCatalog(condicionesContrato);
        this.aplicarFallbackCatalogos();
        this.isLoadingCatalogos = false;
      },
      error: () => {
        this.pactosCatalogo = [];
        this.proyectosApiCatalogo = [];
        this.aplicarFallbackCatalogos();
        this.isLoadingCatalogos = false;
      }
    });
  }

  get requiereContratoPadre(): boolean {
    const texto = this.condicionSeleccionadaTexto().toLowerCase();
    return /adici[oó]n|modificaci[oó]n|pr[oó]rroga|complementar|otros[ií]/i.test(texto);
  }

  addContrato(): void {
    this.formularioError = '';
    const err = this.validarFormulario();
    if (err) {
      this.formularioError = err;
      return;
    }

    const payload: ContratoForm = {
      ...this.newContrato,
      pacto: this.textoPacto(this.newContrato.idPactoTerritorial),
      proyecto: this.textoProyecto(this.newContrato.idProyecto),
      tipoContrato: this.textoCatalogo(this.tiposContratoCatalogo, this.newContrato.idTipoContrato),
      estado: this.textoCatalogo(this.estadosContratoCatalogo, this.newContrato.idEstado),
      condicion: this.textoCatalogo(this.condicionesContratoCatalogo, this.newContrato.idCondicion),
      numeroContrato: this.newContrato.numeroContrato.trim(),
      contratoPadre: this.requiereContratoPadre ? (this.newContrato.contratoPadre ?? '').trim() : undefined,
      objeto: this.newContrato.objeto.trim(),
      urlSecop: this.newContrato.urlSecop?.trim() || undefined,
      valorInicial: Number(this.newContrato.valorInicial) || 0,
      numeroDesembolsos: Number(this.newContrato.numeroDesembolsos) || 0
    };

    this.contratosService.addContrato(payload);
    this.resetForm();
  }

  deleteContrato(id: number): void {
    if (this.contratoGestionActivo?.id === id) {
      this.cerrarGestionContrato();
    }
    this.contratosService.removeContrato(id);
    this.modificacionesService.removeByContratoId(id);
    this.desembolsosService.removeByContratoId(id);
    this.avancesContratoService.removeByContratoId(id);
    this.seguimientoTecnicoService.removeByContratoId(id);
    const { [id]: _removedTab, ...restoTab } = this.contratoTabsActivo;
    this.contratoTabsActivo = restoTab;
    const { [id]: _removedMon, ...restoMon } = this.monitoresPorContrato;
    this.monitoresPorContrato = restoMon;
  }

  getMonitores(contratoId: number): ContratoMonitores {
    return (
      this.monitoresPorContrato[contratoId] ?? {
        modificaciones: 0,
        desembolsos: 0,
        avances: 0,
        segTecnico: 0
      }
    );
  }

  abrirGestionContrato(contrato: ContratoExtended): void {
    this.contratoGestionActivo = contrato;
    const tab = this.getContratoTab(contrato.id);
    if (tab === 'desembolsos') {
      this.refrescarDesembolsos(contrato.id);
      this.inicializarFormDesembolso(contrato.id);
    }
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  cerrarGestionContrato(): void {
    this.cerrarSubmodalesGestion();
    this.contratoGestionActivo = null;
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  abrirModalDesembolso(contrato: ContratoExtended, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.inicializarFormDesembolso(contrato.id);
    this.desembolsoErrorPorContrato[contrato.id] = '';
    this.modalDesembolsoAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalDesembolso(): void {
    this.modalDesembolsoAbierto = false;
  }

  abrirModalAvance(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.avanceForm = this.emptyReporteForm();
    this.avanceFormError = '';
    this.modalAvanceAbierto = true;
    this.cdr.detectChanges();
  }

  abrirModalSegTecnico(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.segTecnicoForm = this.emptyReporteForm();
    this.segTecnicoFormError = '';
    this.modalSegTecnicoAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalAvance(): void {
    this.modalAvanceAbierto = false;
    this.avanceFormError = '';
  }

  cerrarModalSegTecnico(): void {
    this.modalSegTecnicoAbierto = false;
    this.segTecnicoFormError = '';
  }

  getAvances(contratoId: number): AvanceContrato[] {
    return this.avancesContratoService.getByContratoId(contratoId);
  }

  getSeguimientosTecnicos(contratoId: number): SeguimientoTecnicoContrato[] {
    return this.seguimientoTecnicoService.getByContratoId(contratoId);
  }

  guardarAvance(contrato: ContratoExtended): void {
    this.avanceFormError = '';
    const err = this.validarReporteForm(this.avanceForm);
    if (err) {
      this.avanceFormError = err;
      return;
    }
    this.avancesContratoService.add({
      contratoId: contrato.id,
      fechaReporte: this.avanceForm.fechaReporte,
      detalle: this.avanceForm.detalle.trim()
    });
    this.cerrarModalAvance();
    this.refrescarMonitores();
    this.cdr.detectChanges();
  }

  guardarSegTecnico(contrato: ContratoExtended): void {
    this.segTecnicoFormError = '';
    const err = this.validarReporteForm(this.segTecnicoForm);
    if (err) {
      this.segTecnicoFormError = err;
      return;
    }
    this.seguimientoTecnicoService.add({
      contratoId: contrato.id,
      fechaReporte: this.segTecnicoForm.fechaReporte,
      detalle: this.segTecnicoForm.detalle.trim()
    });
    this.cerrarModalSegTecnico();
    this.refrescarMonitores();
    this.cdr.detectChanges();
  }

  quitarAvance(item: AvanceContrato): void {
    this.avancesContratoService.remove(item.id);
    this.refrescarMonitores();
    this.cdr.detectChanges();
  }

  quitarSegTecnico(item: SeguimientoTecnicoContrato): void {
    this.seguimientoTecnicoService.remove(item.id);
    this.refrescarMonitores();
    this.cdr.detectChanges();
  }

  trackAvance(_index: number, item: AvanceContrato): string {
    return item.id;
  }

  trackSegTecnico(_index: number, item: SeguimientoTecnicoContrato): string {
    return item.id;
  }

  getContratoTab(contratoId: number): ContratoDetalleTab {
    return this.contratoTabsActivo[contratoId] ?? 'modificaciones';
  }

  setContratoTab(contratoId: number, tab: ContratoDetalleTab, event?: Event): void {
    event?.stopPropagation();
    this.contratoTabsActivo = { ...this.contratoTabsActivo, [contratoId]: tab };
    if (tab === 'desembolsos') {
      this.refrescarDesembolsos(contratoId);
      this.inicializarFormDesembolso(contratoId);
    }
    this.cdr.detectChanges();
  }

  getDesembolsos(contratoId: number): DesembolsoProgramado[] {
    return this.desembolsosPorContrato[contratoId] ?? [];
  }

  numerosDesembolsoOpciones(contrato: ContratoExtended): number[] {
    const max = Math.max(1, Number(contrato.numeroDesembolsos) || 1);
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  cantidadDesembolsosPrevista(contrato: ContratoExtended): number {
    return Math.max(1, Number(contrato.numeroDesembolsos) || 1);
  }

  totalDesembolsosProgramados(contratoId: number): number {
    return this.getDesembolsos(contratoId).reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  }

  getDesembolsoForm(contratoId: number): DesembolsoFormState {
    if (!this.desembolsoFormPorContrato[contratoId]) {
      this.inicializarFormDesembolso(contratoId);
    }
    return this.desembolsoFormPorContrato[contratoId];
  }

  guardarDesembolso(contrato: ContratoExtended): void {
    const contratoId = contrato.id;
    this.desembolsoErrorPorContrato[contratoId] = '';
    const form = this.getDesembolsoForm(contratoId);
    const err = this.validarDesembolsoForm(contrato, form);
    if (err) {
      this.desembolsoErrorPorContrato[contratoId] = err;
      return;
    }

    this.desembolsosService.add({
      contratoId,
      idPactoTerritorial: contrato.idPactoTerritorial ?? null,
      pacto: contrato.pacto,
      idProyecto: contrato.idProyecto ?? null,
      proyecto: contrato.proyecto,
      numeroContrato: contrato.numeroContrato,
      numeroDesembolso: form.numeroDesembolso!,
      fechaEstimadaProgramada: form.fechaEstimadaProgramada,
      valor: form.valor,
      hito: form.hito.trim()
    });

    this.inicializarFormDesembolso(contratoId);
    this.refrescarDesembolsos(contratoId);
    this.cerrarModalDesembolso();
    this.cdr.detectChanges();
  }

  quitarDesembolso(item: DesembolsoProgramado): void {
    this.desembolsosService.remove(item.id);
    this.refrescarDesembolsos(item.contratoId);
    this.inicializarFormDesembolso(item.contratoId);
    this.cdr.detectChanges();
  }

  onDesembolsoValorInput(contratoId: number, raw: string): void {
    this.desembolsoValorDisplayPorContrato[contratoId] = raw;
    const digits = raw.replace(/\D/g, '');
    this.getDesembolsoForm(contratoId).valor = digits ? Number(digits) : 0;
    this.desembolsoErrorPorContrato[contratoId] = '';
  }

  onDesembolsoValorFocus(contratoId: number): void {
    const v = this.getDesembolsoForm(contratoId).valor;
    this.desembolsoValorDisplayPorContrato[contratoId] = v > 0 ? String(Math.trunc(v)) : '';
  }

  onDesembolsoValorBlur(contratoId: number): void {
    const v = this.getDesembolsoForm(contratoId).valor;
    this.desembolsoValorDisplayPorContrato[contratoId] =
      v > 0 ? this.formatCurrencyInput(v) : '';
  }

  trackDesembolso(_index: number, item: DesembolsoProgramado): string {
    return item.id;
  }

  trackContrato(_index: number, contrato: ContratoExtended): number {
    return contrato.id;
  }

  resetForm(): void {
    this.newContrato = this.createEmptyContrato();
    this.valorInicialDisplay = '';
    this.formularioError = '';
    this.proyectosFiltrados = [];
  }

  /** Al elegir pacto: filtra proyectos donde `idPactoTerritorial` = id del pacto seleccionado. */
  onPactoChange(idPactoTerritorialSeleccionado: number | null): void {
    this.newContrato.idProyecto = null;
    this.proyectosFiltrados = [];

    const idPacto = this.normalizarId(idPactoTerritorialSeleccionado);
    if (!idPacto) {
      return;
    }

    this.proyectosFiltrados = this.proyectosApiCatalogo.filter((proyecto) =>
      this.normalizarId(proyecto.idPactoTerritorial) === idPacto
    );
    this.newContrato.idProyecto = this.proyectosFiltrados[0]?.id ?? null;
  }

  onCondicionChange(): void {
    if (!this.requiereContratoPadre) {
      this.newContrato.contratoPadre = '';
    }
  }

  onNumeroContratoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newContrato.numeroContrato = input.value.replace(/[^a-zA-Z0-9-]/g, '');
  }

  onContratoPadreInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newContrato.contratoPadre = input.value.replace(/[^a-zA-Z0-9-]/g, '');
  }

  onValorInicialFocus(): void {
    const v = this.newContrato.valorInicial;
    this.valorInicialDisplay = v != null && Number.isFinite(v) ? String(Math.trunc(v)) : '';
  }

  onValorInicialInput(raw: string): void {
    this.valorInicialDisplay = raw;
    this.newContrato.valorInicial = this.parseCurrencyInput(raw) ?? 0;
  }

  onValorInicialBlur(): void {
    const v = this.newContrato.valorInicial;
    this.valorInicialDisplay =
      v != null && Number.isFinite(v) && v > 0 ? this.formatCurrencyInput(v) : '';
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  formatDate(value: string | Date): string {
    if (!value) {
      return '—';
    }
    const d = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
    return this.dashboardService.formatDate(d);
  }

  getTotalValorContratos(): number {
    return this.contratosService.getTotalValorContratos();
  }

  getContratosConSecop(): number {
    return this.contratosService.getContratosConSecop();
  }

  get tieneFiltrosLista(): boolean {
    return !!(this.filtroListaPactoKey || this.filtroListaProyectoKey || this.filtroListaContratoId != null);
  }

  get contratosFiltrados(): ContratoExtended[] {
    return this.contratos.filter((c) => this.pasaFiltrosLista(c));
  }

  get paginacionNecesaria(): boolean {
    return this.contratosFiltrados.length > this.tamanoPagina;
  }

  get totalPaginas(): number {
    const total = this.contratosFiltrados.length;
    if (total === 0) {
      return 1;
    }
    return Math.ceil(total / this.tamanoPagina);
  }

  get contratosFiltradosPaginados(): ContratoExtended[] {
    const lista = this.contratosFiltrados;
    if (!this.paginacionNecesaria) {
      return lista;
    }
    const inicio = (this.paginaActual - 1) * this.tamanoPagina;
    return lista.slice(inicio, inicio + this.tamanoPagina);
  }

  get rangoPaginaInicio(): number {
    if (this.contratosFiltrados.length === 0) {
      return 0;
    }
    if (!this.paginacionNecesaria) {
      return 1;
    }
    return (this.paginaActual - 1) * this.tamanoPagina + 1;
  }

  get rangoPaginaFin(): number {
    if (this.contratosFiltrados.length === 0) {
      return 0;
    }
    if (!this.paginacionNecesaria) {
      return this.contratosFiltrados.length;
    }
    return Math.min(this.paginaActual * this.tamanoPagina, this.contratosFiltrados.length);
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const ventana = 5;
    let inicio = Math.max(1, actual - Math.floor(ventana / 2));
    let fin = Math.min(total, inicio + ventana - 1);
    inicio = Math.max(1, fin - ventana + 1);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }

  get pactosFiltroOpciones(): ContratoFiltroOpcion[] {
    return this.opcionesPactoDesdeContratos(this.contratos);
  }

  get proyectosFiltroOpciones(): ContratoFiltroOpcion[] {
    const base = this.contratos.filter((c) => this.pasaFiltroPacto(c));
    return this.opcionesProyectoDesdeContratos(base);
  }

  get contratosFiltroOpciones(): ContratoExtended[] {
    return this.contratos
      .filter((c) => this.pasaFiltroPacto(c) && this.pasaFiltroProyecto(c))
      .sort((a, b) => a.numeroContrato.localeCompare(b.numeroContrato, 'es'));
  }

  getTotalValorContratosFiltrados(): number {
    return this.contratosFiltrados.reduce((sum, c) => sum + (Number(c.valorInicial) || 0), 0);
  }

  onFiltroListaPactoChange(): void {
    this.filtroListaProyectoKey = '';
    this.filtroListaContratoId = null;
    this.reiniciarPaginaLista();
  }

  onFiltroListaProyectoChange(): void {
    this.filtroListaContratoId = null;
    this.reiniciarPaginaLista();
  }

  onFiltroListaContratoChange(): void {
    this.reiniciarPaginaLista();
  }

  onTamanoPaginaChange(): void {
    this.reiniciarPaginaLista();
  }

  limpiarFiltrosLista(): void {
    this.filtroListaPactoKey = '';
    this.filtroListaProyectoKey = '';
    this.filtroListaContratoId = null;
    this.reiniciarPaginaLista();
  }

  irAPagina(pagina: number): void {
    const destino = Math.max(1, Math.min(pagina, this.totalPaginas));
    if (destino === this.paginaActual) {
      return;
    }
    this.paginaActual = destino;
    this.scrollListaAlInicio();
    this.cdr.detectChanges();
  }

  paginaAnterior(): void {
    this.irAPagina(this.paginaActual - 1);
  }

  paginaSiguiente(): void {
    this.irAPagina(this.paginaActual + 1);
  }

  private pasaFiltrosLista(c: ContratoExtended): boolean {
    return this.pasaFiltroPacto(c) && this.pasaFiltroProyecto(c) && this.pasaFiltroContrato(c);
  }

  private pasaFiltroPacto(c: ContratoExtended): boolean {
    if (!this.filtroListaPactoKey) {
      return true;
    }
    const id = this.normalizarId(c.idPactoTerritorial);
    if (this.filtroListaPactoKey.startsWith('id:')) {
      const filtroId = Number(this.filtroListaPactoKey.slice(3));
      return id === filtroId;
    }
    if (this.filtroListaPactoKey.startsWith('nom:')) {
      const filtroNom = this.filtroListaPactoKey.slice(4);
      return (c.pacto ?? '').trim().toLowerCase() === filtroNom;
    }
    return true;
  }

  private pasaFiltroProyecto(c: ContratoExtended): boolean {
    if (!this.filtroListaProyectoKey) {
      return true;
    }
    const id = this.normalizarId(c.idProyecto);
    if (this.filtroListaProyectoKey.startsWith('id:')) {
      const filtroId = Number(this.filtroListaProyectoKey.slice(3));
      return id === filtroId;
    }
    if (this.filtroListaProyectoKey.startsWith('nom:')) {
      const filtroNom = this.filtroListaProyectoKey.slice(4);
      return (c.proyecto ?? '').trim().toLowerCase() === filtroNom;
    }
    return true;
  }

  private pasaFiltroContrato(c: ContratoExtended): boolean {
    if (this.filtroListaContratoId == null) {
      return true;
    }
    return c.id === this.filtroListaContratoId;
  }

  private opcionesPactoDesdeContratos(rows: ContratoExtended[]): ContratoFiltroOpcion[] {
    const byKey = new Map<string, ContratoFiltroOpcion>();
    for (const c of rows) {
      const id = this.normalizarId(c.idPactoTerritorial);
      const nombre =
        (c.pacto ?? '').trim() || (id ? this.textoPacto(id) : '') || 'Sin pacto';
      const key = id != null ? `id:${id}` : `nom:${nombre.toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, label: nombre });
      }
    }
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  private opcionesProyectoDesdeContratos(rows: ContratoExtended[]): ContratoFiltroOpcion[] {
    const byKey = new Map<string, ContratoFiltroOpcion>();
    for (const c of rows) {
      const id = this.normalizarId(c.idProyecto);
      const nombre =
        (c.proyecto ?? '').trim() ||
        (id ? this.textoProyectoCatalogo(id) : '') ||
        'Sin proyecto';
      const key = id != null ? `id:${id}` : `nom:${nombre.toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, label: nombre });
      }
    }
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  private textoProyectoCatalogo(idProyecto: number): string {
    return (
      this.proyectosApiCatalogo.find((p) => p.id === idProyecto)?.nombreIniciativa ?? ''
    );
  }

  private cerrarSubmodalesGestion(): void {
    this.modalDesembolsoAbierto = false;
    this.modalAvanceAbierto = false;
    this.modalSegTecnicoAbierto = false;
  }

  private emptyReporteForm(): ReporteContratoFormState {
    return {
      fechaReporte: new Date().toISOString().slice(0, 10),
      detalle: ''
    };
  }

  private validarReporteForm(form: ReporteContratoFormState): string | null {
    if (!form.fechaReporte) {
      return 'Indique la fecha del reporte.';
    }
    if (!form.detalle.trim()) {
      return 'Indique el detalle del reporte.';
    }
    return null;
  }

  private createEmptyContrato(): ContratoForm {
    const hoy = new Date().toISOString().slice(0, 10);
    return {
      idPactoTerritorial: null,
      pacto: '',
      idProyecto: null,
      proyecto: '',
      idTipoContrato: null,
      tipoContrato: '',
      contratista: '',
      numeroContrato: '',
      fechaSuscripcion: hoy,
      fechaInicio: hoy,
      fechaTerminacionInicial: hoy,
      idEstado: null,
      estado: '',
      idCondicion: null,
      condicion: '',
      valorInicial: 0,
      numeroDesembolsos: 0,
      contratoPadre: '',
      contratante: '',
      interventor: '',
      objeto: '',
      urlSecop: ''
    };
  }

  private validarFormulario(): string | null {
    const c = this.newContrato;
    if (!c.idPactoTerritorial) return 'Seleccione un pacto.';
    if (!c.idProyecto) return 'Seleccione un proyecto.';
    if (!c.idTipoContrato) return 'Seleccione el tipo de contrato.';
    if (!c.contratista.trim()) return 'Seleccione un contratista.';
    if (!c.numeroContrato.trim()) return 'Ingrese el número de contrato.';
    if (!/^[a-zA-Z0-9-]+$/.test(c.numeroContrato.trim())) {
      return 'El número de contrato solo permite letras, números y guion.';
    }
    if (!c.fechaSuscripcion) return 'Ingrese la fecha de suscripción.';
    if (!c.fechaInicio) return 'Ingrese la fecha de inicio.';
    if (!c.fechaTerminacionInicial) return 'Ingrese la fecha de terminación inicial.';
    if (c.fechaTerminacionInicial < c.fechaInicio) {
      return 'La fecha de terminación inicial no puede ser anterior a la fecha de inicio.';
    }
    if (!c.idEstado) return 'Seleccione el estado del contrato.';
    if (!c.idCondicion) return 'Seleccione la condición del contrato.';
    if (!c.valorInicial || c.valorInicial <= 0) return 'Ingrese el valor inicial del contrato.';
    if (!Number.isFinite(c.numeroDesembolsos) || c.numeroDesembolsos < 1) {
      return 'Ingrese el número de desembolsos (mínimo 1).';
    }
    if (this.requiereContratoPadre && !(c.contratoPadre ?? '').trim()) {
      return 'Seleccione o ingrese el contrato padre para la condición indicada.';
    }
    if (!c.contratante.trim()) return 'Seleccione un contratante.';
    if (!c.interventor.trim()) return 'Seleccione un interventor.';
    if (!c.objeto.trim()) return 'Ingrese el objeto del contrato.';
    return null;
  }

  private condicionSeleccionadaTexto(): string {
    return this.textoCatalogo(this.condicionesContratoCatalogo, this.newContrato.idCondicion);
  }

  private textoPacto(idPactoTerritorial: number | null | undefined): string {
    const id = this.normalizarId(idPactoTerritorial);
    if (!id) return '';
    return (
      this.pactosCatalogo.find((p) => this.normalizarId(p.idPactoTerritorial) === id)?.nombre ?? ''
    );
  }

  private normalizarId(value: number | null | undefined): number | null {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private textoProyecto(idProyecto: number | null | undefined): string {
    if (!idProyecto) return '';
    return (
      this.proyectosFiltrados.find((p) => p.id === idProyecto)?.nombreIniciativa ??
      ''
    );
  }

  private textoCatalogo(items: CatalogoOption[], id: number | null | undefined): string {
    if (!id) return '';
    return items.find((o) => o.id === id)?.texto ?? '';
  }

  private actualizarContratosPadreOpciones(): void {
    const numeros = this.contratos
      .map((c) => c.numeroContrato.trim())
      .filter((n) => n.length > 0);
    this.contratosPadreOpciones = [...new Set(numeros)];
  }

  private aplicarFallbackCatalogos(): void {
    if (!this.tiposContratoCatalogo.length) {
      this.tiposContratoCatalogo = this.contratosService
        .getTiposContratoFallback()
        .map((texto, index) => ({ id: index + 1, codigo: String(index + 1), texto }));
    }
    if (!this.estadosContratoCatalogo.length) {
      this.estadosContratoCatalogo = [
        { id: 1, codigo: '1', texto: 'Activo' },
        { id: 2, codigo: '2', texto: 'Liquidado' },
        { id: 3, codigo: '3', texto: 'Suspendido' }
      ];
    }
    if (!this.condicionesContratoCatalogo.length) {
      this.condicionesContratoCatalogo = [
        { id: 1, codigo: '1', texto: 'Nuevo' },
        { id: 2, codigo: '2', texto: 'Adición' },
        { id: 3, codigo: '3', texto: 'Modificación' }
      ];
    }
  }

  private sortCatalog(items: CatalogoOption[]): CatalogoOption[] {
    return [...items].sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  }

  private parseCurrencyInput(value: string): number | null {
    const digits = value.replace(/\D/g, '');
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }

  private formatCurrencyInput(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  private refrescarTodosDesembolsos(): void {
    const map: Record<number, DesembolsoProgramado[]> = {};
    for (const c of this.contratos) {
      map[c.id] = this.desembolsosService.getByContratoId(c.id);
    }
    this.desembolsosPorContrato = map;
  }

  private reiniciarPaginaLista(): void {
    this.paginaActual = 1;
    this.ajustarPaginaActual();
  }

  private ajustarPaginaActual(): void {
    const max = this.totalPaginas;
    if (this.paginaActual > max) {
      this.paginaActual = max;
    }
    if (this.paginaActual < 1) {
      this.paginaActual = 1;
    }
  }

  private scrollListaAlInicio(): void {
    const el = document.querySelector('.contratos-list-card .card-body');
    el?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private refrescarMonitores(): void {
    const map: Record<number, ContratoMonitores> = {};
    for (const c of this.contratos) {
      map[c.id] = {
        modificaciones: this.modificacionesService.countByContratoId(c.id),
        desembolsos: this.desembolsosService.countByContratoId(c.id),
        avances: this.avancesContratoService.countByContratoId(c.id),
        segTecnico: this.seguimientoTecnicoService.countByContratoId(c.id)
      };
    }
    this.monitoresPorContrato = map;
  }

  private refrescarDesembolsos(contratoId: number): void {
    this.desembolsosPorContrato = {
      ...this.desembolsosPorContrato,
      [contratoId]: this.desembolsosService.getByContratoId(contratoId)
    };
  }

  private inicializarFormDesembolso(contratoId: number): void {
    const hoy = new Date().toISOString().slice(0, 10);
    const contrato = this.contratos.find((c) => c.id === contratoId);
    const max = contrato ? this.cantidadDesembolsosPrevista(contrato) : 1;
    const usados = new Set((this.desembolsosPorContrato[contratoId] ?? []).map((d) => d.numeroDesembolso));
    const opciones = Array.from({ length: max }, (_, i) => i + 1);
    const siguiente = opciones.find((n) => !usados.has(n)) ?? null;

    this.desembolsoFormPorContrato[contratoId] = {
      numeroDesembolso: siguiente,
      fechaEstimadaProgramada: hoy,
      valor: 0,
      hito: ''
    };
    this.desembolsoValorDisplayPorContrato[contratoId] = '';
    this.desembolsoErrorPorContrato[contratoId] = '';
  }

  private validarDesembolsoForm(contrato: ContratoExtended, form: DesembolsoFormState): string | null {
    const max = this.cantidadDesembolsosPrevista(contrato);
    const n = form.numeroDesembolso;
    if (n == null || !Number.isInteger(n) || n < 1 || n > max) {
      return `Seleccione el número de desembolso (1 a ${max}).`;
    }
    if ((this.desembolsosPorContrato[contrato.id] ?? []).some((d) => d.numeroDesembolso === n)) {
      return `Ya existe un desembolso programado con el número ${n}.`;
    }
    if (!form.fechaEstimadaProgramada) {
      return 'Indique la fecha estimada programada.';
    }
    if (!Number.isFinite(form.valor) || form.valor < 0) {
      return 'Indique el valor (mayor o igual a cero).';
    }
    if (!form.hito.trim()) {
      return 'Indique el hito asociado al desembolso.';
    }
    return null;
  }
}
