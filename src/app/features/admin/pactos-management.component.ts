import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreatePactoCommand,
  CatalogoOption,
  EntidadTerritorialOption,
  PactosService,
  type UpdatePactoCommand
} from '../../core/services/pactos.service';
import { Pacto } from '../../shared/models';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

type PactoFormData = {
  id: number | null;
  tipoPacto: string;
  nombre: string;
  descripcion: string;
  objetivo: string;
  lineasTematicas: string[];
  fechaSuscripcion: string;
  idEtapa: string;
  fechaVencimiento: string;
  urlDocPacto: string;
  urlDocMinuta: string;
};

/** Par departamento–municipio (ciudad) incluido en el alcance del pacto. */
interface MunicipioAlcance {
  idEntidadTerritorial: string;
  idDepartamento?: string;
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
  modoFormulario: 'crear' | 'editar' = 'crear';
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
  /** Avisos inline (catalogos, agregar municipio, etc.). */
  submitError = '';
  submitSuccess = '';
  /** Errores al guardar el pacto (modal superpuesto). */
  savePactoErrores: string[] = [];
  // Campos auxiliares del formulario.
  lineaTematicaInput = '';
  /** Municipios ya agregados al alcance. */
  municipiosAlcance: MunicipioAlcance[] = [];
  /** Departamentos disponibles derivados de los municipios agregados. */
  departamentosDisponibles: string[] = [];
  /** Departamentos agregados por separado y filtrados por los municipios seleccionados. */
  departamentosAlcance: string[] = [];
  /** Catálogo de municipios cargado desde la API. */
  entidadesTerritoriales: EntidadTerritorialOption[] = [];
  isLoadingEntidadesTerritoriales = false;
  /** Borradores para agregar ubicaciones al alcance. */
  departamentoDraft = '';
  municipioDraft = '';
  municipioSearch = '';
  municipioSeleccionadoId = '';
  alcanceDetalle = '';
  idAreasIntervencionSeleccionadas: string[] = [];

  pactoForm: PactoFormData = {
    id: null,
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
    this.loadEntidadesTerritoriales();
  }

  // Guarda el nombre del archivo seleccionado en el campo correspondiente.
  onFileSelected(event: Event, field: 'urlDocPacto' | 'urlDocMinuta'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.pactoForm[field] = file ? file.name : this.pactoForm[field];
  }

  // Abre el modal limpio para crear un pacto.
  abrirModalNuevoPacto(): void {
    this.modoFormulario = 'crear';
    this.resetForm();
    this.submitError = '';
    this.submitSuccess = '';
    this.closeSavePactoErrorModal();
    this.openPactoModal();
  }

  // Abre el modal con los datos del pacto seleccionado.
  abrirModalEditarPacto(pacto: Pacto): void {
    this.submitError = '';
    this.submitSuccess = '';
    this.closeSavePactoErrorModal();
    this.modoFormulario = 'editar';
    this.cargarFormularioDesdePacto(pacto);
    this.openPactoModal();
  }

  closeSavePactoErrorModal(): void {
    this.savePactoErrores = [];
    this.hideBootstrapModal('pactoSaveErrorModal');
  }

