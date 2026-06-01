import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ModificacionesContractualesService } from '../../core/services/modificaciones-contractuales.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { calcularMesesNovedad } from '../../core/utils/modificacion-contractual.util';
import { Contrato } from '../../shared/models';
import {
  labelTipoModificacionContractual,
  ModificacionContractual,
  TIPOS_MODIFICACION_CONTRACTUAL,
  TipoModificacionContractual
} from '../../shared/models/modificacion-contractual.model';

interface ModificacionFormState {
  tipoModificacion: TipoModificacionContractual | '';
  fechaModificacion: string;
  inicioNovedad: string;
  fechaFinal: string;
  valorAdicionado: number;
}

@Component({
  selector: 'app-contrato-modificaciones-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contrato-modificaciones-panel.component.html',
  styleUrl: './contrato-modificaciones-panel.component.css'
})
export class ContratoModificacionesPanelComponent implements OnInit, OnDestroy {
  @Input({ required: true }) contrato!: Contrato;

  readonly tiposModificacion = TIPOS_MODIFICACION_CONTRACTUAL;

  modificaciones: ModificacionContractual[] = [];
  form: ModificacionFormState = this.emptyForm();
  valorAdicionadoDisplay = '';
  formError = '';
  formModalAbierto = false;

  private sub: Subscription | null = null;

  constructor(
    private readonly modificacionesService: ModificacionesContractualesService,
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.resetForm();
    this.sub = this.modificacionesService.watchModificaciones().subscribe(() => {
      this.refrescarLista();
    });
    this.refrescarLista();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get mesesCalculados(): number {
    return calcularMesesNovedad(this.form.inicioNovedad, this.form.fechaFinal);
  }

  abrirFormularioModal(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.resetForm();
    this.formModalAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarFormularioModal(): void {
    this.formModalAbierto = false;
    this.formError = '';
  }

  guardarModificacion(): void {
    this.formError = '';
    const err = this.validarFormulario();
    if (err) {
      this.formError = err;
      return;
    }

    this.modificacionesService.add({
      contratoId: this.contrato.id,
      idPactoTerritorial: this.contrato.idPactoTerritorial ?? null,
      pacto: this.contrato.pacto,
      idProyecto: this.contrato.idProyecto ?? null,
      proyecto: this.contrato.proyecto,
      numeroContrato: this.contrato.numeroContrato,
      tipoModificacion: this.form.tipoModificacion as TipoModificacionContractual,
      fechaModificacion: this.form.fechaModificacion,
      inicioNovedad: this.form.inicioNovedad,
      fechaFinal: this.form.fechaFinal,
      meses: this.mesesCalculados,
      valorAdicionado: this.form.valorAdicionado
    });

    this.cerrarFormularioModal();
  }

  quitarModificacion(mod: ModificacionContractual): void {
    this.modificacionesService.remove(mod.id);
  }

  labelTipo(tipo: TipoModificacionContractual): string {
    return labelTipoModificacionContractual(tipo);
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }
    return this.dashboardService.formatDate(new Date(`${value}T12:00:00`));
  }

  onValorAdicionadoFocus(): void {
    const v = this.form.valorAdicionado;
    this.valorAdicionadoDisplay = v > 0 ? String(Math.trunc(v)) : '';
  }

  onValorAdicionadoInput(raw: string): void {
    this.valorAdicionadoDisplay = raw;
    const digits = raw.replace(/\D/g, '');
    this.form.valorAdicionado = digits ? Number(digits) : 0;
    this.formError = '';
  }

  onValorAdicionadoBlur(): void {
    const v = this.form.valorAdicionado;
    this.valorAdicionadoDisplay =
      v > 0
        ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
        : '';
  }

  onFechasChange(): void {
    this.formError = '';
  }

  trackModificacion(_index: number, mod: ModificacionContractual): string {
    return mod.id;
  }

  private refrescarLista(): void {
    this.modificaciones = this.modificacionesService.getByContratoId(this.contrato.id);
  }

  private resetForm(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.form = {
      tipoModificacion: '',
      fechaModificacion: hoy,
      inicioNovedad: hoy,
      fechaFinal: hoy,
      valorAdicionado: 0
    };
    this.valorAdicionadoDisplay = '';
    this.formError = '';
  }

  private validarFormulario(): string | null {
    if (!this.form.tipoModificacion) {
      return 'Seleccione el tipo de modificación.';
    }
    if (!this.form.fechaModificacion) {
      return 'Indique la fecha de modificación.';
    }
    if (!this.form.inicioNovedad) {
      return 'Indique el inicio de la novedad.';
    }
    if (!this.form.fechaFinal) {
      return 'Indique la fecha final.';
    }
    if (this.form.fechaFinal < this.form.inicioNovedad) {
      return 'La fecha final no puede ser anterior al inicio de la novedad.';
    }
    if (!Number.isFinite(this.form.valorAdicionado) || this.form.valorAdicionado < 0) {
      return 'Indique el valor adicionado (mayor o igual a cero).';
    }
    return null;
  }

  private emptyForm(): ModificacionFormState {
    const hoy = new Date().toISOString().slice(0, 10);
    return {
      tipoModificacion: '',
      fechaModificacion: hoy,
      inicioNovedad: hoy,
      fechaFinal: hoy,
      valorAdicionado: 0
    };
  }
}
