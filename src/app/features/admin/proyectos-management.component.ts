import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateProyectoCommand,
  ProyectoDetalleApi,
  ProyectosService,
  UpdateProyectoCommand
} from '../../core/services/proyectos.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Pacto, Proyecto } from '../../shared/models';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, take, tap } from 'rxjs/operators';
import {
  CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO,
  CATALOGO_TIPO_APORTANTE_NACION_PROYECTO,
  CATALOGO_TIPO_CONDICION_PROYECTO,
  CATALOGO_TIPO_ESTADO_PROYECTO,
  CATALOGO_TIPO_MECANISMO_INCLUSION_PROYECTO,
  CATALOGO_TIPO_SECTOR_ADMIN_NACIONAL_PROYECTO,
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
  codigo: string;
  nombre: string;
  actaCdNumero: string;
  actaCdFecha: string;
  idAreaInfluencia: number | null;
  idEstadoProyecto: number | null;
  idCondicionProyecto: number | null;
  idSector: number | null;
  lineaTematica: string;
  plazoEstimadoEjecucion: string;
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
  metaPa: string;
  productoPrincipalMga: string;
  cantidadMetaPa: number | null;
  idMecanismoInclusion: number | null;
  idSectorAdministracionNacional: number | null;
}

type MultimediaAdjunto = {
  id: string;
  file: File;
  url: string;
  tipo: 'imagen' | 'video';
  nombre: string;
};

