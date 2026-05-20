import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CreateProyectoCommand,
  ProyectoApiResult,
  ProyectoDetalleApi,
  ProyectosService,
  UpdateProyectoCommand
} from '../../core/services/proyectos.service';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Pacto, Proyecto } from '../../shared/models';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, take, tap } from 'rxjs/operators';
import { PROYECTO_DEV_LOCAL_SAVE } from '../../core/config/proyecto-save.config';
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

type ModoFormularioProyecto = 'crear' | 'editar';

interface ProyectoFormData {
  pactoAsociado: string;
  bpin: string;
  nombreBpin: string;
  nombre: string;
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
  /** Meta de producto principal (texto asociado al producto MGA del paso 1). */
  metaProductoPrincipal: string;
  metaPa: string;
  productoPrincipalMga: string;
  cantidadMetaPa: number | null;
  idMecanismoInclusion: number | null;
}

type MultimediaImagenAdjunta = {
  id: string;
  file: File;
  url: string;
  nombre: string;
  comprimida?: boolean;
};

type MultimediaVideoUrl = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  etiqueta: string;
  valida: boolean;
};

type MultimediaImagenPreview = {
  src: string;
  alt: string;
  nombre: string;
  comprimida?: boolean;
  tamano: string;
};

/** Campos del formulario con validacion en tiempo real. */
type ProyectoCampoValidacion =
  | 'pacto'
  | 'bpin'
  | 'nombreBpin'
  | 'nombre'
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
  | 'cantidadMetaPa';

