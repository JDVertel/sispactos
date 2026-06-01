import { Injectable } from '@angular/core';
import {
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
    return {
      proyectoId,
      indicativos: { ...base.indicativos, ...(raw.indicativos ?? {}) },
      comprometido: { ...base.comprometido, ...(raw.comprometido ?? {}) },
      conpes: this.normalizeConpes(raw.conpes, base.conpes),
      updatedAt: raw.updatedAt ?? base.updatedAt
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