  // Crea o actualiza un pacto dependiendo del modo del formulario.
  guardarPacto(): void {
    if (this.isSubmitting) {
      return;
    }

    this.closeSavePactoErrorModal();
    this.submitSuccess = '';

    const isEditMode = this.modoFormulario === 'editar';
    const idAreasIntervencion = this.obtenerIdAreasIntervencion();
    const errores = this.collectPactoFormValidationErrors({
      isEditMode,
      id: this.pactoForm.id,
      tipoPacto: this.pactoForm.tipoPacto,
      nombre: this.pactoForm.nombre,
      descripcion: this.pactoForm.descripcion,
      objetivo: this.pactoForm.objetivo,
      idEtapa: this.pactoForm.idEtapa,
      fechaSuscripcion: this.pactoForm.fechaSuscripcion,
      fechaVencimiento: this.pactoForm.fechaVencimiento,
      lineasTematicasCount: this.pactoForm.lineasTematicas.length,
      idAreasIntervencionCount: idAreasIntervencion.length
    });

    if (errores.length) {
      this.presentSavePactoErrores(errores);
      return;
    }

    const pactoId = this.pactoForm.id;
    if (isEditMode && (pactoId == null || pactoId < 1)) {
      this.presentSavePactoErrores(['No fue posible identificar el pacto a actualizar.']);
      return;
    }

    this.isSubmitting = true;

    const request$ = isEditMode
      ? this.pactosService.updatePactoInApi(this.buildUpdatePayload(pactoId!, idAreasIntervencion))
      : this.pactosService.createPactoInApi(this.buildCreatePayload());

    request$
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe((result) => {
        if (!result.success) {
          this.presentSavePactoErrores([result.message || 'No se pudo guardar el pacto en la API.']);
          return;
        }

        this.submitSuccess = isEditMode
          ? 'Pacto actualizado correctamente.'
          : 'Pacto creado correctamente.';
        this.closeSavePactoErrorModal();
        this.resetForm();
        this.closePactoModal();
        this.refreshPactos();
      });
  }

  // Agrega una línea temática escrita por el usuario.
  addLineaTematicaFromInput(): void {
    const nuevaLinea = this.lineaTematicaInput.trim();

    if (!nuevaLinea) {
      return;
    }

    const existe = this.pactoForm.lineasTematicas.some(
      (linea) => linea.toLowerCase() === nuevaLinea.toLowerCase()
    );

    if (!existe) {
      this.pactoForm.lineasTematicas = [...this.pactoForm.lineasTematicas, nuevaLinea];
    }

    this.lineaTematicaInput = '';
  }

  removeLineaTematica(index: number): void {
    this.pactoForm.lineasTematicas = this.pactoForm.lineasTematicas.filter((_, i) => i !== index);
  }

  get municipiosDisponiblesDraft(): EntidadTerritorialOption[] {
    const seleccionados = new Set(this.municipiosAlcance.map((item) => item.idEntidadTerritorial));
    return this.entidadesTerritoriales.filter((item) => !seleccionados.has(item.idEntidadTerritorial));
  }

  get municipiosFiltrados(): EntidadTerritorialOption[] {
    const filtro = this.normalizeText(this.municipioSearch);

    return this.municipiosDisponiblesDraft
      .filter((municipio) => {
        if (!filtro) {
          return true;
        }

        const nombre = this.normalizeText(municipio.nombreEntidadTerritorial);
        const departamento = this.normalizeText(municipio.nombreDepartamento);
        return nombre.includes(filtro) || departamento.includes(filtro);
      })
      .sort((a, b) => a.nombreEntidadTerritorial.localeCompare(b.nombreEntidadTerritorial, 'es-CO', { sensitivity: 'base' }));
  }

  addMunicipioAlcance(): void {
    const seleccion = this.resolverMunicipioDraft();

    if (!seleccion) {
      this.submitError = 'Seleccione un municipio antes de agregar la ubicación.';
      return;
    }

    const duplicado = this.municipiosAlcance.some(
      (u) => u.idEntidadTerritorial === seleccion.idEntidadTerritorial
    );

    if (duplicado) {
      this.submitError = 'Ese municipio ya está agregado en el alcance.';
      return;
    }

    this.submitError = '';
    this.municipiosAlcance = [
      ...this.municipiosAlcance,
      {
        idEntidadTerritorial: seleccion.idEntidadTerritorial,
        idDepartamento: seleccion.idDepartamento,
        departamento: seleccion.nombreDepartamento || 'N/A',
        municipio: seleccion.nombreEntidadTerritorial
      }
    ];
    this.idAreasIntervencionSeleccionadas = [];
    this.municipioDraft = '';
    this.municipioSearch = '';
    this.municipioSeleccionadoId = '';
    this.actualizarDepartamentosDisponibles();
  }

  seleccionarMunicipio(municipio: EntidadTerritorialOption): void {
    this.municipioSeleccionadoId = municipio.idEntidadTerritorial;
    this.municipioDraft = municipio.idEntidadTerritorial;
    this.municipioSearch = municipio.nombreEntidadTerritorial;
  }

