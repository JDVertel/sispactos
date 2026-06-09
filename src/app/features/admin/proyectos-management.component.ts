import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CreateProyectoCommand,
  ProyectoImagenApiCommand,
  ProyectoApiResult,
  ProyectoDetalleApi,
  ProyectosService,
  ProyectoImagenUpload,
  UpdateProyectoCommand
} from '../../core/services/proyectos.service';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Pacto, Proyecto, ProyectoImagenRegistrada, ProyectoMultimediaMetadato } from '../../shared/models';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, take, tap } from 'rxjs/operators';
import { PROYECTO_DEV_LOCAL_SAVE } from '../../core/config/proyecto-save.config';
import { parseCamposDesdeAlcanceApi } from '../../core/utils/proyecto-alcance-fields.util';
import { UbicacionMapComponent } from '../../shared/components/ubicacion-map/ubicacion-map.component';
import {
  CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO,
  CATALOGO_TIPO_APORTANTE_NACION_PROYECTO,
  CATALOGO_TIPO_CONDICION_PROYECTO,
  CATALOGO_TIPO_ESTADO_PROYECTO,
  CATALOGO_TIPO_SECTOR_PROYECTO,
  CatalogoOption,
  EntidadTerritorialOption,
  PactosService,
  catalogoByTipoRoute
} from '../../core/services/pactos.service';
import {
  EntidadResponsableProyectoOption,
  EntidadesResponsablesProyectoService
} from '../../core/services/entidades-responsables-proyecto.service';

type ModoFormularioProyecto = 'crear' | 'editar';

interface ProyectoFormData {
  pactoAsociado: string;
  bpin: string;
  nombreProyectoBpin: string;
  nombreIniciativa: string;
  /** Id de entidad responsable (catálogo dedicado; API pendiente). */
  entidadResponsableId: string;
  actaCdNumero: string;
  actaCdFecha: string;
  idAreaInfluencia: number | null;
  idEstadoProyecto: number | null;
  idCondicionProyecto: number | null;
  idSector: number | null;
  lineaTematica: string;
  numeroEmpleosDirectos: number;
  numeroEmpleosIndirectos: number;
  consecutivoConpes: string;
  tieneViabilidad: boolean;
  fechaViabilidad: string;
  frpt: boolean;
  numeroContratoEspecifico: string;
  idAportanteNacion: number | null;
  /** idEntidadTerritorial (GET /api/EntidadTerritorial). */
  municipioEntidad: string;
  inversionClimatica: boolean;
  alcance: string;
  /** Meta de producto principal → API `productoPrincipalMGA`. */
  metaProductoPrincipal: string;
  /** Producto principal MGA (descripcion complementaria en formulario). */
  productoMgaDescripcion: string;
  unidadMedidaMeta: string;
  sesionCDInclusion: number | null;
  latitud: number | null;
  longitud: number | null;
}

type MultimediaModalTipo = 'imagen' | 'video';

type MultimediaImagenAdjunta = {
  id: string;
  /** Id del archivo en API (imagen ya persistida). */
  idArchivo?: string | null;
  /** Contenido original devuelto por la API (base64 / data URL). */
  archivoImagenApi?: string | null;
  file: File;
  url: string;
  nombre: string;
  comprimida?: boolean;
  fecha: string;
  detalle: string;
};

type MultimediaVideoUrl = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  etiqueta: string;
  valida: boolean;
  fecha: string;
  detalle: string;
};

type MultimediaImagenPreview = {
  src: string;
  alt: string;
  nombre: string;
  comprimida?: boolean;
  tamano: string;
  fecha?: string;
  detalle?: string;
};

/** Campos del formulario con validacion en tiempo real. */
type ProyectoCampoValidacion =
  | 'pacto'
  | 'bpin'
  | 'nombreProyectoBpin'
  | 'nombreIniciativa'
  | 'consecutivoConpes'
  | 'actaCdFecha'
  | 'estado'
  | 'condicion'
  | 'sector'
  | 'lineaTematica'
  | 'fechaViabilidad'
  | 'numeroContratoEspecifico'
  | 'sesionCd'
  | 'alcance'
  | 'metaProductoPrincipal';

@Component({
  selector: 'app-proyectos-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UbicacionMapComponent],
  templateUrl: './proyectos-management.component.html',
  styleUrl: './proyectos-management.component.css'
})
export class ProyectosManagementComponent implements OnInit {
  proyectos$: Observable<Proyecto[]>;
  modoFormulario: ModoFormularioProyecto = 'crear';
  editingProyectoApiId: number | null = null;
  isLoadingProyectosTabla = false;
  isLoadingProyectoDetalle = false;

  private pactosCatalogo: Pacto[] = [];
  private pactosOptionsFallback: Array<{ id: number; nombre: string }> = [];
  pactosDisponibles: string[] = [];

  areasInfluenciaCatalogo: CatalogoOption[] = [];
  estadosProyectoCatalogo: CatalogoOption[] = [];
  condicionesProyectoCatalogo: CatalogoOption[] = [];
  sectoresProyectoCatalogo: CatalogoOption[] = [];
  aportantesNacionCatalogo: CatalogoOption[] = [];
  entidadesTerritorialesProyecto: EntidadTerritorialOption[] = [];
  entidadesResponsablesOpciones: EntidadResponsableProyectoOption[] = [];
  isLoadingEntidadesResponsables = false;
  private catalogosProyectoListos = false;

  readonly catalogoByTipoRoute = catalogoByTipoRoute;
  readonly catalogoTipoAreaInfluencia = CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO;
  readonly catalogoTipoEstadoProyecto = CATALOGO_TIPO_ESTADO_PROYECTO;
  readonly catalogoTipoCondicionProyecto = CATALOGO_TIPO_CONDICION_PROYECTO;
  readonly catalogoTipoSectorProyecto = CATALOGO_TIPO_SECTOR_PROYECTO;
  readonly catalogoTipoAportanteNacion = CATALOGO_TIPO_APORTANTE_NACION_PROYECTO;

  newProyecto: ProyectoFormData = this.getInitialFormData();
  isSavingProyecto = false;
  /** Errores de API o del sistema al guardar (no validacion de campos). */
  saveProyectoErrores: string[] = [];
  /** Validacion en tiempo real por campo. */
  private fieldTouched: Partial<Record<ProyectoCampoValidacion, boolean>> = {};
  fieldErrors: Partial<Record<ProyectoCampoValidacion, string>> = {};
  private formularioValidacionActiva = false;

  multimediaAdjuntos: MultimediaImagenAdjunta[] = [];
  multimediaVideoUrls: MultimediaVideoUrl[] = [];
  readonly tamanoMaxImagenMultimedia = 300 * 1024;
  readonly multimediaMaxLadoImagenPx = 1920;
  multimediaSeleccionError = '';
  isProcessingMultimedia = false;
  multimediaImagenPreview: MultimediaImagenPreview | null = null;