@Component({
  selector: 'app-proyectos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  mecanismosInclusionCatalogo: CatalogoOption[] = [];
  sectoresAdminNacionCatalogo: CatalogoOption[] = [];
  entidadesTerritorialesProyecto: EntidadTerritorialOption[] = [];
  private catalogosProyectoListos = false;

  readonly catalogoByTipoRoute = catalogoByTipoRoute;
  readonly catalogoTipoAreaInfluencia = CATALOGO_TIPO_AREA_INFLUENCIA_PROYECTO;
  readonly catalogoTipoEstadoProyecto = CATALOGO_TIPO_ESTADO_PROYECTO;
  readonly catalogoTipoCondicionProyecto = CATALOGO_TIPO_CONDICION_PROYECTO;
  readonly catalogoTipoSectorProyecto = CATALOGO_TIPO_SECTOR_PROYECTO;
  readonly catalogoTipoAportanteNacion = CATALOGO_TIPO_APORTANTE_NACION_PROYECTO;
  readonly catalogoTipoMecanismoInclusion = CATALOGO_TIPO_MECANISMO_INCLUSION_PROYECTO;
  readonly catalogoTipoSectorAdminNacional = CATALOGO_TIPO_SECTOR_ADMIN_NACIONAL_PROYECTO;

  newProyecto: ProyectoFormData = this.getInitialFormData();
  isSavingProyecto = false;
  /** Mensajes de validacion o error al guardar (se muestran en el modal). */
  saveProyectoErrores: string[] = [];

  multimediaAdjuntos: MultimediaAdjunto[] = [];
  readonly tamanoMaxImagenMultimedia = 300 * 1024;
  readonly tamanoMaxVideoMultimedia = 5 * 1024 * 1024;
  multimediaSeleccionError = '';

  constructor(
    private proyectosService: ProyectosService,
    private dashboardService: DashboardService,
    private pactosService: PactosService
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
      return;
    }
    if (this.newProyecto.lineaTematica && !opciones.includes(this.newProyecto.lineaTematica)) {
      this.newProyecto.lineaTematica = '';
    }
  }

  closeSaveProyectoErrorModal(): void {
    this.saveProyectoErrores = [];
  }

  guardarProyecto(): void {
    if (this.isSavingProyecto || this.isLoadingProyectoDetalle) return;
    this.closeSaveProyectoErrorModal();

    const isEditMode = this.modoFormulario === 'editar';
    if (isEditMode && this.editingProyectoLocalId == null) {
      this.presentSaveProyectoErrores(['No fue posible identificar el proyecto a editar.']);
      return;
    }

    const {
      nombre,
      pactoAsociado,
      codigo,
      bpin,
      nombreBpin,
      actaCdNumero,
      actaCdFecha,
      idSector,
      lineaTematica,
      plazoEstimadoEjecucion,
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
      idSectorAdministracionNacional,
      alcance,
      metaPa,
      cantidadMetaPa
    } = this.newProyecto;

    const lineasDisp = this.lineasTematicasDisponibles;
    const lineaTrim = (lineaTematica || '').trim();
    const plazoYmd = (plazoEstimadoEjecucion || '').trim();
    const nowIso = new Date().toISOString();
    const plazoDias = /^\d{4}-\d{2}-\d{2}$/.test(plazoYmd)
      ? this.diasCalendarioDesdeInicioHastaPlazo(nowIso, plazoYmd)
      : -1;

    const errores = this.collectProyectoFormValidationErrors({
      pactoAsociado,
      bpin,
      nombreBpin,
      codigo,
      nombre,
      consecutivoConpes,
      actaCdNumero,
      actaCdFecha,
      idAreaInfluencia,
      idEstadoProyecto,
      idCondicionProyecto,
      idSector,
      lineaTrim,
      lineasDispLength: lineasDisp.length,
      plazoYmd,
      plazoDias,
      tieneViabilidad,
      fechaViabilidad,
      frpt,
      numeroContratoEspecifico,
      idAportanteNacion,
      municipioEntidad,
      alcance,
      metaPa,
      cantidadMetaPa,
      idMecanismoInclusion,
      idSectorAdministracionNacional
    });

    if (errores.length) {
      this.presentSaveProyectoErrores(errores);
      return;
    }

    const actaCd = actaCdNumero.trim();
    const fechaActaCdIso = this.fechaYmdToIso(actaCdFecha.trim());
    if (!fechaActaCdIso) {
      this.presentSaveProyectoErrores(['Acta CD Fecha: fecha no valida.']);
      return;
    }
    const estadoTexto = this.textoCatalogoOption(this.estadosProyectoCatalogo, idEstadoProyecto);
    const sectorTexto = this.textoCatalogoOption(this.sectoresProyectoCatalogo, idSector);
    const idEntidadTerritorial = municipioEntidad.trim();
    const entidadTerr = this.entidadesTerritorialesProyecto.find((e) => e.idEntidadTerritorial === idEntidadTerritorial);
    const nombreEntidadMunicipio =
      entidadTerr?.nombreEntidadTerritorial || entidadTerr?.displayName || idEntidadTerritorial;
    const responsableProyecto = nombreEntidadMunicipio;

    const idPactoTerritorial = this.findPactoIdByNombre(pactoAsociado.trim());
    if (!idPactoTerritorial) {
      this.presentSaveProyectoErrores(['Pacto: no fue posible identificar el pacto seleccionado en el sistema.']);
      return;
    }

    const fechaFinIso = this.fechaFinIsoDesdePlazoYmd(plazoYmd) ?? nowIso;
    const plazoEstimadoIso = this.fechaYmdToIso(plazoYmd) ?? fechaFinIso;
    const metaPaTexto = (metaPa || '').trim();
    const metaPaApi = `${metaPaTexto} | Cantidad: ${Number(cantidadMetaPa)}`;

    const commandBase: CreateProyectoCommand = {
      idPactoTerritorial,
      idEntidadProyecto: idEntidadTerritorial,
      bpin: bpin.trim(),
      nombreBpin: nombreBpin.trim(),
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      fechaActaCD: fechaActaCdIso,
      actaCD: actaCd,
      idAreaInfluencia: idAreaInfluencia!,
      idEstadoProyecto: idEstadoProyecto!,
      idCondicionProyecto: idCondicionProyecto!,
      idSector: idSector!,
      lineasTematicas: lineaTrim,
      fechaInicio: nowIso,
      fechaFin: fechaFinIso,
      plazoEstimadoEjecucion: plazoEstimadoIso,
      idAportanteNacion: idAportanteNacion!,
      entidadResponsablePI: nombreEntidadMunicipio.trim(),
      esInversionClimatica: !!this.newProyecto.inversionClimatica,
      esFRPT: !!frpt,
      alcance: (alcance || nombreBpin).trim(),
      presupuestoDnp: 0,
      presupuestoSector: 0,
      presuspuestoTerritorio: 0,
      presupuestoOtros: 0,
      aporteIndicativoDNP: 0,
      aporteIndicativoNacion: 0,
      aporteIndicativoTerritorio: 0,
      aporteIndicativoOtros: 0,
      productoMGA: (this.newProyecto.productoPrincipalMga || '').trim(),
      metaPa: metaPaApi,
      idMecanismoInclusion: idMecanismoInclusion!,
      idSectorAdministracionNacional: idSectorAdministracionNacional!,
      fechaReporte: nowIso,
      numeroEmpleosDirectos: Number(numeroEmpleosDirectos) || 0,
      numeroEmpleosIndirectos: Number(numeroEmpleosIndirectos) || 0,
      consecutivoConpes: consecutivoConpes.trim(),
      tieneViabilidad: !!tieneViabilidad,
      fechaViabilidad: tieneViabilidad && fechaViabilidad
        ? (this.fechaYmdToIso(fechaViabilidad.trim()) ?? nowIso)
        : nowIso,
      numeroContratoEspecifico: frpt ? String(numeroContratoEspecifico ?? '').trim() : ''
    };

    const persistedApiFields = {
      idPactoTerritorial,
      idAreaInfluencia: idAreaInfluencia!,
      idEstadoProyecto: idEstadoProyecto!,
      idCondicionProyecto: idCondicionProyecto!,
      idSectorCatalogo: idSector!,
      idAportanteNacion: idAportanteNacion!,
      idMecanismoInclusion: idMecanismoInclusion!,
      idSectorAdministracionNacional: idSectorAdministracionNacional!,
      idEntidadProyecto: idEntidadTerritorial,
      metaPaTexto: metaPaTexto,
      inversionClimatica: !!this.newProyecto.inversionClimatica,
      plazoEstimadoEjecucion: plazoYmd,
      actaCdNumero: actaCd,
      actaCdFecha: actaCdFecha.trim()
    };

    const productoMga = (this.newProyecto.productoPrincipalMga || '').trim();
    const cantidadMeta = Number(cantidadMetaPa);
    const nombresMultimedia = this.multimediaAdjuntos.map((a) => a.nombre).filter(Boolean);

    const proyectoBase: Omit<Proyecto, 'id' | 'fechaCreacion'> = {
      nombre: nombre.trim(),
      descripcion: (alcance || nombreBpin).trim(),
      pactoAsociado: pactoAsociado.trim(),
      codigo: codigo.trim(),
      bpin: bpin.trim(),
      actaCd: `${actaCd} - ${actaCdFecha}`,
      sector: sectorTexto || 'Sin sector',
      lineaTematica: lineaTrim,
      numeroEmpleosDirectos,
      numeroEmpleosIndirectos,
      consecutivoConpes: Number(consecutivoConpes),
      tieneViabilidad,
      fechaViabilidad: fechaViabilidad ? new Date(fechaViabilidad) : undefined,
      frpt,
      numeroContratoEspecifico: frpt && numeroContratoEspecifico ? Number(numeroContratoEspecifico) : undefined,
      presupuesto: 0,
      responsable: responsableProyecto,
      estado: estadoTexto || 'Sin estado',
      fechaInicio: new Date(nowIso),
      fechaFin: new Date(fechaFinIso),
      avance: 0,
      ...(productoMga ? { productoPrincipalMga: productoMga } : {}),
      cantidadMetaPa: cantidadMeta,
      ...(nombresMultimedia.length ? { multimediaNombres: nombresMultimedia } : {})
    };

    this.isSavingProyecto = true;

    if (isEditMode) {
      const local = this.proyectosService.getProyectosSnapshot().find((p) => p.id === this.editingProyectoLocalId);
      const apiId = local?.apiId;
      if (apiId == null || apiId < 1) {
        this.isSavingProyecto = false;
        this.presentSaveProyectoErrores([
          'Este proyecto no tiene id en la API. Solo se pueden editar proyectos guardados en el servidor.'
        ]);
        return;
      }
      const updateCommand: UpdateProyectoCommand = { ...commandBase, id: apiId };
      this.proyectosService
        .updateProyectoInApi(updateCommand)
        .pipe(finalize(() => (this.isSavingProyecto = false)))
        .subscribe((result) => {
          if (!result.success) {
            this.presentSaveProyectoErrores([result.message || 'No fue posible actualizar el proyecto en la API.']);
            return;
          }
          this.proyectosService.updateProyecto(this.editingProyectoLocalId!, {
            ...proyectoBase,
            ...persistedApiFields,
            apiId
          });
          this.resetForm();
          this.tryCloseProyectoModal();
        });
      return;
    }

    this.proyectosService
      .createProyecto(commandBase)
      .pipe(finalize(() => (this.isSavingProyecto = false)))
      .subscribe((result) => {
        if (!result.success) {
          this.presentSaveProyectoErrores([result.message || 'No fue posible crear el proyecto en la API.']);
          return;
        }

        const apiId = result.id;
        if (apiId) {
          proyectoBase.codigo = proyectoBase.codigo || String(apiId);
        }
        if (result.nombre) {
          proyectoBase.nombre = result.nombre;
        }
        this.proyectosService.addProyecto({
          ...proyectoBase,
          ...persistedApiFields,
          apiId
        });
        this.resetForm();
        this.tryCloseProyectoModal();
      });
  }

  resetForm(): void {
    this.clearMultimediaAdjuntos();
    this.closeSaveProyectoErrorModal();
    this.newProyecto = this.getInitialFormData();
    this.isSavingProyecto = false;
    this.modoFormulario = 'crear';
    this.editingProyectoLocalId = null;
    setTimeout(() => this.cleanupModalUiState(), 300);
  }

  private collectProyectoFormValidationErrors(f: {
    pactoAsociado: string;
    bpin: string;
    nombreBpin: string;
    codigo: string;
    nombre: string;
    consecutivoConpes: string;
    actaCdNumero: string;
    actaCdFecha: string;
    idAreaInfluencia: number | null;
    idEstadoProyecto: number | null;
    idCondicionProyecto: number | null;
    idSector: number | null;
    lineaTrim: string;
    lineasDispLength: number;
    plazoYmd: string;
    plazoDias: number;
    tieneViabilidad: boolean;
    fechaViabilidad: string;
    frpt: boolean;
    numeroContratoEspecifico: string;
    idAportanteNacion: number | null;
    municipioEntidad: string;
    alcance: string;
    metaPa: string;
    cantidadMetaPa: number | null;
    idMecanismoInclusion: number | null;
    idSectorAdministracionNacional: number | null;
  }): string[] {
    const errores: string[] = [];

    if (!f.pactoAsociado.trim()) {
      errores.push('Pacto: debe seleccionar un pacto.');
    }

    const bpinTrim = f.bpin.trim();
    if (!bpinTrim) {
      errores.push('BPIN: campo obligatorio.');
    } else if (!/^[A-Za-z0-9]{13}$/.test(bpinTrim)) {
      errores.push('BPIN: debe tener exactamente 13 caracteres alfanumericos (letras y numeros).');
    }

    if (!f.nombreBpin.trim()) {
      errores.push('Nombre BPIN: campo obligatorio.');
    }
    if (!f.codigo.trim()) {
      errores.push('Codigo: campo obligatorio.');
    }
    if (!f.nombre.trim()) {
      errores.push('Nombre: campo obligatorio.');
    }

    const conpesTrim = f.consecutivoConpes.trim();
    if (!conpesTrim) {
      errores.push('Consecutivo CONPES: campo obligatorio.');
    } else if (!/^\d{5}$/.test(conpesTrim)) {
      errores.push('Consecutivo CONPES: debe tener exactamente 5 digitos numericos.');
    }

    if (!f.actaCdNumero.trim()) {
      errores.push('Acta CD Numero: campo obligatorio.');
    }

    const actaFechaOk = /^\d{4}-\d{2}-\d{2}$/.test((f.actaCdFecha || '').trim());
    if (!f.actaCdFecha?.trim()) {
      errores.push('Acta CD Fecha: campo obligatorio.');
    } else if (!actaFechaOk) {
      errores.push('Acta CD Fecha: formato invalido (use AAAA-MM-DD).');
    }

    if (f.idAreaInfluencia == null || f.idAreaInfluencia < 1) {
      errores.push('Area de influencia: debe seleccionar una opcion del catalogo.');
    }
    if (f.idEstadoProyecto == null || f.idEstadoProyecto < 1) {
      errores.push('Estado de proyecto: debe seleccionar una opcion del catalogo.');
    }
    if (f.idCondicionProyecto == null || f.idCondicionProyecto < 1) {
      errores.push('Condicion de proyecto: debe seleccionar una opcion del catalogo.');
    }
    if (f.idSector == null || f.idSector < 1) {
      errores.push('Sector: debe seleccionar una opcion del catalogo.');
    }

    if (f.lineasDispLength > 0 && !f.lineaTrim) {
      errores.push('Linea tematica: debe seleccionar una linea del pacto asociado.');
    }

    if (!f.plazoYmd) {
      errores.push('Plazo estimado ejecucion: campo obligatorio.');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(f.plazoYmd)) {
      errores.push('Plazo estimado ejecucion: formato invalido (use AAAA-MM-DD).');
    } else if (f.plazoDias < 0) {
      errores.push('Plazo estimado ejecucion: la fecha debe ser hoy o posterior.');
    }

    if (f.tieneViabilidad && !(f.fechaViabilidad || '').trim()) {
      errores.push('Fecha viabilidad: obligatoria cuando marca "Tiene viabilidad".');
    } else if (f.tieneViabilidad && !/^\d{4}-\d{2}-\d{2}$/.test((f.fechaViabilidad || '').trim())) {
      errores.push('Fecha viabilidad: formato invalido (use AAAA-MM-DD).');
    }

    if (f.frpt && !f.numeroContratoEspecifico.trim()) {
      errores.push('Numero contrato especifico: obligatorio cuando marca FRPT.');
    }

    if (f.idAportanteNacion == null || f.idAportanteNacion < 1) {
      errores.push('Aporte nacion: debe seleccionar una opcion del catalogo 10.');
    }
    if (!f.municipioEntidad.trim()) {
      errores.push('Municipio (entidad territorial): debe seleccionar un municipio.');
    }
    if (!f.alcance.trim()) {
      errores.push('Alcance: campo obligatorio.');
    }
    if (!f.metaPa.trim()) {
      errores.push('Meta PA: campo obligatorio.');
    }

    const cantidad = f.cantidadMetaPa;
    if (cantidad === null || cantidad === undefined || Number.isNaN(Number(cantidad))) {
      errores.push('Cantidad Meta PA: campo obligatorio.');
    } else if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad < 0) {
      errores.push('Cantidad Meta PA: debe ser un numero entero mayor o igual a 0.');
    }

    if (f.idMecanismoInclusion == null || f.idMecanismoInclusion < 1) {
      errores.push('Mecanismo de inclusion: debe seleccionar una opcion del catalogo.');
    }
    if (f.idSectorAdministracionNacional == null || f.idSectorAdministracionNacional < 1) {
      errores.push('Sector Admin Nacional: debe seleccionar una opcion del catalogo.');
    }

    return errores;
  }

  onMultimediaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }

    const errores: string[] = [];
    const nuevos: MultimediaAdjunto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;

      const esImagen = file.type.startsWith('image/');
      const esVideo = file.type.startsWith('video/');
      if (!esImagen && !esVideo) {
        errores.push(`"${file.name}": solo imagen o video.`);
        continue;
      }
      if (esImagen && file.size > this.tamanoMaxImagenMultimedia) {
        errores.push(`"${file.name}": imagen mayor a 300 KB.`);
        continue;
      }
      if (esVideo && file.size > this.tamanoMaxVideoMultimedia) {
        errores.push(`"${file.name}": video mayor a 5 MB.`);
        continue;
      }

      nuevos.push({
        id: this.nuevoIdMultimedia(),
        file,
        url: URL.createObjectURL(file),
        tipo: esImagen ? 'imagen' : 'video',
        nombre: file.name
      });
    }

    this.multimediaSeleccionError = errores.length ? errores.join(' ') : '';
    this.multimediaAdjuntos = [...this.multimediaAdjuntos, ...nuevos];
    input.value = '';
  }

  removeMultimediaAdjunto(index: number): void {
    const adj = this.multimediaAdjuntos[index];
    if (adj) {
      URL.revokeObjectURL(adj.url);
    }
    this.multimediaAdjuntos = this.multimediaAdjuntos.filter((_, i) => i !== index);
  }

  private clearMultimediaAdjuntos(): void {
    this.multimediaSeleccionError = '';
    for (const a of this.multimediaAdjuntos) {
      URL.revokeObjectURL(a.url);
    }
    this.multimediaAdjuntos = [];
  }

  private nuevoIdMultimedia(): string {
    return `mm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  onTieneViabilidadChange(): void {
    if (!this.newProyecto.tieneViabilidad) {
      this.newProyecto.fechaViabilidad = '';
    }
  }

  onFrptChange(): void {
    if (!this.newProyecto.frpt) {
      this.newProyecto.numeroContratoEspecifico = '';
    }
  }

  private getInitialFormData(): ProyectoFormData {
    return {
      pactoAsociado: '',
      bpin: '',
      nombreBpin: '',
      codigo: '',
      nombre: '',
      actaCdNumero: '',
      actaCdFecha: '',
      idAreaInfluencia: null,
      idEstadoProyecto: null,
      idCondicionProyecto: null,
      idSector: null,
      lineaTematica: '',
      plazoEstimadoEjecucion: '',
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
      metaPa: '',
      productoPrincipalMga: '',
      cantidadMetaPa: null,
      idMecanismoInclusion: null,
      idSectorAdministracionNacional: null
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
  }

  onConpesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 5);
    this.newProyecto.consecutivoConpes = value;
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
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      mecanismos: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_MECANISMO_INCLUSION_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[]))),
      sectorAdminNacional: this.pactosService
        .getCatalogoByTipo(CATALOGO_TIPO_SECTOR_ADMIN_NACIONAL_PROYECTO)
        .pipe(catchError(() => of([] as CatalogoOption[])))
    }).pipe(
      tap(({ areas, estados, condiciones, sectores, aportantes, mecanismos, sectorAdminNacional }) => {
        this.areasInfluenciaCatalogo = this.sortCatalogOptions(areas);
        this.estadosProyectoCatalogo = this.sortCatalogOptions(estados);
        this.condicionesProyectoCatalogo = this.sortCatalogOptions(condiciones);
        this.sectoresProyectoCatalogo = this.sortCatalogOptions(sectores);
        this.aportantesNacionCatalogo = this.sortCatalogOptions(aportantes);
        this.mecanismosInclusionCatalogo = this.sortCatalogOptions(mecanismos);
        this.sectoresAdminNacionCatalogo = this.sortCatalogOptions(sectorAdminNacional);
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
    const meta = this.parseMetaPa(proyecto.metaPaTexto ?? '');
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
      nombreBpin: proyecto.nombre ?? '',
      codigo: proyecto.codigo ?? '',
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
      plazoEstimadoEjecucion: proyecto.plazoEstimadoEjecucion ?? '',
      numeroEmpleosDirectos: proyecto.numeroEmpleosDirectos ?? 0,
      numeroEmpleosIndirectos: proyecto.numeroEmpleosIndirectos ?? 0,
      consecutivoConpes: proyecto.consecutivoConpes != null ? String(proyecto.consecutivoConpes) : '',
      tieneViabilidad: !!proyecto.tieneViabilidad,
      fechaViabilidad: proyecto.fechaViabilidad ? this.isoToYmd(proyecto.fechaViabilidad.toISOString()) : '',
      frpt: !!proyecto.frpt,
      numeroContratoEspecifico:
        proyecto.numeroContratoEspecifico != null ? String(proyecto.numeroContratoEspecifico) : '',
      idAportanteNacion: this.coerceSelectCatalogId(
        proyecto.idAportanteNacion,
        this.aportantesNacionCatalogo
      ),
      municipioEntidad: this.resolveMunicipioEntidadId(
        proyecto.idEntidadProyecto,
        proyecto.responsable
      ),
      inversionClimatica: !!proyecto.inversionClimatica,
      alcance: proyecto.descripcion ?? '',
      metaPa: meta.texto,
      productoPrincipalMga: proyecto.productoPrincipalMga ?? '',
      cantidadMetaPa: meta.cantidad ?? proyecto.cantidadMetaPa ?? null,
      idMecanismoInclusion: this.coerceSelectCatalogId(
        proyecto.idMecanismoInclusion,
        this.mecanismosInclusionCatalogo
      ),
      idSectorAdministracionNacional: this.coerceSelectCatalogId(
        proyecto.idSectorAdministracionNacional,
        this.sectoresAdminNacionCatalogo
      )
    };
    this.onPactoAsociadoChange(true);
  }

  private cargarFormularioDesdeDetalle(detalle: ProyectoDetalleApi, fallback: Proyecto): void {
    const meta = this.parseMetaPa(detalle.metaPa ?? fallback.metaPaTexto);
    this.newProyecto = {
      ...this.getInitialFormData(),
      pactoAsociado:
        this.findPactoNombreById(detalle.idPactoTerritorial) || fallback.pactoAsociado || '',
      bpin: detalle.bpin ?? fallback.bpin ?? '',
      nombreBpin: detalle.nombreBpin ?? fallback.nombre ?? '',
      codigo: detalle.codigo ?? fallback.codigo ?? '',
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
      plazoEstimadoEjecucion:
        this.isoToYmd(detalle.plazoEstimadoEjecucion) || fallback.plazoEstimadoEjecucion || '',
      numeroEmpleosDirectos: detalle.numeroEmpleosDirectos ?? fallback.numeroEmpleosDirectos ?? 0,
      numeroEmpleosIndirectos: detalle.numeroEmpleosIndirectos ?? fallback.numeroEmpleosIndirectos ?? 0,
      consecutivoConpes: detalle.consecutivoConpes ?? String(fallback.consecutivoConpes ?? ''),
      tieneViabilidad: detalle.tieneViabilidad ?? !!fallback.tieneViabilidad,
      fechaViabilidad:
        this.isoToYmd(detalle.fechaViabilidad) ||
        (fallback.fechaViabilidad ? this.isoToYmd(fallback.fechaViabilidad.toISOString()) : ''),
      frpt: detalle.esFRPT ?? !!fallback.frpt,
      numeroContratoEspecifico: detalle.numeroContratoEspecifico ?? String(fallback.numeroContratoEspecifico ?? ''),
      idAportanteNacion: this.coerceSelectCatalogId(
        detalle.idAportanteNacion ?? fallback.idAportanteNacion,
        this.aportantesNacionCatalogo
      ),
      municipioEntidad: this.resolveMunicipioEntidadId(
        detalle.idEntidadProyecto ?? fallback.idEntidadProyecto,
        detalle.entidadResponsablePI ?? fallback.responsable
      ),
      inversionClimatica: detalle.esInversionClimatica ?? !!fallback.inversionClimatica,
      alcance: detalle.alcance ?? fallback.descripcion ?? '',
      metaPa: meta.texto,
      productoPrincipalMga: detalle.productoMGA ?? fallback.productoPrincipalMga ?? '',
      cantidadMetaPa: meta.cantidad ?? fallback.cantidadMetaPa ?? null,
      idMecanismoInclusion: this.coerceSelectCatalogId(
        detalle.idMecanismoInclusion ?? fallback.idMecanismoInclusion,
        this.mecanismosInclusionCatalogo
      ),
      idSectorAdministracionNacional: this.coerceSelectCatalogId(
        detalle.idSectorAdministracionNacional ?? fallback.idSectorAdministracionNacional,
        this.sectoresAdminNacionCatalogo
      )
    };
    this.onPactoAsociadoChange(true);
  }

  private parseMetaPa(metaPa?: string): { texto: string; cantidad: number | null } {
    const raw = (metaPa || '').trim();
    const match = raw.match(/^(.+?)\s*\|\s*Cantidad:\s*(\d+)\s*$/i);
    if (match) {
      return { texto: match[1].trim(), cantidad: Number(match[2]) };
    }
    return { texto: raw, cantidad: null };
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

  private presentSaveProyectoErrores(errores: string[]): void {
    this.saveProyectoErrores = errores.filter((e) => !!e?.trim());
    if (!this.saveProyectoErrores.length) {
      return;
    }
    this.cleanupModalUiState();
    setTimeout(() => {
      const body = document.querySelector('#nuevoProyectoModal .modal-body');
      body?.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
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