  onMunicipioSearchChange(): void {
    this.municipioSeleccionadoId = '';
    this.municipioDraft = '';
  }

  addDepartamentoAlcance(): void {
    const departamento = this.departamentoDraft.trim();

    if (!departamento) {
      this.submitError = 'Seleccione un departamento antes de agregarlo.';
      return;
    }

    if (!this.departamentosDisponibles.includes(departamento)) {
      this.submitError = 'El departamento seleccionado no corresponde a los municipios agregados.';
      return;
    }

    const duplicado = this.departamentosAlcance.some(
      (item) => item.toLowerCase() === departamento.toLowerCase()
    );

    if (duplicado) {
      this.submitError = 'Ese departamento ya está agregado en el alcance.';
      return;
    }

    this.submitError = '';
    this.departamentosAlcance = [...this.departamentosAlcance, departamento];
    this.idAreasIntervencionSeleccionadas = [];
    this.departamentoDraft = '';
  }

  removeMunicipioAlcance(index: number): void {
    this.municipiosAlcance = this.municipiosAlcance.filter((_, i) => i !== index);
    this.actualizarDepartamentosDisponibles();
  }

  removeDepartamentoAlcance(index: number): void {
    this.departamentosAlcance = this.departamentosAlcance.filter((_, i) => i !== index);
  }

  removePacto(id: number): void {
    this.pactosService.removePacto(id);
  }

  getMunicipiosAlcancePacto(pacto: Pacto): MunicipioAlcance[] {
    const ids = this.obtenerIdsAreasIntervencionPacto(pacto);
    const municipios: MunicipioAlcance[] = [];

    for (const id of ids) {
      const municipio = this.entidadesTerritoriales.find((item) => item.idEntidadTerritorial === id);
      if (!municipio) {
        continue;
      }

      municipios.push({
        idEntidadTerritorial: municipio.idEntidadTerritorial,
        idDepartamento: municipio.idDepartamento,
        departamento: municipio.nombreDepartamento || 'N/A',
        municipio: municipio.nombreEntidadTerritorial
      });
    }

    return municipios;
  }

