import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
import { Contrato } from '../../shared/models';

interface ContratoExtended extends Contrato {
  fechaCreacion: Date;
}

type ContratoForm = Omit<ContratoExtended, 'id' | 'fechaCreacion'>;

@Component({
  selector: 'app-contratos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contratos-management.component.html',
  styleUrl: './contratos-management.component.css'
})
export class ContratosManagementComponent implements OnInit {
  contratos: ContratoExtended[] = [];

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

  constructor(
    private readonly contratosService: ContratosService,
    private readonly dashboardService: DashboardService,
    private readonly pactosService: PactosService,
    private readonly proyectosService: ProyectosService,
    private readonly actoresMaestro: ActoresMaestroService
  ) {}

  ngOnInit(): void {
    this.contratosService.getContratos().subscribe((rows) => {
      this.contratos = rows;
      this.actualizarContratosPadreOpciones();
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
    this.contratosService.removeContrato(id);
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
      this.proyectosFiltrados.find((p) => p.id === idProyecto)?.nombre ??
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
}