  multimediaModalTipo: MultimediaModalTipo = 'imagen';
  multimediaModalFecha = '';
  multimediaModalDetalle = '';
  multimediaModalUrlVideo = '';
  multimediaModalError = '';
  multimediaModalArchivosPendientes: File[] = [];
  multimediaModalPreviewUrls: string[] = [];

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService,
    private readonly entidadesResponsablesService: EntidadesResponsablesProyectoService,
    private readonly authService: AuthService,
    private readonly authPromptService: AuthPromptService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
  }

  abrirModalNuevoProyecto(): void {
    this.modoFormulario = 'crear';
    this.editingProyectoApiId = null;
    this.resetForm();
    this.openProyectoModal();
  }

  abrirModalEditarProyecto(proyecto: Proyecto): void {
    this.modoFormulario = 'editar';
    this.editingProyectoApiId = proyecto.apiId ?? proyecto.id;
    this.closeSaveProyectoErrorModal();
    this.clearMultimediaAdjuntos();

    const detalle$ =
      this.editingProyectoApiId != null && this.editingProyectoApiId > 0
        ? this.proyectosService.getProyectoById(this.editingProyectoApiId)
        : of(null as ProyectoDetalleApi | null);

    this.isLoadingProyectoDetalle = true;
    forkJoin({
      catalogos: this.loadCatalogosProyecto$(),
      entidadesResponsables: this.entidadesResponsablesService.getEntidadesResponsables(),
      detalle: detalle$
    })
      .pipe(
        catchError((err) => {
          console.error('[SISPACTOS] Error al preparar edición de proyecto', err);
          return of({
            entidadesResponsables: this.entidadesResponsablesOpciones,
            detalle: null as ProyectoDetalleApi | null
          });
        }),
        finalize(() => (this.isLoadingProyectoDetalle = false))
      )
      .subscribe(({ entidadesResponsables, detalle }) => {
        this.entidadesResponsablesOpciones = [...entidadesResponsables].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es-CO', { sensitivity: 'base' })
        );
        if (detalle) {
          this.cargarFormularioDesdeDetalle(detalle, proyecto);
        } else {
          this.cargarFormularioDesdeProyectoLocal(proyecto);
        }
        setTimeout(() => this.openProyectoModal(), 0);
      });
  }

  ngOnInit(): void {
    this.loadCatalogosProyecto$().subscribe(() => this.reenriquecerProyectosEnMemoria());
    this.cargarProyectosDesdeApi();

    this.pactosService
      .syncPactosFromApi()
      .pipe(
        take(1),
        catchError((err) => {
          console.warn('[SISPACTOS] syncPactosFromApi fallo; se usan pactos en memoria si existen.', err);
          return of([] as Pacto[]);
        })
      )
      .subscribe();

    this.pactosService.getPactos().subscribe((pactos: Pacto[]) => {
      this.applyPactosCatalogo(pactos);
      this.reenriquecerProyectosEnMemoria();
    });

    this.pactosService.getEntidadTerritorialCatalogo().subscribe((rows) => {
      this.entidadesTerritorialesProyecto = [...rows].sort((a, b) =>
        (a.displayName || a.nombreEntidadTerritorial).localeCompare(
          b.displayName || b.nombreEntidadTerritorial,
          'es-CO',
          { sensitivity: 'base' }
        )
      );
      this.reenriquecerProyectosEnMemoria();
    });

    this.cargarEntidadesResponsables();
  }

  private cargarEntidadesResponsables(): void {
    this.isLoadingEntidadesResponsables = true;
    this.entidadesResponsablesService
      .getEntidadesResponsables()
      .pipe(finalize(() => (this.isLoadingEntidadesResponsables = false)))
      .subscribe((rows) => {
        this.entidadesResponsablesOpciones = [...rows].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es-CO', { sensitivity: 'base' })
        );
      });
  }

  get lineasTematicasDisponibles(): string[] {
    const pactoNombre = (this.newProyecto.pactoAsociado || '').trim();
    if (!pactoNombre) return [];

    const key = this.normalizeNombrePacto(pactoNombre);
    const hit = this.pactosCatalogo.find((p) => this.normalizeNombrePacto(p.nombre) === key);
    const lineas = hit?.lineasTematicas ?? [];
    return Array.isArray(lineas) ? lineas.map((x) => String(x || '').trim()).filter(Boolean) : [];
  }

  onPactoAsociadoChange(preservarLineaSiSinOpciones = false): void {
    const opciones = this.lineasTematicasDisponibles;
    if (!opciones.length) {
      if (!preservarLineaSiSinOpciones) {
        this.newProyecto.lineaTematica = '';
      }
      this.onCampoValidacionChange('pacto');
      this.onCampoValidacionChange('lineaTematica');
      return;
    }
    if (this.newProyecto.lineaTematica && !opciones.includes(this.newProyecto.lineaTematica)) {
      this.newProyecto.lineaTematica = '';
    }
    this.onCampoValidacionChange('pacto');
    this.onCampoValidacionChange('lineaTematica');
  }

  closeSaveProyectoErrorModal(): void {
    this.saveProyectoErrores = [];
  }

  marcarCampoTocado(campo: ProyectoCampoValidacion): void {
    this.fieldTouched[campo] = true;
    this.actualizarValidacionCampo(campo);
  }

  onCampoValidacionChange(campo: ProyectoCampoValidacion): void {
    this.fieldTouched[campo] = true;
    this.actualizarValidacionCampo(campo);
  }

  mostrarErrorCampo(campo: ProyectoCampoValidacion): boolean {
    return !!(this.fieldTouched[campo] || this.formularioValidacionActiva) && !!this.fieldErrors[campo];
  }

  mensajeErrorCampo(campo: ProyectoCampoValidacion): string {
    return this.fieldErrors[campo] ?? '';
  }

  claseValidacionCampo(campo: ProyectoCampoValidacion): Record<string, boolean> {
    const tocado = !!(this.fieldTouched[campo] || this.formularioValidacionActiva);
    const invalido = tocado && !!this.fieldErrors[campo];
    const valido = tocado && !this.fieldErrors[campo];
    return {
      'is-invalid': invalido,
      'is-valid': valido
    };
  }

  private limpiarValidacionFormulario(): void {
    this.fieldTouched = {};
    this.fieldErrors = {};
    this.formularioValidacionActiva = false;
  }

  private camposValidacionProyectoActivos(): ProyectoCampoValidacion[] {
    const campos: ProyectoCampoValidacion[] = [
      'pacto',
      'bpin',
      'nombreProyectoBpin',
      'nombreIniciativa',
      'consecutivoConpes',
      'actaCdFecha',
      'estado',
      'condicion',
      'sector',
      'lineaTematica',
      'alcance',
      'sesionCd',
      'metaProductoPrincipal'
    ];
    if (this.newProyecto.tieneViabilidad) {
      campos.push('fechaViabilidad');
    }
    if (this.newProyecto.frpt) {
      campos.push('numeroContratoEspecifico');
    }
    return campos;
  }

  /** Validacion reducida mientras se completa el formulario / integracion API. */
  private camposValidacionProyectoMinimos(): ProyectoCampoValidacion[] {
    return ['nombreIniciativa'];
  }

  private actualizarValidacionCampo(campo: ProyectoCampoValidacion): void {
    const mensaje = this.validarCampoProyecto(campo);
    if (mensaje) {
      this.fieldErrors[campo] = mensaje;
      return;
    }
    delete this.fieldErrors[campo];
  }

  private validarCampoProyecto(campo: ProyectoCampoValidacion): string | null {
    const p = this.newProyecto;
    const lineaTrim = (p.lineaTematica || '').trim();
    const lineasDispLength = this.lineasTematicasDisponibles.length;

    switch (campo) {
      case 'pacto':
        if (!p.pactoAsociado.trim()) {
          return 'Debe seleccionar un pacto.';
        }
        if (!this.findPactoIdByNombre(p.pactoAsociado.trim())) {
          return 'No fue posible identificar el pacto seleccionado.';
        }
        return null;
      case 'bpin': {
        const bpinTrim = p.bpin.trim();
        if (bpinTrim && !/^[A-Za-z0-9]{13}$/.test(bpinTrim)) {
          return 'Debe tener exactamente 13 caracteres alfanumericos.';
        }
        return null;
      }
      case 'nombreProyectoBpin':
        return p.nombreProyectoBpin.trim() ? null : 'Campo obligatorio.';
      case 'nombreIniciativa':
        return p.nombreIniciativa.trim() ? null : 'Campo obligatorio.';
      case 'consecutivoConpes': {
        const conpesTrim = p.consecutivoConpes.trim();
        if (conpesTrim && !/^\d{5}$/.test(conpesTrim)) {
          return 'Debe tener exactamente 5 digitos numericos.';
        }
        return null;
      }
      case 'actaCdFecha': {
        const actaFechaTrim = (p.actaCdFecha || '').trim();
        if (!actaFechaTrim) {
          return null;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(actaFechaTrim)) {
          return 'Formato invalido (use AAAA-MM-DD).';
        }
        if (!this.fechaYmdToIso(actaFechaTrim)) {
          return 'Fecha no valida.';
        }
        return null;
      }
      case 'estado':
        return p.idEstadoProyecto != null && p.idEstadoProyecto >= 1
          ? null
          : 'Debe seleccionar una opcion.';
      case 'condicion':
        return p.idCondicionProyecto != null && p.idCondicionProyecto >= 1
          ? null
          : 'Debe seleccionar una opcion.';
      case 'sector':
        return p.idSector != null && p.idSector >= 1 ? null : 'Debe seleccionar una opcion.';
      case 'lineaTematica':
        if (lineasDispLength > 0 && !lineaTrim) {
          return 'Debe seleccionar una linea del pacto asociado.';
        }
        return null;
      case 'fechaViabilidad':
        if (!p.tieneViabilidad) {
          return null;
        }
        if (!(p.fechaViabilidad || '').trim()) {
          return 'Obligatoria cuando marca "Tiene viabilidad".';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test((p.fechaViabilidad || '').trim())) {
          return 'Formato invalido (use AAAA-MM-DD).';
        }
        return null;
      case 'numeroContratoEspecifico': {
        if (!p.frpt) {
          return null;
        }
        const contratoTrim = p.numeroContratoEspecifico.trim();
        if (!contratoTrim) {
          return 'Obligatorio cuando marca FRPT.';
        }
        if (!this.esNumeroContratoEspecificoCompleto(contratoTrim)) {
          return 'Use el formato XXX-1234567 (3 alfanumericos, guion y 7 digitos).';
        }
        return null;
      }
      case 'sesionCd':
        if (p.sesionCDInclusion == null) {
          return null;
        }
        if (!Number.isInteger(p.sesionCDInclusion) || p.sesionCDInclusion < 1) {
          return 'Debe ser un numero entero positivo.';
        }
        return null;
      case 'alcance':
        return p.alcance.trim() ? null : 'Campo obligatorio.';
      case 'metaProductoPrincipal':
        return null;
      default:
        return null;
    }
  }

  private validarFormularioProyecto(): boolean {
    this.formularioValidacionActiva = true;
    let valido = true;
    const campos = PROYECTO_DEV_LOCAL_SAVE
      ? this.camposValidacionProyectoMinimos()
      : this.camposValidacionProyectoActivos();
    for (const campo of campos) {
      this.fieldTouched[campo] = true;
      this.actualizarValidacionCampo(campo);
      if (this.fieldErrors[campo]) {
        valido = false;
      }
    }
    if (!valido) {
      this.scrollPrimerCampoInvalido();
    }
    return valido;
  }

  private scrollPrimerCampoInvalido(): void {
    setTimeout(() => {
      const el = document.querySelector('#nuevoProyectoModal .form-control.is-invalid, #nuevoProyectoModal .form-select.is-invalid');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  async guardarProyecto(): Promise<void> {
    if (this.isSavingProyecto || this.isLoadingProyectoDetalle) return;
    this.closeSaveProyectoErrorModal();
    // Multimedia es opcional: no se valida ni se exige al guardar.
    this.multimediaSeleccionError = '';

    const isEditMode = this.modoFormulario === 'editar';
    if (isEditMode && this.editingProyectoApiId == null) {
      this.presentSaveProyectoErrores(['No fue posible identificar el proyecto a editar.']);
      return;
    }

    const {
      nombreIniciativa,
      pactoAsociado,
      bpin,
      nombreProyectoBpin,
      actaCdNumero,
      actaCdFecha,
      idSector,
      lineaTematica,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes,
      tieneViabilidad,
      fechaViabilidad,
      frpt,
      numeroContratoEspecifico,
      idAportanteNacion,
      municipioEntidad,
      entidadResponsableId,
      idEstadoProyecto,
      idAreaInfluencia,
      idCondicionProyecto,
      sesionCDInclusion,
      alcance,
      metaProductoPrincipal,
      unidadMedidaMeta
    } = this.newProyecto;

    const lineasDisp = this.lineasTematicasDisponibles;
    const lineaTrim = (lineaTematica || '').trim();
    const nowIso = new Date().toISOString();

    if (!this.validarFormularioProyecto()) {
      return;
    }

    const actaCd = actaCdNumero.trim();
    const actaFechaYmd = actaCdFecha.trim();
    const fechaActaCdIso = actaFechaYmd ? this.fechaYmdToIso(actaFechaYmd) : '';
    const estadoTexto = this.textoCatalogoOption(this.estadosProyectoCatalogo, idEstadoProyecto);
    const sectorTexto = this.textoCatalogoOption(this.sectoresProyectoCatalogo, idSector);
    const idEntidadTerritorial = municipioEntidad.trim();
    const entidadTerr = this.entidadesTerritorialesProyecto.find((e) => e.idEntidadTerritorial === idEntidadTerritorial);
    const nombreEntidadMunicipio =
      entidadTerr?.nombreEntidadTerritorial || entidadTerr?.displayName || '';
    const entidadResponsable = this.entidadesResponsablesOpciones.find(
      (e) => e.id === (entidadResponsableId || '').trim()
    );
    const nombreEntidadResponsable = entidadResponsable?.nombre?.trim() ?? '';
    const responsableProyecto = nombreEntidadResponsable || nombreEntidadMunicipio;

    if (PROYECTO_DEV_LOCAL_SAVE) {
      this.aplicarDefaultsFormularioProyectoDev();
    }

    const idPactoTerritorial = this.resolveIdPactoParaGuardado(pactoAsociado);
    if (!idPactoTerritorial) {
      this.fieldTouched['pacto'] = true;
      this.fieldErrors['pacto'] = 'No fue posible identificar el pacto seleccionado en el sistema.';
      this.scrollPrimerCampoInvalido();
      return;
    }

    const metaProductoPrincipalTexto = (metaProductoPrincipal || '').trim();
    const unidadMedidaMetaTexto = (unidadMedidaMeta || '').trim();
    const alcanceTexto = (alcance || nombreProyectoBpin || nombreIniciativa).trim() || 'Pendiente';
    const alcanceApi = this.buildAlcanceParaApi(alcanceTexto);
    const sesionCDInclusionVal =
      sesionCDInclusion != null && sesionCDInclusion >= 1 ? sesionCDInclusion : null;

    const idEstado = idEstadoProyecto ?? this.primerIdCatalogo(this.estadosProyectoCatalogo);
    const idCondicion = idCondicionProyecto ?? this.primerIdCatalogo(this.condicionesProyectoCatalogo);
    const idSectorVal = idSector ?? this.primerIdCatalogo(this.sectoresProyectoCatalogo);

    const latitudProyecto = this.formatCoordenadaParaApi(this.newProyecto.latitud);
    const longitudProyecto = this.formatCoordenadaParaApi(this.newProyecto.longitud);

    const imagenesUpload = this.buildImagenesUploadPayload();

    const buildCommand = (codigo: string): CreateProyectoCommand => ({
      idPactoTerritorial,
      idEntidadProyecto: idEntidadTerritorial,
      bpin: bpin.trim(),
      nombreProyectoBpin: (nombreProyectoBpin || nombreIniciativa).trim(),
      codigo,
      nombreIniciativa: nombreIniciativa.trim(),
      fechaActaCD: fechaActaCdIso || nowIso,
      actaCD: actaCd || '0',
      idAreaInfluencia: idAreaInfluencia != null && idAreaInfluencia >= 1 ? idAreaInfluencia : null,
      idEstadoProyecto: idEstado!,
      idCondicionProyecto: idCondicion!,
      idSector: idSectorVal!,
      lineasTematicas: lineaTrim,
      fechaInicio: nowIso,
      fechaFin: nowIso,
      plazoEstimadoEjecucion: nowIso,
      idAportanteNacion: idAportanteNacion != null && idAportanteNacion >= 1 ? idAportanteNacion : null,
      entidadResponsablePI: responsableProyecto.trim(),
      esInversionClimatica: !!this.newProyecto.inversionClimatica,
      esFRPT: !!frpt,
      alcance: alcanceApi,
      presupuestoDnp: 0,
      presupuestoSector: 0,
      presuspuestoTerritorio: 0,
      presupuestoOtros: 0,
      aporteIndicativoDNP: 0,
      aporteIndicativoNacion: 0,
      aporteIndicativoTerritorio: 0,
      aporteIndicativoOtros: 0,
      productoPrincipalMGA: metaProductoPrincipalTexto,
      cantidadMeta: 0,
      unidadMedidaMeta: unidadMedidaMetaTexto,
      sesionCDInclusion: sesionCDInclusionVal,
      idSectorAdministracionNacional: null,
      fechaReporte: nowIso,
      numeroEmpleosDirectos: Number(numeroEmpleosDirectos) || 0,
      numeroEmpleosIndirectos: Number(numeroEmpleosIndirectos) || 0,
      consecutivoConpes: consecutivoConpes.trim(),
      tieneViabilidad: !!tieneViabilidad,
      fechaViabilidad: tieneViabilidad && fechaViabilidad
        ? (this.fechaYmdToIso(fechaViabilidad.trim()) ?? nowIso)
        : nowIso,
      numeroContratoEspecifico: frpt
        ? this.normalizarNumeroContratoEspecifico(String(numeroContratoEspecifico ?? ''))
        : '',
      latitudProyecto,
      longitudProyecto,
      imagenes: []
    });

    const persistedApiFields = {
      idPactoTerritorial,
      idAreaInfluencia:
        idAreaInfluencia != null && idAreaInfluencia >= 1 ? idAreaInfluencia : undefined,
      idEstadoProyecto: idEstado!,
      idCondicionProyecto: idCondicion!,
      idSectorCatalogo: idSectorVal!,
      idAportanteNacion:
        idAportanteNacion != null && idAportanteNacion >= 1 ? idAportanteNacion : undefined,
      sesionCDInclusion: sesionCDInclusionVal ?? undefined,
      idEntidadProyecto: idEntidadTerritorial,
      unidadMedidaMeta: unidadMedidaMetaTexto,
      nombreProyectoBpin: nombreProyectoBpin.trim(),
      inversionClimatica: !!this.newProyecto.inversionClimatica,
      actaCdNumero: actaCd,
      actaCdFecha: actaFechaYmd
    };

    const metaProductoPrincipalGuardado = metaProductoPrincipalTexto;
    const nombresMultimedia = this.multimediaAdjuntos.map((a) => a.nombre).filter(Boolean);
    const urlsVideoMultimedia = this.multimediaVideoUrls.map((v) => v.url).filter(Boolean);
    const metadatosMultimedia = this.buildMultimediaMetadatosParaGuardado();
    const latitud = this.parseCoordenada(this.newProyecto.latitud);
    const longitud = this.parseCoordenada(this.newProyecto.longitud);

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'> = {
      nombreIniciativa: nombreIniciativa.trim(),
      descripcion: alcanceApi,
      pactoAsociado: pactoAsociado.trim(),
      bpin: bpin.trim(),
      actaCd: actaCd && actaFechaYmd ? `${actaCd} - ${actaFechaYmd}` : actaCd || actaFechaYmd || '',
      sector: sectorTexto || 'Sin sector',
      lineaTematica: lineaTrim,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes: Number(consecutivoConpes),
      tieneViabilidad,
      fechaViabilidad: fechaViabilidad ? new Date(fechaViabilidad) : undefined,
      frpt,
      numeroContratoEspecifico:
        frpt && numeroContratoEspecifico.trim()
          ? this.normalizarNumeroContratoEspecifico(numeroContratoEspecifico)
          : undefined,
      presupuesto: 0,
      responsable: responsableProyecto,
      estado: estadoTexto || 'Sin estado',
      fechaInicio: new Date(nowIso),
      fechaFin: new Date(nowIso),
      avance: 0,
      ...(metaProductoPrincipalGuardado
        ? { productoPrincipalMGA: metaProductoPrincipalGuardado }
        : {}),
      ...(unidadMedidaMetaTexto ? { unidadMedidaMeta: unidadMedidaMetaTexto } : {}),
      ...(latitud != null ? { latitud } : {}),
      ...(longitud != null ? { longitud } : {}),
      ...(imagenesUpload.length
        ? {
            imagenes: imagenesUpload.map((imagen) => ({
              idArchivo: imagen.idArchivo ?? null,
              descripcionImagen: imagen.descripcionImagen,
              fechaImagen: imagen.fechaImagen,
              archivoImagen: null
            }))
          }
        : {}),
      ...(nombresMultimedia.length ? { multimediaNombres: nombresMultimedia } : {}),
      ...(urlsVideoMultimedia.length ? { multimediaVideoUrls: urlsVideoMultimedia } : {}),
      ...(metadatosMultimedia.length ? { multimediaMetadatos: metadatosMultimedia } : {})
    };

    this.isSavingProyecto = true;

    if (!isEditMode) {
      this.editingProyectoApiId = null;
    }

    console.info('[SISPACTOS Proyecto guardar]', {
      modoFormulario: this.modoFormulario,
      metodoHttp: isEditMode ? 'PUT /api/Proyecto' : 'POST /api/Proyecto',
      editingProyectoApiId: this.editingProyectoApiId
    });

    const persistir$ = isEditMode
      ? this.persistirProyectoEdicionEnApi$(buildCommand, imagenesUpload, proyectoBase, persistedApiFields)
      : this.persistirProyectoCreacionEnApi$(buildCommand, imagenesUpload, proyectoBase, persistedApiFields);

    const flujo$ = PROYECTO_DEV_LOCAL_SAVE
      ? this.authService.hasValidUserSession()
        ? this.authService.prepareSessionBeforeSave().pipe(
            switchMap((sessionOk) => (sessionOk ? persistir$ : this.persistirProyectoSoloLocal$(
              proyectoBase,
              persistedApiFields,
              isEditMode,
              'Sin sesion valida: guardado solo en este navegador.'
            )))
          )
        : this.persistirProyectoSoloLocal$(
            proyectoBase,
            persistedApiFields,
            isEditMode,
            'Sin sesion: guardado solo en este navegador (modo desarrollo).'
          )
      : this.authService.prepareSessionBeforeSave().pipe(
          switchMap((sessionOk) => {
            if (!sessionOk || !this.authService.hasValidUserSession()) {
              this.authPromptService.requestLogin();
              this.presentSaveProyectoErrores([
                'Su sesion no es valida. Cierre sesion, inicie sesion nuevamente e intente guardar.'
              ]);
              return EMPTY;
            }
            return persistir$;
          })
        );

    flujo$.pipe(
      finalize(() => {
        this.isSavingProyecto = false;
      })
    ).subscribe();
  }

  /** Renueva token y persiste edicion en API + almacen local. */
  private persistirProyectoEdicionEnApi$(
    buildCommand: (codigo: string) => CreateProyectoCommand,
    imagenesUpload: ProyectoImagenUpload[],
    _proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'>,
    _persistedApiFields: Record<string, unknown>
  ): Observable<void> {
    const apiId = this.editingProyectoApiId;
    if (apiId == null || apiId < 1) {
      this.presentSaveProyectoErrores(['No se identifico el proyecto en la API para actualizar.']);
      return EMPTY;
    }

    const codigo = this.codigoDesdeIdProyecto(apiId);
    const updateCommand: UpdateProyectoCommand = { ...buildCommand(codigo), id: apiId };

    return this.proyectosService.updateProyectoInApi(updateCommand, imagenesUpload).pipe(
      switchMap((result) => {
        if (!result.success) {
          if (PROYECTO_DEV_LOCAL_SAVE) {
            return this.persistirProyectoSoloLocal$(
              _proyectoBase,
              _persistedApiFields,
              true,
              `API no disponible: ${result.message || 'actualizacion rechazada'}.`
            );
          }
          this.handleProyectoApiError(result, 'No fue posible actualizar el proyecto en la API.');
          return EMPTY;
        }
        return this.refreshProyectosTablaDesdeApi$();
      }),
      tap(() => {
        this.resetForm();
        this.tryCloseProyectoModal();
      }),
      map(() => undefined)
    );
  }

  /** Renueva token y persiste creacion en API + almacen local. */
  private persistirProyectoCreacionEnApi$(
    buildCommand: (codigo: string) => CreateProyectoCommand,
    imagenesUpload: ProyectoImagenUpload[],
    proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'>,
    persistedApiFields: Record<string, unknown>
  ): Observable<void> {
    return this.proyectosService.createProyecto(buildCommand(''), imagenesUpload).pipe(
      switchMap((result) => {
        if (!result.success) {
          if (PROYECTO_DEV_LOCAL_SAVE) {
            return this.persistirProyectoSoloLocal$(
              proyectoBase,
              persistedApiFields,
              false,
              `API no disponible: ${result.message || 'creacion rechazada'}. Proyecto guardado en este navegador.`
            );
          }
          this.handleProyectoApiError(result, 'No fue posible crear el proyecto en la API.');
          return EMPTY;
        }

        return this.refreshProyectosTablaDesdeApi$().pipe(
          tap(() => {
            this.resetForm();
            this.tryCloseProyectoModal();
          }),
          map(() => undefined)
        );
      }),
      map(() => undefined)
    );
  }

  /** Codigo visible = id del proyecto en la API (se asigna al guardar, no se captura en el formulario). */
  private codigoDesdeIdProyecto(apiId: number | null | undefined): string {
    return apiId != null && apiId >= 1 ? String(apiId) : '';
  }

  private persistirProyectoSoloLocal$(
    proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'>,
    persistedApiFields: Record<string, unknown>,
    isEditMode: boolean,
    aviso: string
  ): Observable<void> {
    this.presentSaveProyectoErrores([aviso, 'El guardado local esta deshabilitado. Use la API.']);
    return EMPTY;
  }

  private cargarProyectosDesdeApi(): void {
    this.isLoadingProyectosTabla = true;
    this.refreshProyectosTablaDesdeApi$()
      .pipe(finalize(() => (this.isLoadingProyectosTabla = false)))
      .subscribe();
  }

  /** GET `/api/Proyecto` y resuelve pacto, sector, estado y municipio como en el formulario. */
  private refreshProyectosTablaDesdeApi$(): Observable<Proyecto[]> {
    return this.proyectosService.refreshProyectosFromApi().pipe(
      map((list) => this.enrichProyectosParaTabla(list)),
      tap((list) => this.proyectosService.publishProyectosSnapshot(list))
    );
  }

  /** Etiquetas de tabla alineadas al formulario (ids + catálogos). */
  private enrichProyectosParaTabla(proyectos: Proyecto[]): Proyecto[] {
    return proyectos.map((p) => this.enrichProyectoParaTabla(p));
  }

  private enrichProyectoParaTabla(proyecto: Proyecto): Proyecto {
    const pactoAsociado =
      this.findPactoNombreById(proyecto.idPactoTerritorial) || this.etiquetaTextoApi(proyecto.pactoAsociado);
    const sector =
      this.textoCatalogoOption(this.sectoresProyectoCatalogo, proyecto.idSectorCatalogo ?? null)
      || this.etiquetaTextoApi(proyecto.sector);
    const estado =
      this.textoCatalogoOption(this.estadosProyectoCatalogo, proyecto.idEstadoProyecto ?? null)
      || this.etiquetaTextoApi(proyecto.estado);
    const municipioEntidadNombre = this.etiquetaMunicipioEntidad(proyecto);
    return {
      ...proyecto,
      pactoAsociado: pactoAsociado || undefined,
      sector: sector || undefined,
      estado: estado || proyecto.estado || '',
      municipioEntidadNombre: municipioEntidadNombre || undefined
    };
  }

  private reenriquecerProyectosEnMemoria(): void {
    const snap = this.proyectosService.getProyectosSnapshot();
    if (!snap.length) {
      return;
    }
    this.proyectosService.publishProyectosSnapshot(this.enrichProyectosParaTabla(snap));
  }

  private etiquetaTextoApi(value?: string | null): string {
    const t = (value || '').trim();
    if (!t || t === '—') {
      return '';
    }
    return t;
  }

  private etiquetaMunicipioEntidad(proyecto: Proyecto): string {
    const id = (proyecto.idEntidadProyecto || '').trim();
    if (id) {
      const hit = this.entidadesTerritorialesProyecto.find((e) => e.idEntidadTerritorial === id);
      if (hit) {
        return (hit.displayName || hit.nombreEntidadTerritorial).trim();
      }
    }
    return (
      this.etiquetaTextoApi(proyecto.municipioEntidadNombre)
      || this.etiquetaTextoApi(proyecto.responsable)
    );
  }

  pactoResumenTabla(proyecto: Proyecto): string {
    return this.textoResumenTabla(
      this.findPactoNombreById(proyecto.idPactoTerritorial) || proyecto.pactoAsociado
    );
  }

  sectorResumenTabla(proyecto: Proyecto): string {
    return this.textoResumenTabla(
      this.textoCatalogoOption(this.sectoresProyectoCatalogo, proyecto.idSectorCatalogo ?? null)
        || proyecto.sector
    );
  }

  estadoResumenTabla(proyecto: Proyecto): string {
    return this.textoResumenTabla(
      this.textoCatalogoOption(this.estadosProyectoCatalogo, proyecto.idEstadoProyecto ?? null)
        || proyecto.estado
    );
  }

  municipioResumenTabla(proyecto: Proyecto): string {
    return this.textoResumenTabla(this.etiquetaMunicipioEntidad(proyecto));
  }

  private aplicarDefaultsFormularioProyectoDev(): void {
    const p = this.newProyecto;
    if (!p.pactoAsociado.trim() && this.pactosCatalogo.length) {
      p.pactoAsociado = this.pactosCatalogo[0].nombre;
    }
    if (p.idEstadoProyecto == null) {
      p.idEstadoProyecto = this.primerIdCatalogo(this.estadosProyectoCatalogo);
    }
    if (p.idCondicionProyecto == null) {
      p.idCondicionProyecto = this.primerIdCatalogo(this.condicionesProyectoCatalogo);
    }
    if (p.idSector == null) {
      p.idSector = this.primerIdCatalogo(this.sectoresProyectoCatalogo);
    }
    if (!p.alcance.trim()) {
      p.alcance = (p.nombreProyectoBpin || p.nombreIniciativa || 'Pendiente').trim();
    }
    if (!p.nombreProyectoBpin.trim()) {
      p.nombreProyectoBpin = p.nombreIniciativa.trim() || 'Proyecto';
    }
  }

  private resolveIdPactoParaGuardado(pactoAsociado: string): number | null {
    const id = this.findPactoIdByNombre(pactoAsociado.trim());
    if (id) {
      return id;
    }
    if (PROYECTO_DEV_LOCAL_SAVE) {
      return this.pactosCatalogo[0]?.id ?? 1;
    }
    return null;
  }

  private primerIdCatalogo(opciones: CatalogoOption[]): number {
    const hit = opciones.find((o) => o.id != null && o.id >= 1);
    return hit?.id ?? 1;
  }

  private presentSaveProyectoAviso(mensajes: string[]): void {
    this.presentSaveProyectoErrores(mensajes);
  }

  resetForm(): void {
    this.clearMultimediaAdjuntos();
    this.limpiarValidacionFormulario();
    this.closeSaveProyectoErrorModal();
    this.newProyecto = this.getInitialFormData();
    this.isSavingProyecto = false;
    this.modoFormulario = 'crear';
    this.editingProyectoApiId = null;
    setTimeout(() => this.cleanupModalUiState(), 300);
  }

  abrirModalMultimediaImagen(): void {
    this.prepararModalMultimedia('imagen');
    this.showBootstrapModal('multimediaCargaModal');
  }

  abrirModalMultimediaVideo(): void {
    this.prepararModalMultimedia('video');
    this.showBootstrapModal('multimediaCargaModal');
  }

  cerrarModalMultimediaCarga(): void {
    this.limpiarModalMultimediaCarga();
    this.hideBootstrapModal('multimediaCargaModal');
  }

  private prepararModalMultimedia(tipo: MultimediaModalTipo): void {
    this.limpiarModalMultimediaCarga();
    this.multimediaModalTipo = tipo;
    this.multimediaModalFecha = this.isoToYmd(new Date().toISOString());
  }

  private limpiarModalMultimediaCarga(): void {
    this.revocarUrlsPreviewModalMultimedia();
    this.multimediaModalError = '';
    this.multimediaModalDetalle = '';
    this.multimediaModalUrlVideo = '';
    this.multimediaModalArchivosPendientes = [];
    this.multimediaModalPreviewUrls = [];
  }

  onMultimediaModalArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }
    this.revocarUrlsPreviewModalMultimedia();
    this.multimediaModalArchivosPendientes = Array.from(files);
    this.multimediaModalPreviewUrls = this.multimediaModalArchivosPendientes.map((f) =>
      URL.createObjectURL(f)
    );
    this.multimediaModalError = '';
    input.value = '';
  }

  async confirmarMultimediaModal(): Promise<void> {
    const fecha = this.multimediaModalFecha.trim();
    const detalle = this.multimediaModalDetalle.trim();
    if (!fecha) {
      this.multimediaModalError = 'Indique la fecha del registro multimedia.';
      return;
    }
    if (!detalle) {
      this.multimediaModalError = 'Indique el detalle del registro multimedia.';
      return;
    }

    if (this.multimediaModalTipo === 'video') {
      await this.confirmarMultimediaVideoModal(fecha, detalle);
      return;
    }
    await this.confirmarMultimediaImagenModal(fecha, detalle);
  }

  private async confirmarMultimediaVideoModal(fecha: string, detalle: string): Promise<void> {
    const url = this.multimediaModalUrlVideo.trim();
    if (!url) {
      this.multimediaModalError = 'Ingrese la URL del video.';
      return;
    }
    if (!this.esUrlVideoValida(url)) {
      this.multimediaModalError = 'URL de video no valida.';
      return;
    }
    if (this.multimediaVideoUrls.some((v) => v.url === url)) {
      this.multimediaModalError = 'Esa URL de video ya fue agregada.';
      return;
    }

    this.multimediaSeleccionError = '';
    this.multimediaVideoUrls = [
      ...this.multimediaVideoUrls,
      { ...this.buildVideoUrlEntry(url), fecha, detalle }
    ];
    this.cerrarModalMultimediaCarga();
  }

  private async confirmarMultimediaImagenModal(fecha: string, detalle: string): Promise<void> {
    if (!this.multimediaModalArchivosPendientes.length) {
      this.multimediaModalError = 'Seleccione al menos una imagen.';
      return;
    }

    this.isProcessingMultimedia = true;
    this.multimediaModalError = '';
    const errores: string[] = [];
    const avisos: string[] = [];
    const nuevos: MultimediaImagenAdjunta[] = [];

    try {
      for (const file of this.multimediaModalArchivosPendientes) {
        if (!file.type.startsWith('image/')) {
          errores.push(`"${file.name}": solo se permiten imagenes. Use el modal de video para URLs.`);
          continue;
        }

        if (file.type === 'image/gif') {
          if (file.size > this.tamanoMaxImagenMultimedia) {
            errores.push(`"${file.name}": GIF mayor a 300 KB (no se comprime automaticamente).`);
          } else {
            nuevos.push(this.crearAdjuntoImagen(file, file.name, false, fecha, detalle));
          }
          continue;
        }

        let fileFinal = file;
        let comprimida = false;
        const tamanoOriginal = file.size;

        if (file.size > this.tamanoMaxImagenMultimedia) {
          try {
            fileFinal = await this.comprimirImagenParaMultimedia(file);
            comprimida = true;
            avisos.push(
              `"${file.name}": comprimida de ${this.formatTamanoArchivo(tamanoOriginal)} a ${this.formatTamanoArchivo(fileFinal.size)}.`
            );
          } catch {
            errores.push(
              `"${file.name}": supera 300 KB y no fue posible comprimirla automaticamente. Use una imagen mas pequena o de menor resolucion.`
            );
            continue;
          }
        }

        nuevos.push(this.crearAdjuntoImagen(fileFinal, file.name, comprimida, fecha, detalle));
      }

      if (!nuevos.length && !errores.length) {
        this.multimediaModalError = 'No se pudo agregar ninguna imagen.';
        return;
      }

      const mensajes = [...errores, ...avisos].filter(Boolean);
      this.multimediaSeleccionError = mensajes.length ? mensajes.join(' ') : '';
      this.multimediaAdjuntos = [...this.multimediaAdjuntos, ...nuevos];
      this.cerrarModalMultimediaCarga();
    } finally {
      this.isProcessingMultimedia = false;
    }
  }

  private crearAdjuntoImagen(
    file: File,
    nombreVisible: string,
    comprimida: boolean,
    fecha: string,
    detalle: string
  ): MultimediaImagenAdjunta {
    return {
      id: this.nuevoIdMultimedia(),
      file,
      url: URL.createObjectURL(file),
      nombre: nombreVisible,
      comprimida,
      fecha,
      detalle
    };
  }

  private buildMultimediaMetadatosParaGuardado(): ProyectoMultimediaMetadato[] {
    const imagenes: ProyectoMultimediaMetadato[] = this.multimediaAdjuntos.map((a) => ({
      tipo: 'imagen',
      referencia: a.nombre,
      fecha: a.fecha,
      detalle: a.detalle
    }));
    const videos: ProyectoMultimediaMetadato[] = this.multimediaVideoUrls.map((v) => ({
      tipo: 'video',
      referencia: v.url,
      fecha: v.fecha,
      detalle: v.detalle
    }));
    return [...imagenes, ...videos];
  }

  private buildImagenesUploadPayload(): ProyectoImagenUpload[] {
    if (!this.multimediaAdjuntos.length) {
      return [];
    }

    const imagenes: ProyectoImagenUpload[] = [];

    for (const adjunto of this.multimediaAdjuntos) {
      const descripcionImagen = adjunto.detalle.trim() || adjunto.nombre.trim();
      const fechaImagen = this.fechaYmdToIso(adjunto.fecha) ?? adjunto.fecha.trim();
      const idArchivo = adjunto.idArchivo?.trim() || null;
      const file = adjunto.file.size > 0 ? adjunto.file : null;

      if (!descripcionImagen && !fechaImagen && !idArchivo && !file) {
        continue;
      }

      imagenes.push({
        ...(idArchivo ? { idArchivo } : {}),
        descripcionImagen,
        fechaImagen,
        file,
        archivoImagenApi: adjunto.archivoImagenApi?.trim() || null
      });
    }

    return imagenes;
  }

  private formatCoordenadaParaApi(value: number | string | null | undefined): string {
    const parsed = this.parseCoordenada(value);
    return parsed == null ? '' : String(parsed);
  }

  private parseCoordenada(value: number | string | null | undefined): number | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private revocarUrlsPreviewModalMultimedia(): void {
    for (const url of this.multimediaModalPreviewUrls) {
      URL.revokeObjectURL(url);
    }
  }

  private formatTamanoArchivo(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  private async comprimirImagenParaMultimedia(file: File): Promise<File> {
    const imagen = await this.cargarImagenDesdeArchivo(file);
    try {
      let ancho = imagen.naturalWidth;
      let alto = imagen.naturalHeight;
      const escalaInicial = Math.min(1, this.multimediaMaxLadoImagenPx / Math.max(ancho, alto));
      ancho = Math.max(1, Math.round(ancho * escalaInicial));
      alto = Math.max(1, Math.round(alto * escalaInicial));

      const calidades = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.28];
      for (let intento = 0; intento < 8; intento++) {
        for (const calidad of calidades) {
          const blob = await this.renderizarImagenComprimida(imagen, ancho, alto, calidad);
          if (blob.size <= this.tamanoMaxImagenMultimedia) {
            return new File([blob], this.nombreArchivoJpeg(file.name), { type: 'image/jpeg' });
          }
        }
        if (ancho <= 320 || alto <= 320) {
          break;
        }
        ancho = Math.max(320, Math.round(ancho * 0.85));
        alto = Math.max(320, Math.round(alto * 0.85));
      }

      throw new Error('No se logro comprimir bajo el limite');
    } finally {
      URL.revokeObjectURL(imagen.src);
    }
  }

  private cargarImagenDesdeArchivo(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen'));
      };
      img.src = url;
    });
  }

  private renderizarImagenComprimida(
    imagen: HTMLImageElement,
    ancho: number,
    alto: number,
    calidad: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('Canvas no disponible'));
    }
    ctx.drawImage(imagen, 0, 0, ancho, alto);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error('No se pudo generar la imagen comprimida'));
        },
        'image/jpeg',
        calidad
      );
    });
  }

  private nombreArchivoJpeg(nombreOriginal: string): string {
    const base = nombreOriginal.replace(/\.[^.]+$/, '').trim() || 'imagen';
    return `${base}.jpg`;
  }

  abrirVistaImagenMultimedia(adjunto: MultimediaImagenAdjunta): void {
    this.multimediaImagenPreview = {
      src: adjunto.url,
      alt: adjunto.nombre,
      nombre: adjunto.nombre,
      comprimida: adjunto.comprimida,
      tamano: this.formatTamanoArchivo(adjunto.file.size),
      fecha: adjunto.fecha,
      detalle: adjunto.detalle
    };
  }

  cerrarVistaImagenMultimedia(): void {
    this.multimediaImagenPreview = null;
  }

  removeMultimediaAdjunto(index: number): void {
    const adj = this.multimediaAdjuntos[index];
    if (adj) {
      if (this.multimediaImagenPreview?.src === adj.url) {
        this.cerrarVistaImagenMultimedia();
      }
      if (adj.url.startsWith('blob:')) {
        URL.revokeObjectURL(adj.url);
      }
    }
    this.multimediaAdjuntos = this.multimediaAdjuntos.filter((_, i) => i !== index);
  }

  removeMultimediaVideoUrl(index: number): void {
    this.multimediaVideoUrls = this.multimediaVideoUrls.filter((_, i) => i !== index);
  }

  onVideoThumbError(video: MultimediaVideoUrl): void {
    video.thumbnailUrl = null;
  }

  private buildVideoUrlEntry(
    url: string,
    fecha = '',
    detalle = ''
  ): MultimediaVideoUrl {
    const meta = this.parseVideoUrlMetadata(url);
    return {
      id: this.nuevoIdMultimedia(),
      url,
      thumbnailUrl: meta.thumbnailUrl,
      etiqueta: meta.etiqueta,
      valida: true,
      fecha,
      detalle
    };
  }

  private parseVideoUrlMetadata(url: string): { thumbnailUrl: string | null; etiqueta: string } {
    const youtubeId = this.extractYoutubeId(url);
    if (youtubeId) {
      return {
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
        etiqueta: 'YouTube'
      };
    }

    const vimeoId = this.extractVimeoId(url);
    if (vimeoId) {
      return {
        thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
        etiqueta: 'Vimeo'
      };
    }

    if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) {
      return { thumbnailUrl: null, etiqueta: 'Video directo' };
    }

    return { thumbnailUrl: null, etiqueta: 'Enlace de video' };
  }

  private extractYoutubeId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'youtu.be') {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        return id || null;
      }
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const fromQuery = parsed.searchParams.get('v');
        if (fromQuery) {
          return fromQuery;
        }
        const embed = parsed.pathname.match(/\/embed\/([^/?#]+)/i);
        if (embed?.[1]) {
          return embed[1];
        }
        const shorts = parsed.pathname.match(/\/shorts\/([^/?#]+)/i);
        if (shorts?.[1]) {
          return shorts[1];
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  private extractVimeoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      if (host !== 'vimeo.com' && host !== 'player.vimeo.com') {
        return null;
      }
      const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  private esUrlVideoValida(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private clearMultimediaAdjuntos(): void {
    this.cerrarVistaImagenMultimedia();
    this.cerrarModalMultimediaCarga();
    this.multimediaSeleccionError = '';
    for (const a of this.multimediaAdjuntos) {
      if (a.url.startsWith('blob:')) {
        URL.revokeObjectURL(a.url);
      }
    }
    this.multimediaAdjuntos = [];
    this.multimediaVideoUrls = [];
  }

  private cargarMultimediaDesdeProyecto(proyecto: Proyecto): void {
    this.clearMultimediaAdjuntos();
    const imagenesApi = (proyecto.imagenes ?? []).filter(
      (imagen) => !!imagen?.archivoImagen || !!imagen?.idArchivo || !!imagen?.descripcionImagen?.trim()
    );
    if (imagenesApi.length) {
      this.multimediaAdjuntos = imagenesApi.map((imagen, index) =>
        this.mapImagenApiToAdjunto(imagen, index)
      );
    }

    const metadatos = proyecto.multimediaMetadatos ?? [];
    const metaPorReferencia = new Map(
      metadatos.map((m) => [m.referencia, m] as const)
    );

    const urls = (proyecto.multimediaVideoUrls ?? []).filter(Boolean);
    this.multimediaVideoUrls = urls.map((url) => {
      const meta = metaPorReferencia.get(url);
      return this.buildVideoUrlEntry(url, meta?.fecha ?? '', meta?.detalle ?? '');
    });

    const nombres = (proyecto.multimediaNombres ?? []).filter(Boolean);
    for (const nombre of nombres) {
      if (this.multimediaAdjuntos.some((adj) => adj.nombre === nombre)) {
        continue;
      }
      const meta = metaPorReferencia.get(nombre);
      this.multimediaAdjuntos.push({
        id: this.nuevoIdMultimedia(),
        file: new File([], nombre, { type: 'image/jpeg' }),
        url: '',
        nombre,
        fecha: meta?.fecha ?? '',
        detalle: meta?.detalle ?? ''
      });
    }
  }

  private cargarMultimediaDesdeDetalleApi(detalle: ProyectoDetalleApi, fallback: Proyecto): void {
    const imagenesApi = Array.isArray(detalle.imagenes)
      ? detalle.imagenes.filter(
          (imagen) => !!imagen?.archivoImagen || !!imagen?.idArchivo || !!imagen?.descripcionImagen?.trim()
        )
      : [];

    if (!imagenesApi.length) {
      this.cargarMultimediaDesdeProyecto(fallback);
      return;
    }

    this.clearMultimediaAdjuntos();
    this.multimediaAdjuntos = imagenesApi.map((imagen, index) => this.mapImagenApiToAdjunto(imagen, index));
  }

  private mapImagenApiToAdjunto(
    imagen: ProyectoImagenApiCommand | ProyectoImagenRegistrada,
    index: number
  ): MultimediaImagenAdjunta {
    const nombre = this.buildNombreImagenApi(imagen, index);
    const archivoRaw = imagen.archivoImagen?.trim() ?? '';
    return {
      id: this.nuevoIdMultimedia(),
      idArchivo: imagen.idArchivo?.trim() || null,
      archivoImagenApi: archivoRaw || null,
      file: new File([], nombre, { type: this.detectMimeTypeFromArchivoImagen(imagen.archivoImagen) }),
      url: this.resolveArchivoImagenPreviewUrl(imagen.archivoImagen),
      nombre,
      fecha: this.isoToYmd(imagen.fechaImagen) || imagen.fechaImagen || '',
      detalle: (imagen.descripcionImagen || '').trim()
    };
  }

  private buildNombreImagenApi(
    imagen: ProyectoImagenApiCommand | ProyectoImagenRegistrada,
    index: number
  ): string {
    const descripcion = (imagen.descripcionImagen || '').trim();
    if (!descripcion) {
      return `Imagen ${index + 1}`;
    }
    return descripcion.length <= 48 ? descripcion : `${descripcion.slice(0, 48).trim()}...`;
  }

  private resolveArchivoImagenPreviewUrl(archivoImagen: string | null | undefined): string {
    const raw = (archivoImagen || '').trim();
    if (!raw) {
      return '';
    }
    if (/^data:image\//i.test(raw) || /^https?:\/\//i.test(raw)) {
      return raw;
    }
    const compact = raw.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 64) {
      return `data:image/jpeg;base64,${compact}`;
    }
    return '';
  }

  private detectMimeTypeFromArchivoImagen(archivoImagen: string | null | undefined): string {
    const raw = (archivoImagen || '').trim();
    const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
    return match?.[1] ?? 'image/jpeg';
  }

  private nuevoIdMultimedia(): string {
    return `mm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  onTieneViabilidadChange(): void {
    if (!this.newProyecto.tieneViabilidad) {
      this.newProyecto.fechaViabilidad = '';
      delete this.fieldErrors['fechaViabilidad'];
      delete this.fieldTouched['fechaViabilidad'];
    } else {
      this.onCampoValidacionChange('fechaViabilidad');
    }
  }

  onFrptChange(): void {
    if (!this.newProyecto.frpt) {
      this.newProyecto.numeroContratoEspecifico = '';
      delete this.fieldErrors['numeroContratoEspecifico'];
      delete this.fieldTouched['numeroContratoEspecifico'];
    } else {
      this.onCampoValidacionChange('numeroContratoEspecifico');
    }
  }

  private getInitialFormData(): ProyectoFormData {
    return {
      pactoAsociado: '',
      bpin: '',
      nombreProyectoBpin: '',
      nombreIniciativa: '',
      entidadResponsableId: '',
      actaCdNumero: '',
      actaCdFecha: '',
      idAreaInfluencia: null,
      idEstadoProyecto: null,
      idCondicionProyecto: null,
      idSector: null,
      lineaTematica: '',
      numeroEmpleosDirectos: 0,
      numeroEmpleosIndirectos: 0,
      consecutivoConpes: '',
      tieneViabilidad: false,
      fechaViabilidad: '',
      frpt: false,
      numeroContratoEspecifico: '',
      idAportanteNacion: null,
      municipioEntidad: '',
      inversionClimatica: false,
      alcance: '',
      metaProductoPrincipal: '',
      productoMgaDescripcion: '',
      unidadMedidaMeta: '',
      sesionCDInclusion: null,
      latitud: null,
      longitud: null
    };
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  formatDate(date: Date): string {
    return this.dashboardService.formatDate(date);
  }

  formatCoordenadaResumen(value: number | null | undefined): string {
    const parsed = this.parseCoordenada(value);
    return parsed == null ? '—' : parsed.toFixed(5);
  }

  /** Código visible en tabla (API o id del registro). */
  codigoProyectoResumen(proyecto: Proyecto): string {
    const codigo = (proyecto.codigo || '').trim();
    if (codigo && codigo !== '0') {
      return codigo;
    }
    const id = proyecto.apiId ?? proyecto.id;
    return id != null && id >= 1 ? String(id) : '—';
  }

  textoResumenTabla(value: string | null | undefined): string {
    const t = (value || '').trim();
    return t || '—';
  }

  metaProductoPrincipalResumen(proyecto: Proyecto): string {
    return this.textoResumenTabla(proyecto.productoPrincipalMGA);
  }

  getProyectoImagenesCount(proyecto: Proyecto): number {
    return proyecto.imagenes?.length ?? proyecto.multimediaNombres?.length ?? 0;
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
    const value = input.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 13);
    this.newProyecto.bpin = value;
    if (input.value !== value) {
      input.value = value;
    }
    this.onCampoValidacionChange('bpin');
  }

  onConpesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 5);
    this.newProyecto.consecutivoConpes = value;
    this.onCampoValidacionChange('consecutivoConpes');
  }

  onSesionCdInclusionPeiChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.newProyecto.sesionCDInclusion = null;
      delete this.fieldErrors['sesionCd'];
      return;
    }
    const n = Number(value);
    this.newProyecto.sesionCDInclusion =
      Number.isFinite(n) && Number.isInteger(n) && n >= 1 ? n : null;
    this.onCampoValidacionChange('sesionCd');
  }

  onNumeroContratoEspecificoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatNumeroContratoEspecificoInput(input.value);
    this.newProyecto.numeroContratoEspecifico = value;
    if (input.value !== value) {
      input.value = value;
    }
    this.onCampoValidacionChange('numeroContratoEspecifico');
  }

  private formatNumeroContratoEspecificoInput(raw: string): string {
    const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix: string[] = [];
    const suffix: string[] = [];
    let i = 0;

    while (i < alnum.length && prefix.length < 3) {
      prefix.push(alnum[i]);
      i++;
    }
    while (i < alnum.length && suffix.length < 7) {
      const ch = alnum[i];
      if (/\d/.test(ch)) {
        suffix.push(ch);
      }
      i++;
    }

    const pref = prefix.join('');
    const suf = suffix.join('');
    if (!pref) {
      return '';
    }
    if (pref.length < 3) {
      return pref;
    }
    if (!suf) {
      return `${pref}-`;
    }
    return `${pref}-${suf}`;
  }

  private esNumeroContratoEspecificoCompleto(value: string): boolean {
    return /^[A-Z0-9]{3}-\d{7}$/.test(this.normalizarNumeroContratoEspecifico(value));
  }

  private normalizarNumeroContratoEspecifico(value: string): string {
    return value.trim().toUpperCase().replace(/\s+/g, '');
  }

  private numeroContratoEspecificoDesdeAlmacenado(value: string | number | null | undefined): string {
    if (value == null || value === '') {
      return '';
    }
    const texto = String(value).trim();
    if (!texto) {
      return '';
    }
    if (this.esNumeroContratoEspecificoCompleto(texto)) {
      return this.normalizarNumeroContratoEspecifico(texto);
    }
    return this.formatNumeroContratoEspecificoInput(texto);
  }

  private coerceOptionalPositiveInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return null;
    }
    return n;
  }

  private applyPactosCatalogo(pactos: Pacto[]): void {
    this.pactosCatalogo = pactos;
    this.pactosDisponibles = pactos.map((pacto) => pacto.nombre).filter(Boolean);

    if (!this.pactosDisponibles.length) {
      this.pactosService.getPactosOptionsFromApi().subscribe((rows) => {
        this.pactosOptionsFallback = rows;
        this.pactosDisponibles = rows.map((p) => p.nombre).filter(Boolean);
        this.onPactoAsociadoChange();
      });
      return;
    }

    this.pactosOptionsFallback = [];
    this.onPactoAsociadoChange();
  }

  private sortCatalogOptions(items: CatalogoOption[]): CatalogoOption[] {
    return [...items].sort((a, b) =>
      (a.texto || a.codigo).localeCompare(b.texto || b.codigo, 'es-CO', { sensitivity: 'base' })
    );
  }

  private textoCatalogoOption(items: CatalogoOption[], id: number | null): string {
    if (id == null || id < 1) return '';
    return items.find((o) => o.id === id)?.texto || '';
  }

  private diasCalendarioDesdeInicioHastaPlazo(fechaInicioIso: string, plazoYmd: string): number {
    const inicio = this.inicioDiaLocalDesdeIso(fechaInicioIso);
    const fin = this.inicioDiaLocalDesdeYmd(plazoYmd);
    if (!inicio || !fin) return -1;
    return Math.round((fin.getTime() - inicio.getTime()) / 86400000);
  }

  /** Alcance del proyecto (sesion CD y MGA van en campos dedicados de la API). */
  private buildAlcanceParaApi(alcanceBase: string): string {
    return (alcanceBase || '').trim();
  }

  private resolveCantidadMeta(cantidad: number | null | undefined): number | null {
    if (cantidad === null || cantidad === undefined || Number.isNaN(Number(cantidad))) {
      return null;
    }
    const n = Number(cantidad);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
  }

  private fechaFinIsoDesdePlazoYmd(plazoYmd: string): string | null {
    const d = this.inicioDiaLocalDesdeYmd(plazoYmd);
    if (!d) return null;
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  /** Convierte `YYYY-MM-DD` a ISO UTC (inicio del dia local). */
  private fechaYmdToIso(ymd: string): string | null {
    const d = this.inicioDiaLocalDesdeYmd(ymd);
    if (!d) return null;
    return d.toISOString();
  }

  private inicioDiaLocalDesdeIso(iso: string): Date | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private inicioDiaLocalDesdeYmd(ymd: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const [y, m, dd] = ymd.split('-').map(Number);
    if (!y || !m || !dd) return null;
    return new Date(y, m - 1, dd);
  }

  private normalizeNombrePacto(value: string | undefined): string {
    const base = (value || '').trim().toLowerCase();
    try {
      return base.normalize('NFD').replace(/[\u0300-\u036f]+/g, '');
    } catch {
      return base;
    }
  }

  private findPactoIdByNombre(nombre: string): number | null {
    const key = this.normalizeNombrePacto(nombre);
    const hit = this.pactosCatalogo.find((p) => this.normalizeNombrePacto(p.nombre) === key);
    if (hit?.id) return hit.id;

    const fallback = this.pactosOptionsFallback.find((p) => this.normalizeNombrePacto(p.nombre) === key);
    return fallback?.id ?? null;
  }

  /** Carga catálogos del formulario (una sola vez o bajo demanda al editar). */
  private loadCatalogosProyecto$(): Observable<void> {
    if (this.catalogosProyectoListos) {
      return of(undefined);
    }
    return forkJoin({
      areas: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      estados: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_ESTADO_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      condiciones: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_CONDICION_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      sectores: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_SECTOR_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      aportantes: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_APORTANTE_NACION_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[])))
    }).pipe(
      tap(({ areas, estados, condiciones, sectores, aportantes }) => {
        this.areasInfluenciaCatalogo = this.sortCatalogOptions(areas);
        this.estadosProyectoCatalogo = this.sortCatalogOptions(estados);
        this.condicionesProyectoCatalogo = this.sortCatalogOptions(condiciones);
        this.sectoresProyectoCatalogo = this.sortCatalogOptions(sectores);
        this.aportantesNacionCatalogo = this.sortCatalogOptions(aportantes);
        this.catalogosProyectoListos = true;
      }),
      map(() => undefined)
    );
  }

  /** Alinea id de catálogo con opciones del select (number estricto para ngValue). */
  private coerceSelectCatalogId(
    value: number | string | null | undefined,
    catalogo: CatalogoOption[]
  ): number | null {
    if (value == null || value === '') {
      return null;
    }
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(n) || n < 1) {
      return null;
    }
    if (catalogo.some((o) => o.id === n)) {
      return n;
    }
    const asString = String(n);
    const hit = catalogo.find((o) => String(o.id) === asString);
    return hit?.id ?? n;
  }

  private resolveEntidadResponsableId(nombreFallback?: string | null): string {
    const nombre = (nombreFallback || '').trim().toLowerCase();
    if (!nombre) {
      return '';
    }
    const hit = this.entidadesResponsablesOpciones.find(
      (e) => e.nombre.trim().toLowerCase() === nombre
    );
    return hit?.id ?? '';
  }

  private resolveMunicipioEntidadId(
    idEntidad?: string | null,
    nombreFallback?: string | null
  ): string {
    const id = (idEntidad || '').trim();
    if (id) {
      const byId = this.entidadesTerritorialesProyecto.find((e) => e.idEntidadTerritorial === id);
      if (byId) {
        return byId.idEntidadTerritorial;
      }
    }
    const nombre = (nombreFallback || '').trim().toLowerCase();
    if (!nombre) {
      return id;
    }
    const byNombre = this.entidadesTerritorialesProyecto.find((e) => {
      const label = (e.displayName || e.nombreEntidadTerritorial || '').trim().toLowerCase();
      return label === nombre || e.nombreEntidadTerritorial.trim().toLowerCase() === nombre;
    });
    return byNombre?.idEntidadTerritorial ?? id;
  }

  private findPactoNombreById(idPacto: number | null | undefined): string {
    if (idPacto == null || idPacto < 1) return '';
    const hit = this.pactosCatalogo.find((p) => p.id === idPacto);
    if (hit?.nombre) return hit.nombre;
    return this.pactosOptionsFallback.find((p) => p.id === idPacto)?.nombre ?? '';
  }

  private cargarFormularioDesdeProyectoLocal(proyecto: Proyecto): void {
    const desdeAlcance = parseCamposDesdeAlcanceApi(proyecto.descripcion);
    let actaNumero = proyecto.actaCdNumero ?? '';
    let actaFecha = proyecto.actaCdFecha ?? '';
    if ((!actaNumero || !actaFecha) && proyecto.actaCd) {
      const partes = proyecto.actaCd.split(' - ');
      actaNumero = actaNumero || (partes[0] ?? '').trim();
      actaFecha = actaFecha || (partes[1] ?? '').trim();
    }

    this.newProyecto = {
      ...this.getInitialFormData(),
      pactoAsociado: proyecto.pactoAsociado ?? '',
      bpin: proyecto.bpin ?? '',
      nombreProyectoBpin: proyecto.nombreProyectoBpin ?? '',
      nombreIniciativa: proyecto.nombreIniciativa ?? '',
      actaCdNumero: actaNumero,
      actaCdFecha: actaFecha,
      idAreaInfluencia: this.coerceSelectCatalogId(
        proyecto.idAreaInfluencia,
        this.areasInfluenciaCatalogo
      ),
      idEstadoProyecto: this.coerceSelectCatalogId(
        proyecto.idEstadoProyecto,
        this.estadosProyectoCatalogo
      ),
      idCondicionProyecto: this.coerceSelectCatalogId(
        proyecto.idCondicionProyecto,
        this.condicionesProyectoCatalogo
      ),
      idSector: this.coerceSelectCatalogId(proyecto.idSectorCatalogo, this.sectoresProyectoCatalogo),
      lineaTematica: proyecto.lineaTematica ?? '',
      numeroEmpleosDirectos: proyecto.numeroEmpleosDirectos ?? 0,
      numeroEmpleosIndirectos: proyecto.numeroEmpleosIndirectos ?? 0,
      consecutivoConpes: proyecto.consecutivoConpes != null ? String(proyecto.consecutivoConpes) : '',
      tieneViabilidad: !!proyecto.tieneViabilidad,
      fechaViabilidad: proyecto.fechaViabilidad ? this.isoToYmd(proyecto.fechaViabilidad.toISOString()) : '',
      frpt: !!proyecto.frpt,
      numeroContratoEspecifico: this.numeroContratoEspecificoDesdeAlmacenado(proyecto.numeroContratoEspecifico),
      idAportanteNacion: this.coerceSelectCatalogId(
        proyecto.idAportanteNacion,
        this.aportantesNacionCatalogo
      ),
      entidadResponsableId: this.resolveEntidadResponsableId(proyecto.responsable),
      municipioEntidad: this.resolveMunicipioEntidadId(proyecto.idEntidadProyecto, null),
      inversionClimatica: !!proyecto.inversionClimatica,
      alcance: desdeAlcance.alcanceLimpio || proyecto.descripcion || '',
      metaProductoPrincipal:
        proyecto.productoPrincipalMGA?.trim()
        || desdeAlcance.productoPrincipalMga
        || (proyecto.cantidadMeta != null ? String(proyecto.cantidadMeta) : '')
        || '',
      productoMgaDescripcion: proyecto.productoMgaDescripcion?.trim() || '',
      unidadMedidaMeta:
        proyecto.unidadMedidaMeta?.trim()
        || (proyecto as Proyecto & { metaPaTexto?: string }).metaPaTexto?.trim()
        || desdeAlcance.unidadMedidaMeta
        || '',
      sesionCDInclusion: this.coerceOptionalPositiveInt(
        proyecto.sesionCDInclusion
        ?? (proyecto as Proyecto & { idMecanismoInclusion?: number }).idMecanismoInclusion
        ?? desdeAlcance.sesionCdPei
      ),
      latitud: proyecto.latitud ?? null,
      longitud: proyecto.longitud ?? null
    };
    this.cargarMultimediaDesdeProyecto(proyecto);
    this.onPactoAsociadoChange(true);
  }

  private cargarFormularioDesdeDetalle(detalle: ProyectoDetalleApi, fallback: Proyecto): void {
    const desdeAlcance = parseCamposDesdeAlcanceApi(detalle.alcance ?? fallback.descripcion);
    const detalleLegacy = detalle as ProyectoDetalleApi & {
      productoMGA?: string;
      metaPa?: string;
    };
    this.newProyecto = {
      ...this.getInitialFormData(),
      pactoAsociado:
        this.findPactoNombreById(detalle.idPactoTerritorial) || fallback.pactoAsociado || '',
      bpin: detalle.bpin ?? fallback.bpin ?? '',
      nombreProyectoBpin:
        (detalle.nombreProyectoBpin ?? (detalle as ProyectoDetalleApi & { nombreBpin?: string }).nombreBpin ?? '')
          .trim()
        || (fallback.nombreProyectoBpin ?? '').trim()
        || (fallback.nombreIniciativa ?? '').trim(),
      nombreIniciativa:
        (detalle.nombreIniciativa ?? (detalle as ProyectoDetalleApi & { nombre?: string }).nombre ?? '')
          .trim()
        || (fallback.nombreIniciativa ?? '').trim(),
      actaCdNumero: detalle.actaCD ?? fallback.actaCdNumero ?? '',
      actaCdFecha: this.isoToYmd(detalle.fechaActaCD) || fallback.actaCdFecha || '',
      idAreaInfluencia: this.coerceSelectCatalogId(
        detalle.idAreaInfluencia ?? fallback.idAreaInfluencia,
        this.areasInfluenciaCatalogo
      ),
      idEstadoProyecto: this.coerceSelectCatalogId(
        detalle.idEstadoProyecto ?? fallback.idEstadoProyecto,
        this.estadosProyectoCatalogo
      ),
      idCondicionProyecto: this.coerceSelectCatalogId(
        detalle.idCondicionProyecto ?? fallback.idCondicionProyecto,
        this.condicionesProyectoCatalogo
      ),
      idSector: this.coerceSelectCatalogId(
        detalle.idSector ?? fallback.idSectorCatalogo,
        this.sectoresProyectoCatalogo
      ),
      lineaTematica: detalle.lineasTematicas ?? fallback.lineaTematica ?? '',
      numeroEmpleosDirectos: detalle.numeroEmpleosDirectos ?? fallback.numeroEmpleosDirectos ?? 0,
      numeroEmpleosIndirectos: detalle.numeroEmpleosIndirectos ?? fallback.numeroEmpleosIndirectos ?? 0,
      consecutivoConpes: detalle.consecutivoConpes ?? String(fallback.consecutivoConpes ?? ''),
      tieneViabilidad: detalle.tieneViabilidad ?? !!fallback.tieneViabilidad,
      fechaViabilidad:
        this.isoToYmd(detalle.fechaViabilidad) ||
        (fallback.fechaViabilidad ? this.isoToYmd(fallback.fechaViabilidad.toISOString()) : ''),
      frpt: detalle.esFRPT ?? !!fallback.frpt,
      numeroContratoEspecifico: this.numeroContratoEspecificoDesdeAlmacenado(
        detalle.numeroContratoEspecifico ?? fallback.numeroContratoEspecifico
      ),
      idAportanteNacion: this.coerceSelectCatalogId(
        detalle.idAportanteNacion ?? fallback.idAportanteNacion,
        this.aportantesNacionCatalogo
      ),
      entidadResponsableId: this.resolveEntidadResponsableId(
        detalle.entidadResponsablePI ?? fallback.responsable
      ),
      municipioEntidad: this.resolveMunicipioEntidadId(
        detalle.idEntidadProyecto ?? fallback.idEntidadProyecto,
        null
      ),
      inversionClimatica: detalle.esInversionClimatica ?? !!fallback.inversionClimatica,
      alcance: desdeAlcance.alcanceLimpio || detalle.alcance || fallback.descripcion || '',
      metaProductoPrincipal:
        (detalle.productoPrincipalMGA ?? '').trim()
        || detalleLegacy.productoMGA?.trim()
        || (fallback.productoPrincipalMGA ?? '').trim()
        || desdeAlcance.productoPrincipalMga
        || (fallback.cantidadMeta != null ? String(fallback.cantidadMeta) : '')
        || '',
      productoMgaDescripcion:
        detalleLegacy.productoMGA?.trim()
        || fallback.productoMgaDescripcion?.trim()
        || '',
      unidadMedidaMeta:
        detalle.unidadMedidaMeta?.trim()
        || detalleLegacy.metaPa?.trim()
        || fallback.unidadMedidaMeta?.trim()
        || (fallback as Proyecto & { metaPaTexto?: string }).metaPaTexto?.trim()
        || desdeAlcance.unidadMedidaMeta
        || '',
      sesionCDInclusion: this.coerceOptionalPositiveInt(
        detalle.sesionCDInclusion
        ?? (detalle as ProyectoDetalleApi & { idMecanismoInclusion?: number }).idMecanismoInclusion
        ?? fallback.sesionCDInclusion
        ?? (fallback as Proyecto & { idMecanismoInclusion?: number }).idMecanismoInclusion
        ?? desdeAlcance.sesionCdPei
      ),
      latitud: this.parseCoordenada(detalle.latitudProyecto) ?? fallback.latitud ?? null,
      longitud: this.parseCoordenada(detalle.longitudProyecto) ?? fallback.longitud ?? null
    };
    this.cargarMultimediaDesdeDetalleApi(detalle, fallback);
    this.onPactoAsociadoChange(true);
  }

  private isoToYmd(iso?: string | null): string {
    if (!iso?.trim()) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private openProyectoModal(): void {
    this.showBootstrapModal('nuevoProyectoModal');
  }

  private tryCloseProyectoModal(): void {
    this.hideBootstrapModal('nuevoProyectoModal');
    this.cleanupModalUiState();
  }

  private handleProyectoApiError(result: ProyectoApiResult, fallback: string): void {
    if (result.httpStatus === 401 || result.httpStatus === 403) {
      this.authService.logout();
      this.authPromptService.requestLogin();
    }
    this.presentSaveProyectoErrores([result.message || fallback]);
  }

  private presentSaveProyectoErrores(errores: string[]): void {
    this.saveProyectoErrores = errores.filter((e) => !!e?.trim());
    if (!this.saveProyectoErrores.length) {
      return;
    }
    setTimeout(() => {
      document
        .querySelector('#nuevoProyectoModal .proyecto-save-errors')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  /** Quita backdrops huérfanos que bloquean la pantalla tras modales anidados. */
  private cleanupModalUiState(): void {
    const openModals = document.querySelectorAll('.modal.show').length;
    const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));

    if (openModals === 0) {
      backdrops.forEach((el) => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      return;
    }

    if (backdrops.length > openModals) {
      backdrops.slice(openModals).forEach((el) => el.remove());
    }
  }

  private showBootstrapModal(elementId: string): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    const bootstrapModal = (
      window as Window & {
        bootstrap?: {
          Modal?: {
            getInstance?(element: Element): { show(): void };
            getOrCreateInstance?(element: Element): { show(): void };
          };
        };
      }
    ).bootstrap?.Modal;

    try {
      const instance =
        bootstrapModal?.getInstance?.(el)
        || bootstrapModal?.getOrCreateInstance?.(el)
        || (bootstrapModal ? new (bootstrapModal as unknown as new (e: Element) => { show(): void })(el) : null);
      instance?.show?.();
    } catch {
      el.classList.add('show');
      el.style.display = 'block';
      el.removeAttribute('aria-hidden');
      el.setAttribute('aria-modal', 'true');
      document.body.classList.add('modal-open');
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }
    }
  }

  private hideBootstrapModal(elementId: string): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    const bootstrap = (window as { bootstrap?: { Modal?: { getInstance?: (el: Element) => { hide?: () => void } } } })
      .bootstrap;
    try {
      bootstrap?.Modal?.getInstance?.(el)?.hide?.();
    } catch {
      // noop
    }
    setTimeout(() => this.cleanupModalUiState(), 300);
  }
}
