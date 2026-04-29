import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogoOption, PactosService } from '../../core/services/pactos.service';
import { Pacto } from '../../shared/models';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

type PactoFormData = Pick<
  Pacto,
  'tipoPacto' | 'nombre' | 'descripcion' | 'objetivo' | 'lineasTematicas' | 'fechaSuscripcion' | 'idEtapa' | 'fechaVencimiento' | 'urlDocPacto' | 'urlDocMinuta'
>;

/** Par departamento–municipio (ciudad) incluido en el alcance del pacto. */
interface UbicacionAlcance {
  departamento: string;
  municipio: string;
}

@Component({
  selector: 'app-pactos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pactos-management.component.html',
  styleUrl: './pactos-management.component.css'
})
export class PactosManagementComponent implements OnInit {
  // Lista observable de pactos para mostrar en la vista.
  pactos$: Observable<Pacto[]>;
  readonly etapaPorDefecto = 'implementacion';
  readonly tiposPactoFallback: CatalogoOption[] = [
    { id: 1, codigo: 'TERRITORIO', texto: 'Territorio' },
    { id: 2, codigo: 'NACION', texto: 'Nación' }
  ];
  readonly etapasPactoFallback: CatalogoOption[] = [
    { id: 1, codigo: 'CONSTRUCCION', texto: 'Construcción y suscripción' },
    { id: 2, codigo: 'IMPLEMENTACION', texto: 'Implementación' },
    { id: 3, codigo: 'CIERRE', texto: 'Cierre' }
  ];
  isSubmitting = false;
  isLoadingPactos = false;
  isLoadingCatalogos = false;
  submitError = '';
  submitSuccess = '';
  // Campos auxiliares del formulario.
  lineaTematicaInput = '';
  /** Ubicaciones ya agregadas al alcance (varios departamentos y municipios). */
  ubicacionesAlcance: UbicacionAlcance[] = [];
  /** Borradores para agregar otra fila departamento + municipio. */
  departamentoDraft = '';
  municipioDraft = '';
  alcanceDetalle = '';

  readonly departamentosMunicipios: Record<string, string[]> = {
    Antioquia: ['Medellin', 'Bello', 'Itagui', 'Rionegro'],
    Atlantico: ['Barranquilla', 'Soledad', 'Malambo'],
    Cundinamarca: ['Bogota D.C.', 'Soacha', 'Zipaquira', 'Facatativa'],
    ValleDelCauca: ['Cali', 'Palmira', 'Buenaventura'],
    Santander: ['Bucaramanga', 'Floridablanca', 'Barrancabermeja']
  };

  newPacto: PactoFormData = {
    tipoPacto: '',
    nombre: '',
    descripcion: '',
    objetivo: '',
    lineasTematicas: [],
    fechaSuscripcion: '',
    idEtapa: '',
    fechaVencimiento: '',
    urlDocPacto: '',
    urlDocMinuta: ''
  };

  tiposPactos: CatalogoOption[] = [];
  etapasPacto: CatalogoOption[] = [];

  constructor(private pactosService: PactosService) {
    this.pactos$ = this.pactosService.getPactos();
  }

  ngOnInit(): void {
    this.refreshPactos();
    this.loadCatalogos();
  }

  // Guarda el nombre del archivo seleccionado en el campo correspondiente.
  onFileSelected(event: Event, field: 'urlDocPacto' | 'urlDocMinuta'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.newPacto[field] = file ? file.name : '';
  }