@Component({
  selector: 'app-proyectos-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './proyectos-management.component.html',
  styleUrl: './proyectos-management.component.css'
})
export class ProyectosManagementComponent implements OnInit {
  proyectos$: Observable<Proyecto[]>;
  modoFormulario: ModoFormularioProyecto = 'crear';
  editingProyectoLocalId: number | null = null;
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
  multimediaVideoUrlDraft = '';
  readonly tamanoMaxImagenMultimedia = 300 * 1024;
  readonly multimediaMaxLadoImagenPx = 1920;
  multimediaSeleccionError = '';
  isProcessingMultimedia = false;
  multimediaImagenPreview: MultimediaImagenPreview | null = null;

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService,
    private readonly authService: AuthService,
    private readonly authPromptService: AuthPromptService
  ) {
    this.proyectos$ = this.proyectosService.getProyectos();
  }

  abrirModalNuevoProyecto(): void {
    this.modoFormulario = 'crear';
    this.editingProyectoLocalId = null;
    this.resetForm();
    this.openProyectoModal();
  }

  abrirModalEditarProyecto(proyecto: Proyecto): void {
    this.modoFormulario = 'editar';
    this.editingProyectoLocalId = proyecto.id;
    this.closeSaveProyectoErrorModal();
    this.clearMultimediaAdjuntos();

    const apiId = proyecto.apiId;
    const detalle$ =
      apiId != null && apiId > 0
        ? this.proyectosService.getProyectoById(apiId)
        : of(null as ProyectoDetalleApi | null);

    this.isLoadingProyectoDetalle = true;
    forkJoin({
      catalogos: this.loadCatalogosProyecto$(),
      detalle: detalle$
    })
      .pipe(finalize(() => (this.isLoadingProyectoDetalle = false)))
      .subscribe(({ detalle }) => {
        if (detalle) {
          this.cargarFormularioDesdeDetalle(detalle, proyecto);
        } else {
          this.cargarFormularioDesdeProyectoLocal(proyecto);
        }
        setTimeout(() => this.openProyectoModal(), 0);
      });
  }

  ngOnInit(): void {
    this.loadCatalogosProyecto$().subscribe();

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
    });

    this.pactosService.getEntidadTerritorialCatalogo().subscribe((rows) => {
      this.entidadesTerritorialesProyecto = [...rows].sort((a, b) =>
        (a.displayName || a.nombreEntidadTerritorial).localeCompare(
          b.displayName || b.nombreEntidadTerritorial,
          'es-CO',
          { sensitivity: 'base' }
        )
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
      'nombreBpin',
      'nombre',
      'consecutivoConpes',
      'actaCdFecha',
      'estado',
      'condicion',
      'sector',
      'lineaTematica',
      'alcance',
      'sesionCd',
      'cantidadMetaPa'
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
    return ['nombre'];
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
      case 'nombreBpin':
        return p.nombreBpin.trim() ? null : 'Campo obligatorio.';
      case 'nombre':
        return p.nombre.trim() ? null : 'Campo obligatorio.';
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
        if (p.idMecanismoInclusion == null) {
          return null;
        }
        if (!Number.isInteger(p.idMecanismoInclusion) || p.idMecanismoInclusion < 1) {
          return 'Debe ser un numero entero positivo.';
        }
        return null;
      case 'alcance':
        return p.alcance.trim() ? null : 'Campo obligatorio.';
      case 'cantidadMetaPa': {
        const cantidad = p.cantidadMetaPa;
        if (cantidad === null || cantidad === undefined || Number.isNaN(Number(cantidad))) {
          return null;
        }
        if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad < 0) {
          return 'Debe ser un numero entero mayor o igual a 0.';
        }
        return null;
      }
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

  guardarProyecto(): void {
    if (this.isSavingProyecto || this.isLoadingProyectoDetalle) return;
    this.closeSaveProyectoErrorModal();
    // Multimedia es opcional: no se valida ni se exige al guardar.
    this.multimediaSeleccionError = '';

    const isEditMode = this.modoFormulario === 'editar';
    if (isEditMode && this.editingProyectoLocalId == null) {
      this.presentSaveProyectoErrores(['No fue posible identificar el proyecto a editar.']);
      return;
    }

    const {
      nombre,
      pactoAsociado,
      bpin,
      nombreBpin,
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
      idEstadoProyecto,
      idAreaInfluencia,
      idCondicionProyecto,
      idMecanismoInclusion,
      alcance,
      metaProductoPrincipal,
      metaPa,
      cantidadMetaPa
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
      entidadTerr?.nombreEntidadTerritorial || entidadTerr?.displayName || idEntidadTerritorial;
    const responsableProyecto = nombreEntidadMunicipio;

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
    const metaPaTexto = (metaPa || '').trim();
    const productoMgaTexto = (this.newProyecto.productoPrincipalMga || '').trim();
    const alcanceTexto = (alcance || nombreBpin || nombre).trim() || 'Pendiente';
    const alcanceApi = this.buildAlcanceParaApi(
      alcanceTexto,
      '',
      '',
      idMecanismoInclusion
    );

    const idEstado = idEstadoProyecto ?? this.primerIdCatalogo(this.estadosProyectoCatalogo);
    const idCondicion = idCondicionProyecto ?? this.primerIdCatalogo(this.condicionesProyectoCatalogo);
    const idSectorVal = idSector ?? this.primerIdCatalogo(this.sectoresProyectoCatalogo);

    const buildCommand = (codigo: string): CreateProyectoCommand => ({
      idPactoTerritorial,
      idEntidadProyecto: idEntidadTerritorial,
      bpin: bpin.trim(),
      nombreBpin: (nombreBpin || nombre).trim(),
      codigo,
      nombre: nombre.trim(),
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
      entidadResponsablePI: nombreEntidadMunicipio.trim(),
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
      productoMGA: productoMgaTexto,
      metaPa: metaPaTexto,
      idMecanismoInclusion: null,
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
        : ''
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
      idMecanismoInclusion:
        idMecanismoInclusion != null && idMecanismoInclusion >= 1 ? idMecanismoInclusion : undefined,
      idEntidadProyecto: idEntidadTerritorial,
      metaPaTexto: metaPaTexto,
      metaProductoPrincipal: metaProductoPrincipalTexto,
      nombreBpin: nombreBpin.trim(),
      inversionClimatica: !!this.newProyecto.inversionClimatica,
      actaCdNumero: actaCd,
      actaCdFecha: actaFechaYmd
    };

    const productoMga = (this.newProyecto.productoPrincipalMga || '').trim();
    const cantidadMeta = this.resolveCantidadMetaPa(cantidadMetaPa);
    const nombresMultimedia = this.multimediaAdjuntos.map((a) => a.nombre).filter(Boolean);
    const urlsVideoMultimedia = this.multimediaVideoUrls.map((v) => v.url).filter(Boolean);

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'> = {
      nombre: nombre.trim(),
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
      ...(productoMga ? { productoPrincipalMga: productoMga } : {}),
      ...(cantidadMeta != null ? { cantidadMetaPa: cantidadMeta } : {}),
      ...(nombresMultimedia.length ? { multimediaNombres: nombresMultimedia } : {}),
      ...(urlsVideoMultimedia.length ? { multimediaVideoUrls: urlsVideoMultimedia } : {})
    };

    this.isSavingProyecto = true;

    const persistir$ = isEditMode
      ? this.persistirProyectoEdicionEnApi$(buildCommand, proyectoBase, persistedApiFields)
      : this.persistirProyectoCreacionEnApi$(buildCommand, proyectoBase, persistedApiFields);

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
    proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'>,
    persistedApiFields: Record<string, unknown>
  ): Observable<void> {
    const local = this.proyectosService
      .getProyectosSnapshot()
      .find((p) => p.id === this.editingProyectoLocalId);
    const apiId = local?.apiId;
    if (apiId == null || apiId < 1) {
      if (PROYECTO_DEV_LOCAL_SAVE) {
        return this.persistirProyectoSoloLocal$(
          proyectoBase,
          persistedApiFields,
          true,
          'Proyecto sin id en la API: guardado solo en este navegador.'
        );
      }
      this.presentSaveProyectoErrores([
        'Este proyecto no tiene id en la API. Solo se pueden editar proyectos guardados en el servidor.'
      ]);
      return EMPTY;
    }

    const codigo = this.codigoDesdeIdProyecto(apiId);
    const updateCommand: UpdateProyectoCommand = { ...buildCommand(codigo), id: apiId };

    return this.proyectosService.updateProyectoInApi(updateCommand).pipe(
      switchMap((result) => {
        if (!result.success) {
          if (PROYECTO_DEV_LOCAL_SAVE) {
            return this.persistirProyectoSoloLocal$(
              proyectoBase,
              persistedApiFields,
              true,
              `API no disponible: ${result.message || 'actualizacion rechazada'}. Cambios guardados en este navegador.`
            );
          }
          this.handleProyectoApiError(result, 'No fue posible actualizar el proyecto en la API.');
          return EMPTY;
        }
        this.proyectosService.updateProyecto(this.editingProyectoLocalId!, {
          ...proyectoBase,
          ...persistedApiFields,
          codigo,
          apiId
        } as Proyecto);
        this.resetForm();
        this.tryCloseProyectoModal();
        return of(undefined);
      }),
      map(() => undefined)
    );
  }

  /** Renueva token y persiste creacion en API + almacen local. */
  private persistirProyectoCreacionEnApi$(
    buildCommand: (codigo: string) => CreateProyectoCommand,
    proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion' | 'codigo'>,
    persistedApiFields: Record<string, unknown>
  ): Observable<void> {
    return this.proyectosService.createProyecto(buildCommand('')).pipe(
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

        const apiId = result.id;
        const codigo = this.codigoDesdeIdProyecto(apiId);
        if (result.nombre) {
          proyectoBase.nombre = result.nombre;
        }

        const guardarLocal = () => {
          this.proyectosService.addProyecto({
            ...proyectoBase,
            ...persistedApiFields,
            codigo,
            apiId
          } as Proyecto);
          this.resetForm();
          this.tryCloseProyectoModal();
        };

        if (apiId != null && apiId >= 1 && codigo) {
          return this.proyectosService.updateProyectoInApi({ ...buildCommand(codigo), id: apiId }).pipe(
            switchMap((sync) => {
              if (!sync.success) {
                this.handleProyectoApiError(
                  sync,
                  'Proyecto creado en la API, pero no fue posible asignar el codigo interno.'
                );
                return EMPTY;
              }
              guardarLocal();
              return of(undefined);
            })
          );
        }

        guardarLocal();
        return of(undefined);
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
    if (isEditMode && this.editingProyectoLocalId != null) {
      const local = this.proyectosService.getProyectosSnapshot().find((p) => p.id === this.editingProyectoLocalId);
      const codigo = local?.codigo || `local-${this.editingProyectoLocalId}`;
      this.proyectosService.updateProyecto(this.editingProyectoLocalId, {
        ...proyectoBase,
        ...persistedApiFields,
        codigo,
        apiId: local?.apiId
      } as Proyecto);
    } else {
      const codigo = `local-${Date.now()}`;
      this.proyectosService.addProyecto({
        ...proyectoBase,
        ...persistedApiFields,
        codigo
      } as Proyecto);
    }

    this.presentSaveProyectoAviso([aviso]);
    this.resetForm();
    this.tryCloseProyectoModal();
    return of(undefined);
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
      p.alcance = (p.nombreBpin || p.nombre || 'Pendiente').trim();
    }
    if (!p.nombreBpin.trim()) {
      p.nombreBpin = p.nombre.trim() || 'Proyecto';
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
    this.editingProyectoLocalId = null;
    setTimeout(() => this.cleanupModalUiState(), 300);
  }

  async onMultimediaChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }

    this.isProcessingMultimedia = true;
    const errores: string[] = [];
    const avisos: string[] = [];
    const nuevos: MultimediaImagenAdjunta[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        if (!file.type.startsWith('image/')) {
          errores.push(`"${file.name}": solo se permiten imagenes. Use URL para videos.`);
          continue;
        }

        if (file.type === 'image/gif') {
          if (file.size > this.tamanoMaxImagenMultimedia) {
            errores.push(`"${file.name}": GIF mayor a 300 KB (no se comprime automaticamente).`);
          } else {
            nuevos.push(this.crearAdjuntoImagen(file, file.name, false));
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

        nuevos.push(this.crearAdjuntoImagen(fileFinal, file.name, comprimida));
      }

      const mensajes = [...errores, ...avisos].filter(Boolean);
      this.multimediaSeleccionError = mensajes.length ? mensajes.join(' ') : '';
      this.multimediaAdjuntos = [...this.multimediaAdjuntos, ...nuevos];
    } finally {
      this.isProcessingMultimedia = false;
      input.value = '';
    }
  }

  private crearAdjuntoImagen(file: File, nombreVisible: string, comprimida: boolean): MultimediaImagenAdjunta {
    return {
      id: this.nuevoIdMultimedia(),
      file,
      url: URL.createObjectURL(file),
      nombre: nombreVisible,
      comprimida
    };
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
      tamano: this.formatTamanoArchivo(adjunto.file.size)
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
      URL.revokeObjectURL(adj.url);
    }
    this.multimediaAdjuntos = this.multimediaAdjuntos.filter((_, i) => i !== index);
  }

  agregarMultimediaVideoUrl(): void {
    const url = this.multimediaVideoUrlDraft.trim();
    if (!url) {
      this.multimediaSeleccionError = 'Ingrese la URL del video.';
      return;
    }
    if (!this.esUrlVideoValida(url)) {
      this.multimediaSeleccionError = 'URL de video no valida.';
      return;
    }
    if (this.multimediaVideoUrls.some((v) => v.url === url)) {
      this.multimediaSeleccionError = 'Esa URL de video ya fue agregada.';
      return;
    }
    this.multimediaSeleccionError = '';
    this.multimediaVideoUrls = [...this.multimediaVideoUrls, this.buildVideoUrlEntry(url)];
    this.multimediaVideoUrlDraft = '';
  }

  removeMultimediaVideoUrl(index: number): void {
    this.multimediaVideoUrls = this.multimediaVideoUrls.filter((_, i) => i !== index);
  }

  onVideoThumbError(video: MultimediaVideoUrl): void {
    video.thumbnailUrl = null;
  }

  private buildVideoUrlEntry(url: string): MultimediaVideoUrl {
    const meta = this.parseVideoUrlMetadata(url);
    return {
      id: this.nuevoIdMultimedia(),
      url,
      thumbnailUrl: meta.thumbnailUrl,
      etiqueta: meta.etiqueta,
      valida: true
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
    this.multimediaSeleccionError = '';
    this.multimediaVideoUrlDraft = '';
    for (const a of this.multimediaAdjuntos) {
      URL.revokeObjectURL(a.url);
    }
    this.multimediaAdjuntos = [];
    this.multimediaVideoUrls = [];
  }

  private cargarMultimediaDesdeProyecto(proyecto: Proyecto): void {
    this.clearMultimediaAdjuntos();
    const urls = (proyecto.multimediaVideoUrls ?? []).filter(Boolean);
    this.multimediaVideoUrls = urls.map((url) => this.buildVideoUrlEntry(url));
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
      nombreBpin: '',
      nombre: '',
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
      metaPa: '',
      productoPrincipalMga: '',
      cantidadMetaPa: null,
      idMecanismoInclusion: null
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
      this.newProyecto.idMecanismoInclusion = null;
      delete this.fieldErrors['sesionCd'];
      return;
    }
    const n = Number(value);
    this.newProyecto.idMecanismoInclusion =
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

  /** Une alcance + MGA + meta PA + sesion CD en un solo campo que la BD si tiene. */
  private buildAlcanceParaApi(
    alcanceBase: string,
    productoMga: string,
    metaPaApi: string,
    sesionCdPei: number | null
  ): string {
    const partes: string[] = [];
    const base = (alcanceBase || '').trim();
    if (base) {
      partes.push(base);
    }
    const prod = (productoMga || '').trim();
    if (prod) {
      partes.push(`Producto principal MGA: ${prod}`);
    }
    const meta = (metaPaApi || '').trim();
    if (meta) {
      partes.push(meta);
    }
    if (sesionCdPei != null && sesionCdPei >= 1) {
      partes.push(`Sesion CD inclusion PEI: ${sesionCdPei}`);
    }
    return partes.join(' | ');
  }

  private parseCamposDesdeAlcanceApi(raw?: string | null): {
    metaProductoPrincipal: string;
    metaPa: string;
    cantidad: number | null;
    sesionCdPei: number | null;
    alcanceLimpio: string;
  } {
    const texto = (raw || '').trim();
    const meta = this.parseMetaPaApi(texto);
    let sesionCdPei: number | null = null;
    const sesionMatch = texto.match(/Sesion CD inclusion PEI:\s*(\d+)/i);
    if (sesionMatch?.[1]) {
      const n = Number(sesionMatch[1]);
      sesionCdPei = Number.isInteger(n) && n >= 1 ? n : null;
    }

    let metaProductoPrincipal = meta.metaProductoPrincipal;
    const prodMatch = texto.match(/Producto principal MGA:\s*([^|]+)/i);
    if (prodMatch?.[1]) {
      metaProductoPrincipal = prodMatch[1].trim();
    }

    let alcanceLimpio = texto;
    for (const patron of [
      /Producto principal MGA:\s*[^|]+/gi,
      /Meta producto principal:\s*[^|]+/gi,
      /Meta PA:\s*[^|]+/gi,
      /Cantidad:\s*\d+/gi,
      /Sesion CD inclusion PEI:\s*\d+/gi
    ]) {
      alcanceLimpio = alcanceLimpio.replace(patron, '');
    }
    alcanceLimpio = alcanceLimpio.replace(/\|\s*\|/g, '|').replace(/^\|\s*|\s*\|$/g, '').trim();

    return {
      metaProductoPrincipal,
      metaPa: meta.metaPa,
      cantidad: meta.cantidad,
      sesionCdPei,
      alcanceLimpio
    };
  }

  private buildMetaPaApi(
    metaProductoPrincipal: string,
    metaPa: string,
    cantidad: number | null | undefined
  ): string {
    const partes: string[] = [];
    const metaProd = (metaProductoPrincipal || '').trim();
    const metaPaTexto = (metaPa || '').trim();
    const cantidadMeta = this.resolveCantidadMetaPa(cantidad);

    if (metaProd) {
      partes.push(`Meta producto principal: ${metaProd}`);
    }
    if (metaPaTexto) {
      partes.push(`Meta PA: ${metaPaTexto}`);
    }
    if (cantidadMeta != null) {
      partes.push(`Cantidad: ${cantidadMeta}`);
    }
    return partes.join(' | ');
  }

  private parseMetaPaApi(raw?: string): {
    metaProductoPrincipal: string;
    metaPa: string;
    cantidad: number | null;
  } {
    const texto = (raw || '').trim();
    if (!texto) {
      return { metaProductoPrincipal: '', metaPa: '', cantidad: null };
    }

    const partes = texto.split('|').map((p) => p.trim()).filter(Boolean);
    let metaProductoPrincipal = '';
    let metaPa = '';
    let cantidad: number | null = null;
    const otros: string[] = [];

    for (const parte of partes) {
      const metaProdMatch = parte.match(/^Meta producto principal:\s*(.+)$/i);
      if (metaProdMatch) {
        metaProductoPrincipal = metaProdMatch[1].trim();
        continue;
      }
      const metaPaMatch = parte.match(/^Meta PA:\s*(.+)$/i);
      if (metaPaMatch) {
        metaPa = metaPaMatch[1].trim();
        continue;
      }
      const cantidadMatch = parte.match(/^Cantidad:\s*(\d+)$/i);
      if (cantidadMatch) {
        cantidad = Number(cantidadMatch[1]);
        continue;
      }
      otros.push(parte);
    }

    if (!metaPa && otros.length) {
      metaPa = otros.join(' | ');
    } else if (!metaPa && !metaProductoPrincipal && texto && cantidad == null) {
      metaPa = texto;
    }

    return { metaProductoPrincipal, metaPa, cantidad };
  }

  private resolveCantidadMetaPa(cantidad: number | null | undefined): number | null {
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
    const desdeAlcance = this.parseCamposDesdeAlcanceApi(proyecto.descripcion);
    const meta = this.parseMetaPaApi(proyecto.metaPaTexto ?? '');
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
      nombreBpin: proyecto.nombreBpin ?? '',
      nombre: proyecto.nombre ?? '',
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
      municipioEntidad: this.resolveMunicipioEntidadId(
        proyecto.idEntidadProyecto,
        proyecto.responsable
      ),
      inversionClimatica: !!proyecto.inversionClimatica,
      alcance: desdeAlcance.alcanceLimpio || proyecto.descripcion || '',
      metaProductoPrincipal:
        meta.metaProductoPrincipal || desdeAlcance.metaProductoPrincipal || proyecto.metaProductoPrincipal || '',
      metaPa: meta.metaPa || desdeAlcance.metaPa,
      productoPrincipalMga:
        (proyecto.productoPrincipalMga ?? desdeAlcance.metaProductoPrincipal) || '',
      cantidadMetaPa: meta.cantidad ?? desdeAlcance.cantidad ?? proyecto.cantidadMetaPa ?? null,
      idMecanismoInclusion: this.coerceOptionalPositiveInt(
        proyecto.idMecanismoInclusion ?? desdeAlcance.sesionCdPei
      )
    };
    this.cargarMultimediaDesdeProyecto(proyecto);
    this.onPactoAsociadoChange(true);
  }

  private cargarFormularioDesdeDetalle(detalle: ProyectoDetalleApi, fallback: Proyecto): void {
    const desdeAlcance = this.parseCamposDesdeAlcanceApi(detalle.alcance ?? fallback.descripcion);
    const meta = this.parseMetaPaApi(detalle.metaPa ?? fallback.metaPaTexto ?? detalle.alcance);
    this.newProyecto = {
      ...this.getInitialFormData(),
      pactoAsociado:
        this.findPactoNombreById(detalle.idPactoTerritorial) || fallback.pactoAsociado || '',
      bpin: detalle.bpin ?? fallback.bpin ?? '',
      nombreBpin: detalle.nombreBpin ?? fallback.nombre ?? '',
      nombre: detalle.nombre ?? fallback.nombre ?? '',
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
      municipioEntidad: this.resolveMunicipioEntidadId(
        detalle.idEntidadProyecto ?? fallback.idEntidadProyecto,
        detalle.entidadResponsablePI ?? fallback.responsable
      ),
      inversionClimatica: detalle.esInversionClimatica ?? !!fallback.inversionClimatica,
      alcance: desdeAlcance.alcanceLimpio || detalle.alcance || fallback.descripcion || '',
      metaProductoPrincipal:
        meta.metaProductoPrincipal ||
        desdeAlcance.metaProductoPrincipal ||
        fallback.metaProductoPrincipal ||
        '',
      metaPa:
        (detalle.metaPa?.trim() || fallback.metaPaTexto?.trim() || meta.metaPa || desdeAlcance.metaPa || ''),
      productoPrincipalMga:
        (detalle.productoMGA?.trim()
          || fallback.productoPrincipalMga?.trim()
          || desdeAlcance.metaProductoPrincipal
          || '')
        || '',
      cantidadMetaPa: meta.cantidad ?? desdeAlcance.cantidad ?? fallback.cantidadMetaPa ?? null,
      idMecanismoInclusion: this.coerceOptionalPositiveInt(
        detalle.idMecanismoInclusion ?? fallback.idMecanismoInclusion ?? desdeAlcance.sesionCdPei
      )
    };
    this.cargarMultimediaDesdeProyecto(fallback);
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
