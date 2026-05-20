import { Injectable } from '@angular/core';
import {
  ProyectoFinancieraData,
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
      conpes: {
        ...base.conpes,
        ...(raw.conpes ?? {}),
        vigencias:
          raw.conpes?.vigencias?.length
            ? raw.conpes.vigencias.map((v) => ({
                valor: v.valor ?? null,
                anio: v.anio ?? null
              }))
            : base.conpes.vigencias
      },
      updatedAt: raw.updatedAt ?? base.updatedAt
    };
  }
}
