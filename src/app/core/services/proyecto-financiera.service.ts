import { Injectable } from '@angular/core';
import {
  COMPROMETIDO_DETALLE_KEYS,
  createEmptyComprometidoDetalle,
  ETIQUETA_COMPROMETIDO_INICIAL,
  etiquetaAdicionPresupuestal,
  migrarComprometidoLegacy,
  relabelVersionesComprometido
} from '../financiera/proyecto-financiera-comprometido.util';
import {
  ProyectoFinancieraComprometidoDetalle,
  ProyectoFinancieraComprometidoVersion,
  ProyectoFinancieraConpes,
  ProyectoFinancieraData,
  ProyectoFinancieraVigencia,
  createEmptyProyectoFinancieraData
} from '../../shared/models/proyecto-financiera.model';

const STORAGE_PREFIX = 'sispactos.proyecto.financiera.';

@Injectable({
  providedIn: 'root'
})
export class ProyectoFinancieraService {
  getByProyectoId(proyectoId: number): ProyectoFinancieraData {
    if (typeof window === 'undefined') {
      return createEmptyProyectoFinancieraData(proyectoId);
    }

    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${proyectoId}`);
      if (!raw) {
        return createEmptyProyectoFinancieraData(proyectoId);
      }
      const parsed = JSON.parse(raw) as ProyectoFinancieraData;
      return this.normalize(parsed, proyectoId);
    } catch {
      return createEmptyProyectoFinancieraData(proyectoId);
    }
  }

  save(data: ProyectoFinancieraData): void {
    if (typeof window === 'undefined') {
      return;
    }
    const payload: ProyectoFinancieraData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(`${STORAGE_PREFIX}${data.proyectoId}`, JSON.stringify(payload));
  }

  private normalize(raw: Partial<ProyectoFinancieraData>, proyectoId: number): ProyectoFinancieraData {
    const base = createEmptyProyectoFinancieraData(proyectoId);
    const comprometidoSesion = this.normalizeComprometidoSesion(raw, base);
    return {
      proyectoId,
      indicativos: { ...base.indicativos, ...(raw.indicativos ?? {}) },
      comprometidoSesion,
      comprometido: { ...base.comprometido, ...(raw.comprometido ?? {}) },
      conpes: this.normalizeConpes(raw.conpes, base.conpes),
      updatedAt: raw.updatedAt ?? base.updatedAt
    };
  }

  private normalizeComprometidoSesion(
    raw: Partial<ProyectoFinancieraData>,
    base: ProyectoFinancieraData
  ): ProyectoFinancieraData['comprometidoSesion'] {
    const fromRaw = raw.comprometidoSesion?.versiones;
    if (fromRaw?.length) {
      const versiones = fromRaw.map((v, index) => this.normalizeComprometidoVersion(v, index));
      return { versiones: relabelVersionesComprometido(versiones) };
    }
    const migradas = migrarComprometidoLegacy(raw.comprometido);
    if (migradas.length) {
      return { versiones: relabelVersionesComprometido(migradas) };
    }
    return base.comprometidoSesion;
  }

  private normalizeComprometidoVersion(
    raw: Partial<ProyectoFinancieraComprometidoVersion>,
    index: number
  ): ProyectoFinancieraComprometidoVersion {
    const detalle = createEmptyComprometidoDetalle();
    const detalleRaw: Partial<ProyectoFinancieraComprometidoDetalle> = raw.detalle ?? {};
    for (const key of COMPROMETIDO_DETALLE_KEYS) {
      const val = detalleRaw[key];
      detalle[key] = val != null && Number.isFinite(Number(val)) ? Number(val) : null;
    }
    const tipoVersion = raw.tipoVersion === 'anexo' ? 'anexo' : 'original';
    return {
      id: raw.id?.trim() || `comp-${index}-${Date.now()}`,
      etiqueta:
        (raw.etiqueta ?? '').trim()
        || (tipoVersion === 'anexo' ? etiquetaAdicionPresupuestal(index) : ETIQUETA_COMPROMETIDO_INICIAL),
      tipoVersion,
      detalle,
      registradoPor: (raw.registradoPor ?? '').trim() || '—',
      registradoEn: raw.registradoEn ?? ''
    };
  }

  private normalizeConpes(
    raw: Partial<ProyectoFinancieraConpes> | undefined,
    base: ProyectoFinancieraConpes
  ): ProyectoFinancieraConpes {
    const merged = { ...base, ...(raw ?? {}) };
    return {
      numeroConpes: (merged.numeroConpes ?? '').trim(),
      fechaConpes: (merged.fechaConpes ?? '').trim(),
      consecutivoProyecto: (merged.consecutivoProyecto ?? '').trim(),
      registradoPor: merged.registradoPor?.trim() || undefined,
      registradoEn: merged.registradoEn || undefined,
      actualizadoPor: merged.actualizadoPor?.trim() || undefined,
      actualizadoEn: merged.actualizadoEn || undefined,
      vigencias: (merged.vigencias ?? []).map((v, index) => this.normalizeVigencia(v, index))
    };
  }

  private normalizeVigencia(
    raw: Partial<ProyectoFinancieraVigencia> & { valor?: number | null; anio?: number | null },
    index: number
  ): ProyectoFinancieraVigencia {
    return {
      id: raw.id?.trim() || `vig-${proyectoIdFallback(index)}-${Date.now()}`,
      valor: raw.valor ?? null,
      anio: raw.anio ?? null,
      registradoPor: (raw.registradoPor ?? '').trim() || '—',
      registradoEn: raw.registradoEn ?? '',
      actualizadoPor: raw.actualizadoPor?.trim() || undefined,
      actualizadoEn: raw.actualizadoEn || undefined
    };
  }
}

function proyectoIdFallback(index: number): string {
  return `idx${index}`;
}