  getDepartamentosAlcancePacto(pacto: Pacto): string[] {
    const ids = this.obtenerIdsAreasIntervencionPacto(pacto);
    const departamentos = new Set<string>();

    for (const id of ids) {
      const municipio = this.entidadesTerritoriales.find((item) => item.idEntidadTerritorial === id);
      if (municipio?.nombreDepartamento) {
        departamentos.add(municipio.nombreDepartamento);
        continue;
      }

      const departamento = this.entidadesTerritoriales.find((item) => item.idDepartamento === id);
      if (departamento?.nombreDepartamento) {
        departamentos.add(departamento.nombreDepartamento);
      }
    }

    return [...departamentos];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getEtapaTexto(value?: string): string {
    const raw = (value || '').trim();
    if (!raw) return 'Sin etapa';

    const normalized = this.normalizeText(raw);
    const byId = this.etapasPacto.find((e) => String(e.id) === raw);
    if (byId?.texto) return byId.texto;

    const byText = this.etapasPacto.find((e) => this.normalizeText(e.texto) === normalized || this.normalizeText(e.codigo) === normalized);
    return byText?.texto || raw;
  }

  getEtapaKey(value?: string): 'implementacion' | 'cierre' | 'otro' {
    const normalized = this.normalizeText(this.getEtapaTexto(value));
    if (normalized.includes('cierre')) return 'cierre';
    if (normalized.includes('implementacion')) return 'implementacion';
    return 'otro';
  }

  getEtapaBadgeClass(value?: string): string {
    const key = this.getEtapaKey(value);
    if (key === 'implementacion') return 'badge-etapa-implementacion';
    if (key === 'cierre') return 'badge-etapa-cierre';
    return 'badge-etapa-otro';
  }

  getPactoCardClass(value?: string): string {
    const key = this.getEtapaKey(value);
    if (key === 'implementacion') return 'pacto-item-card--implementacion';
    if (key === 'cierre') return 'pacto-item-card--cierre';
    return 'pacto-item-card--otro';
  }

  getTotalValorEstimado(): number {
    return this.pactosService.getTotalValorEstimado();
  }

  private resetForm(): void {
    this.closeSavePactoErrorModal();
    this.lineaTematicaInput = '';
    this.municipiosAlcance = [];
    this.departamentosDisponibles = [];
    this.departamentosAlcance = [];
    this.departamentoDraft = '';
    this.municipioDraft = '';
    this.municipioSearch = '';
    this.municipioSeleccionadoId = '';
    this.alcanceDetalle = '';
    this.idAreasIntervencionSeleccionadas = [];
    this.pactoForm = {
      id: null,
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
          this.pactoForm.idEtapa = this.getDefaultEtapaId();

          if (!tiposPacto.length || !etapas.length) {
            this.submitError = 'Se usaron opciones por defecto para tipo de pacto y etapa.';
          }
        },
        error: () => {
          this.tiposPactos = this.tiposPactoFallback;
          this.etapasPacto = this.etapasPactoFallback;
          this.pactoForm.idEtapa = this.getDefaultEtapaId();
          this.submitError = 'Se usaron opciones por defecto para tipo de pacto y etapa.';
        }
      });
  }

  private loadEntidadesTerritoriales(): void {
    this.isLoadingEntidadesTerritoriales = true;

    this.pactosService
      .getEntidadTerritorialCatalogo()
      .pipe(finalize(() => (this.isLoadingEntidadesTerritoriales = false)))
      .subscribe({
        next: (items) => {
          this.entidadesTerritoriales = items;
        },
        error: () => {
          this.entidadesTerritoriales = [];
          this.submitError = 'No fue posible cargar los municipios desde la API de entidades territoriales.';
        }
      });
  }

  private actualizarDepartamentosDisponibles(): void {
    this.departamentosDisponibles = this.obtenerOpcionesUnicas(
      this.municipiosAlcance.map((item) => item.departamento).filter(Boolean)
    );

    const permitidos = new Set(this.departamentosDisponibles.map((item) => item.toLowerCase()));
    this.departamentosAlcance = this.departamentosAlcance.filter((departamento) => permitidos.has(departamento.toLowerCase()));

    if (this.departamentoDraft && !permitidos.has(this.departamentoDraft.toLowerCase())) {
      this.departamentoDraft = '';
    }
  }

  private resolverMunicipioDraft(): EntidadTerritorialOption | undefined {
    const idSeleccionado = this.municipioSeleccionadoId.trim() || this.municipioDraft.trim();
    if (idSeleccionado) {
      const porId = this.entidadesTerritoriales.find((municipio) => municipio.idEntidadTerritorial === idSeleccionado);
      if (porId) {
        return porId;
      }
    }

    const texto = this.normalizeText(this.municipioSearch);
    if (!texto) {
      return undefined;
    }

    return this.municipiosDisponiblesDraft.find((municipio) => {
      const nombre = this.normalizeText(municipio.nombreEntidadTerritorial);
      return nombre === texto || nombre.includes(texto);
    });
  }

  private obtenerOpcionesUnicas(valores: string[]): string[] {
    return [...new Set(valores.map((valor) => valor.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es-CO', { sensitivity: 'base' })
    );
  }

  private refreshPactos(): void {
    this.isLoadingPactos = true;
    this.pactosService
      .syncPactosFromApi()
      .pipe(finalize(() => (this.isLoadingPactos = false)))
      .subscribe();
  }

  private openPactoModal(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const modalElement = document.getElementById('pactoModal');
    if (!modalElement) {
      return;
    }

    const bootstrapModal = (window as Window & {
      bootstrap?: {
        Modal?: {
          getInstance(element: Element): { show(): void; hide(): void } | null;
          getOrCreateInstance?(element: Element): { show(): void; hide(): void };
        };
      };
    }).bootstrap?.Modal;

    const modalInstance = bootstrapModal?.getInstance(modalElement)
      || bootstrapModal?.getOrCreateInstance?.(modalElement)
      || (bootstrapModal ? new (bootstrapModal as any)(modalElement) : null);

    if (modalInstance) {
      modalInstance.show();
      return;
    }

    modalElement.classList.add('show');
    modalElement.setAttribute('style', 'display: block;');
    document.body.classList.add('modal-open');
  }

  private closePactoModal(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const modalElement = document.getElementById('pactoModal');
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

    modalElement.classList.remove('show');
    modalElement.removeAttribute('style');
    document.body.classList.remove('modal-open');
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

  private cargarFormularioDesdePacto(pacto: Pacto): void {
    this.resetForm();

    this.pactoForm = {
      id: pacto.id,
      tipoPacto: this.resolveTipoPactoValue(pacto),
      nombre: pacto.nombre || '',
      descripcion: pacto.descripcion || '',
      objetivo: pacto.objetivo || '',
      lineasTematicas: [...(pacto.lineasTematicas || [])],
      fechaSuscripcion: this.toDateInputValue(pacto.fechaSuscripcion),
      idEtapa: this.resolveEtapaValue(pacto),
      fechaVencimiento: this.toDateInputValue(pacto.fechaVencimiento),
      urlDocPacto: pacto.urlDocPacto || '',
      urlDocMinuta: pacto.urlDocMinuta || ''
    };

    this.idAreasIntervencionSeleccionadas = [...(pacto.idAreasIntervencion || [])];
    this.cargarAlcanceDesdeIds(this.idAreasIntervencionSeleccionadas, pacto.alcance || '');
  }

  private obtenerIdsAreasIntervencionPacto(pacto: Pacto): string[] {
    return [...new Set((pacto.idAreasIntervencion || []).map((item) => item.trim()).filter(Boolean))];
  }

  private cargarAlcanceDesdeIds(idAreasIntervencion: string[], alcanceTexto: string): void {
    const ids = [...new Set(idAreasIntervencion.map((item) => item.trim()).filter(Boolean))];
    const municipios: MunicipioAlcance[] = [];
    const departamentos: string[] = [];

    for (const id of ids) {
      const municipio = this.entidadesTerritoriales.find((item) => item.idEntidadTerritorial === id);
      if (municipio) {
        municipios.push({
          idEntidadTerritorial: municipio.idEntidadTerritorial,
          idDepartamento: municipio.idDepartamento,
          departamento: municipio.nombreDepartamento || 'N/A',
          municipio: municipio.nombreEntidadTerritorial
        });
        continue;
      }

      const departamento = this.entidadesTerritoriales.find((item) => item.idDepartamento === id);
      if (departamento && !departamentos.includes(departamento.nombreDepartamento)) {
        departamentos.push(departamento.nombreDepartamento);
      }
    }

    this.municipiosAlcance = municipios;
    this.departamentosAlcance = departamentos;
    this.actualizarDepartamentosDisponibles();
    this.alcanceDetalle = this.extractDetalleDesdeAlcance(alcanceTexto);
    this.idAreasIntervencionSeleccionadas = ids.length ? ids : this.extraerIdAreasIntervencionDesdeAlcance(alcanceTexto);
  }

  private buildCreatePayload(): CreatePactoCommand {
    return {
      idTipoPacto: this.readNumericSelection(this.pactoForm.tipoPacto),
      nombre: this.pactoForm.nombre.trim(),
      suscribientes: this.pactoForm.descripcion.trim(),
      objetivo: this.pactoForm.objetivo.trim(),
      lineasTematicas: this.pactoForm.lineasTematicas.join(', ').trim(),
      fechaSubscripcion: this.toIsoDateValue(this.pactoForm.fechaSuscripcion),
      fechaVencimiento: this.toIsoDateValue(this.pactoForm.fechaVencimiento),
      idEtapa: this.readNumericSelection(this.pactoForm.idEtapa),
      idAreasIntervencion: this.obtenerIdAreasIntervencion(),
      urlPacto: this.pactoForm.urlDocPacto.trim(),
      urlMinuta: this.pactoForm.urlDocMinuta.trim()
    };
  }

  private buildUpdatePayload(id: number, idAreasIntervencion: string[]): UpdatePactoCommand {
    const tipoPactoId = this.readNumericSelection(this.pactoForm.tipoPacto);
    const etapaId = this.readNumericSelection(this.pactoForm.idEtapa);

    return {
      id,
      idTipoPacto: tipoPactoId,
      nombre: this.pactoForm.nombre.trim(),
      suscribientes: this.pactoForm.descripcion.trim(),
      objetivo: this.pactoForm.objetivo.trim(),
      lineasTematicas: this.pactoForm.lineasTematicas.join(', ').trim(),
      fechaSubscripcion: this.toIsoDateValue(this.pactoForm.fechaSuscripcion),
      fechaVencimiento: this.toIsoDateValue(this.pactoForm.fechaVencimiento),
      idEtapa: etapaId,
      idAreasIntervencion,
      urlPacto: this.pactoForm.urlDocPacto.trim(),
      urlMinuta: this.pactoForm.urlDocMinuta.trim()
    };
  }

  obtenerIdAreasIntervencion(): string[] {
    const municipios = this.municipiosAlcance.map((item) => item.idEntidadTerritorial.trim()).filter(Boolean);
    const departamentos = this.departamentosAlcance
      .map((departamento) => this.resolveDepartamentoId(departamento))
      .filter(Boolean);

    if (municipios.length || departamentos.length) {
      return [...new Set([...municipios, ...departamentos])];
    }

    return [...this.idAreasIntervencionSeleccionadas];
  }

  private extraerIdAreasIntervencionDesdeAlcance(alcanceTexto: string): string[] {
    const texto = (alcanceTexto || '').trim();
    if (!texto) {
      return [];
    }

    const ids: string[] = [];
    const segmentos = texto.split('|').map((segmento) => segmento.trim()).filter(Boolean);

    for (const segmento of segmentos) {
      const normalized = this.normalizeText(segmento);

      if (normalized.startsWith('municipio:')) {
        const payload = segmento.slice(segmento.indexOf(':') + 1).trim();
        const parts = payload.split('-').map((part) => part.trim()).filter(Boolean);
        const departamento = parts[0] || '';
        const municipio = parts.slice(1).join(' - ');

        const coincidencia = this.entidadesTerritoriales.find((item) =>
          this.normalizeText(item.nombreEntidadTerritorial) === this.normalizeText(municipio)
          && this.normalizeText(item.nombreDepartamento) === this.normalizeText(departamento)
        );

        if (coincidencia) {
          ids.push(coincidencia.idEntidadTerritorial);
        }
        continue;
      }

      if (normalized.startsWith('departamento:')) {
        const departamento = segmento.slice(segmento.indexOf(':') + 1).trim();
        const coincidencia = this.entidadesTerritoriales.find((item) =>
          !!item.idDepartamento && this.normalizeText(item.nombreDepartamento) === this.normalizeText(departamento)
        );

        if (coincidencia?.idDepartamento) {
          ids.push(coincidencia.idDepartamento);
        }
      }
    }

    return [...new Set(ids)];
  }

  private resolveTipoPactoValue(pacto: Pacto): string {
    if (pacto.idTipoPacto) {
      return String(pacto.idTipoPacto);
    }

    const normalizedValue = this.normalizeText(pacto.tipoPacto || '');
    const coincidencia = this.tiposPactos.find((item) =>
      this.normalizeText(item.texto) === normalizedValue
      || this.normalizeText(item.codigo) === normalizedValue
    );

    return coincidencia ? String(coincidencia.id) : '';
  }

  private resolveEtapaValue(pacto: Pacto): string {
    const normalizedValue = this.normalizeText(pacto.idEtapa || '');
    const coincidencia = this.etapasPacto.find((item) =>
      this.normalizeText(item.texto) === normalizedValue
      || this.normalizeText(item.codigo) === normalizedValue
      || String(item.id) === pacto.idEtapa
    );

    return coincidencia ? String(coincidencia.id) : this.getDefaultEtapaId();
  }

  private readNumericSelection(value: string | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private resolveDepartamentoId(nombreDepartamento: string): string {
    const normalized = this.normalizeText(nombreDepartamento);
    const coincidencia = this.entidadesTerritoriales.find((item) =>
      !!item.idDepartamento && this.normalizeText(item.nombreDepartamento) === normalized
    );

    return coincidencia?.idDepartamento || '';
  }

  private extractDetalleDesdeAlcance(alcance?: string): string {
    const texto = (alcance || '').trim();
    if (!texto) {
      return '';
    }

    const segmentos = texto.split('|').map((segmento) => segmento.trim()).filter(Boolean);
    const detalle = segmentos.find((segmento) => this.normalizeText(segmento).startsWith('detalle:'));
    return detalle ? detalle.slice(detalle.indexOf(':') + 1).trim() : '';
  }

  private toDateInputValue(value?: string): string {
    if (!value) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private toIsoDateValue(value?: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  private collectPactoFormValidationErrors(f: {
    isEditMode: boolean;
    id: number | null;
    tipoPacto: string;
    nombre: string;
    descripcion: string;
    objetivo: string;
    idEtapa: string;
    fechaSuscripcion: string;
    fechaVencimiento: string;
    lineasTematicasCount: number;
    idAreasIntervencionCount: number;
  }): string[] {
    const errores: string[] = [];

    if (this.isLoadingCatalogos) {
      errores.push('Espere a que terminen de cargar los catalogos de tipo de pacto y etapa.');
    }

    if (!this.tiposPactos.length) {
      errores.push('Tipo de Pacto: no hay opciones de catalogo disponibles.');
    }
    if (!this.etapasPacto.length) {
      errores.push('ID Etapa: no hay opciones de catalogo disponibles.');
    }

    const tipoId = this.readNumericSelection(f.tipoPacto);
    if (!f.tipoPacto.trim()) {
      errores.push('Tipo de Pacto: debe seleccionar una opcion.');
    } else if (tipoId < 1) {
      errores.push('Tipo de Pacto: seleccion invalida.');
    }

    if (!f.nombre.trim()) {
      errores.push('Nombre del pacto: campo obligatorio.');
    }

    const etapaId = this.readNumericSelection(f.idEtapa);
    if (!f.idEtapa.trim()) {
      errores.push('ID Etapa: debe seleccionar una etapa.');
    } else if (etapaId < 1) {
      errores.push('ID Etapa: seleccion invalida.');
    }

    if (!f.descripcion.trim()) {
      errores.push('Suscribientes o integrantes: campo obligatorio.');
    }

    if (!f.objetivo.trim()) {
      errores.push('Objetivo: campo obligatorio.');
    }

    if (f.lineasTematicasCount < 1) {
      errores.push('Lineas tematicas: agregue al menos una linea tematica.');
    }

    const suscripcionYmd = (f.fechaSuscripcion || '').trim();
    if (!suscripcionYmd) {
      errores.push('Fecha de Suscripcion: campo obligatorio.');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(suscripcionYmd)) {
      errores.push('Fecha de Suscripcion: formato invalido (use AAAA-MM-DD).');
    }

    const vencimientoYmd = (f.fechaVencimiento || '').trim();
    if (!vencimientoYmd) {
      errores.push('Fecha de Vencimiento: campo obligatorio.');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimientoYmd)) {
      errores.push('Fecha de Vencimiento: formato invalido (use AAAA-MM-DD).');
    } else if (
      /^\d{4}-\d{2}-\d{2}$/.test(suscripcionYmd)
      && vencimientoYmd < suscripcionYmd
    ) {
      errores.push('Fecha de Vencimiento: debe ser igual o posterior a la fecha de suscripcion.');
    }

    if (!f.isEditMode && f.idAreasIntervencionCount < 1) {
      errores.push('Municipio de alcance: agregue al menos un municipio o area de intervencion.');
    }

    if (f.isEditMode && (f.id == null || f.id < 1)) {
      errores.push('No fue posible identificar el pacto a editar.');
    }

    return errores;
  }

  private presentSavePactoErrores(errores: string[]): void {
    this.savePactoErrores = errores.filter((e) => !!e?.trim());
    if (!this.savePactoErrores.length) {
      return;
    }
    setTimeout(() => this.showBootstrapModal('pactoSaveErrorModal'), 0);
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
}