  // Crea un pacto nuevo si los datos esenciales están completos.
  addPacto(): void {
    const { nombre, descripcion, objetivo, tipoPacto, fechaSuscripcion, fechaVencimiento, idEtapa } = this.newPacto;
    this.submitError = '';
    this.submitSuccess = '';

    if (!nombre.trim() || !descripcion.trim() || !objetivo.trim() || !tipoPacto.trim()) {
      this.submitError = 'Faltan campos obligatorios para crear el pacto.';
      return;
    }

    if (!this.tiposPactos.length || !this.etapasPacto.length) {
      this.submitError = 'No fue posible cargar los catálogos requeridos para crear el pacto.';
      return;
    }

    if (!fechaSuscripcion || !fechaVencimiento) {
      this.submitError = 'Debe diligenciar las fechas de suscripción y vencimiento.';
      return;
    }

    if (!idEtapa?.trim()) {
      this.submitError = 'No se encontró una etapa válida para el pacto.';
      return;
    }

    if (!this.ubicacionesAlcance.length) {
      this.submitError = 'Agregue al menos un departamento y un municipio (ciudad) de alcance.';
      return;
    }

    const bloquesUbicacion = this.ubicacionesAlcance.map(
      (u) => `municipio: ${u.departamento.trim()} - ${u.municipio.trim()}`
    );
    const detalle = this.alcanceDetalle.trim();
    const alcance = [
      bloquesUbicacion.length ? `Dptos de intervencion del pacto | ${bloquesUbicacion.join(' | ')}` : '',
      detalle ? `Detalle: ${detalle}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const payload: Omit<Pacto, 'id'> = this.cleanPayload({
      ...this.newPacto,
      alcance,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    });

    this.isSubmitting = true;

    this.pactosService
      .createPactoInApi(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe((result) => {
        if (!result.success) {
          this.submitError = result.message || 'No se pudo crear el pacto.';
          return;
        }

        this.submitSuccess = 'Pacto creado correctamente.';
        this.resetForm();
        this.closeNuevoPactoModal();
        this.refreshPactos();
      });
  }

  // Agrega una línea temática escrita por el usuario.
  addLineaTematicaFromInput(): void {
    const nuevaLinea = this.lineaTematicaInput.trim();

    if (!nuevaLinea) {
      return;
    }

    const existe = this.newPacto.lineasTematicas.some(
      (linea) => linea.toLowerCase() === nuevaLinea.toLowerCase()
    );

    if (!existe) {
      this.newPacto.lineasTematicas = [...this.newPacto.lineasTematicas, nuevaLinea];
    }

    this.lineaTematicaInput = '';
  }

  removeLineaTematica(index: number): void {
    this.newPacto.lineasTematicas = this.newPacto.lineasTematicas.filter((_, i) => i !== index);
  }

  get departamentosDisponibles(): string[] {
    return Object.keys(this.departamentosMunicipios);
  }

  get municipiosDisponiblesDraft(): string[] {
    return this.departamentosMunicipios[this.departamentoDraft] ?? [];
  }

  onDepartamentoDraftChange(): void {
    this.municipioDraft = '';
  }

  addUbicacionAlcance(): void {
    const dep = this.departamentoDraft.trim();
    const mun = this.municipioDraft.trim();

    if (!dep || !mun) {
      this.submitError = 'Seleccione departamento y municipio antes de agregar la ubicación.';
      return;
    }

    const duplicado = this.ubicacionesAlcance.some(
      (u) =>
        u.departamento.toLowerCase() === dep.toLowerCase() &&
        u.municipio.toLowerCase() === mun.toLowerCase()
    );

    if (duplicado) {
      this.submitError = 'Esa combinación de departamento y municipio ya está en el alcance.';
      return;
    }

    this.submitError = '';
    this.ubicacionesAlcance = [...this.ubicacionesAlcance, { departamento: dep, municipio: mun }];
    this.municipioDraft = '';
  }

  removeUbicacionAlcance(index: number): void {
    this.ubicacionesAlcance = this.ubicacionesAlcance.filter((_, i) => i !== index);
  }

  removePacto(id: number): void {
    this.pactosService.removePacto(id);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTotalValorEstimado(): number {
    return this.pactosService.getTotalValorEstimado();
  }

  private resetForm(): void {
    this.lineaTematicaInput = '';
    this.ubicacionesAlcance = [];
    this.departamentoDraft = '';
    this.municipioDraft = '';
    this.alcanceDetalle = '';
    this.newPacto = {
      tipoPacto: '',
      nombre: '',
      descripcion: '',
      objetivo: '',
      lineasTematicas: [],
      fechaSuscripcion: '',
      idEtapa: this.getDefaultEtapaId(),
      fechaVencimiento: '',
      urlDocPacto: '',
      urlDocMinuta: ''
    };
  }

  private loadCatalogos(): void {
    this.isLoadingCatalogos = true;
    this.submitError = '';

    this.pactosService
      .getPactoCatalogos()
      .pipe(finalize(() => (this.isLoadingCatalogos = false)))
      .subscribe({
        next: ({ tiposPacto, etapas }) => {
          this.tiposPactos = tiposPacto.length ? tiposPacto : this.tiposPactoFallback;
          this.etapasPacto = etapas.length ? etapas : this.etapasPactoFallback;
          this.newPacto.idEtapa = this.getDefaultEtapaId();

          if (!tiposPacto.length || !etapas.length) {
            this.submitError = 'Se usaron opciones por defecto para tipo de pacto y etapa.';
          }
        },
        error: () => {
          this.tiposPactos = this.tiposPactoFallback;
          this.etapasPacto = this.etapasPactoFallback;
          this.newPacto.idEtapa = this.getDefaultEtapaId();
          this.submitError = 'Se usaron opciones por defecto para tipo de pacto y etapa.';
        }
      });
  }

  private refreshPactos(): void {
    this.isLoadingPactos = true;
    this.pactosService
      .syncPactosFromApi()
      .pipe(finalize(() => (this.isLoadingPactos = false)))
      .subscribe();
  }

  private closeNuevoPactoModal(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const modalElement = document.getElementById('nuevoPactoModal');
    if (!modalElement) {
      return;
    }

    const bootstrapModal = (window as Window & {
      bootstrap?: {
        Modal?: {
          getInstance(element: Element): { hide(): void } | null;
          getOrCreateInstance?(element: Element): { hide(): void };
        };
      };
    }).bootstrap?.Modal;

    const modalInstance = bootstrapModal?.getInstance(modalElement)
      || bootstrapModal?.getOrCreateInstance?.(modalElement);

    if (modalInstance) {
      modalInstance.hide();
      return;
    }

    modalElement.querySelector<HTMLElement>('[data-bs-dismiss="modal"]')?.click();
  }

  private getDefaultEtapaId(): string {
    if (!this.etapasPacto.length) {
      return '';
    }

    const defaultEtapa = this.etapasPacto.find((etapa) =>
      this.normalizeText(etapa.texto).includes(this.etapaPorDefecto)
    );

    return String((defaultEtapa || this.etapasPacto[0]).id);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private cleanPayload(payload: Omit<Pacto, 'id'>): Omit<Pacto, 'id'> {
    const entries = Object.entries(payload).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    });

    return Object.fromEntries(entries) as Omit<Pacto, 'id'>;
  }
}
