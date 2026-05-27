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
import { ProyectoFinancieraService } from '../../core/services/proyecto-financiera.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  ProyectoFinancieraData,
  ProyectoFinancieraVigencia,
  createEmptyProyectoFinancieraData
} from '../../shared/models/proyecto-financiera.model';
import { Proyecto } from '../../shared/models';

type FinancieraTab = 'indicativos' | 'comprometido' | 'conpes';
type FinancieraGrupo = 'indicativos' | 'comprometido';

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
  vigenciaValorDisplay: string[] = [];

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
    private readonly dashboardService: DashboardService
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
    if (!this.financiera.conpes.consecutivoProyecto && this.proyecto.consecutivoConpes != null) {
      this.financiera.conpes.consecutivoProyecto = String(this.proyecto.consecutivoConpes);
    }
    this.syncVigenciaValorDisplay();
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
    return this.financiera.conpes.vigencias.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
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

  agregarVigencia(): void {
    this.financiera.conpes.vigencias = [
      ...this.financiera.conpes.vigencias,
      { valor: null, anio: new Date().getFullYear() }
    ];
    this.syncVigenciaValorDisplay();
    this.guardadoOk = false;
  }

  quitarVigencia(index: number): void {
    if (this.financiera.conpes.vigencias.length <= 1) {
      this.financiera.conpes.vigencias = [{ valor: null, anio: new Date().getFullYear() }];
    } else {
      this.financiera.conpes.vigencias = this.financiera.conpes.vigencias.filter((_, i) => i !== index);
    }
    this.syncVigenciaValorDisplay();
    this.guardadoOk = false;
  }

  onVigenciaValorChange(index: number, raw: string): void {
    this.financiera.conpes.vigencias[index].valor = this.parseCurrencyInput(raw);
    this.guardadoOk = false;
  }

  onVigenciaValorFocus(index: number): void {
    const valor = this.financiera.conpes.vigencias[index]?.valor;
    if (valor != null && Number.isFinite(valor)) {
      this.vigenciaValorDisplay[index] = String(Math.trunc(valor));
    }
  }

  onVigenciaValorBlur(index: number): void {
    const valor = this.financiera.conpes.vigencias[index]?.valor;
    this.vigenciaValorDisplay[index] =
      valor != null && Number.isFinite(valor) ? this.formatCurrencyInput(valor) : '';
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

  trackVigencia(index: number): number {
    return index;
  }

  private syncVigenciaValorDisplay(): void {
    this.vigenciaValorDisplay = this.financiera.conpes.vigencias.map((v) =>
      v.valor != null && Number.isFinite(v.valor) ? this.formatCurrencyInput(v.valor) : ''
    );
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
