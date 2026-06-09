import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  CONTRATOS_DATA_SCOPE,
  contratosStorageKey,
  type ContratosDataScope
} from '../contratos/contratos-scope';
import {
  SeguimientoTecnicoContrato,
  SeguimientoTecnicoContratoInput
} from '../../shared/models/seguimiento-tecnico-contrato.model';

@Injectable()
export class SeguimientoTecnicoContratoService {
  private readonly storageKey: string;
  private readonly registros$ = new BehaviorSubject<SeguimientoTecnicoContrato[]>([]);

  constructor() {
    const resolvedScope = inject(CONTRATOS_DATA_SCOPE, { optional: true });
    this.storageKey = contratosStorageKey('sispactos.seguimiento.tecnico.contrato', resolvedScope);
    this.loadFromStorage();
  }

  watchRegistros(): Observable<SeguimientoTecnicoContrato[]> {
    return this.registros$.asObservable();
  }

  getByContratoId(contratoId: number): SeguimientoTecnicoContrato[] {
    return this.registros$.value
      .filter((r) => r.contratoId === contratoId)
      .sort((a, b) => new Date(b.registradoEn).getTime() - new Date(a.registradoEn).getTime());
  }

  countByContratoId(contratoId: number): number {
    return this.registros$.value.filter((r) => r.contratoId === contratoId).length;
  }

  add(input: SeguimientoTecnicoContratoInput): SeguimientoTecnicoContrato {
    const nuevo: SeguimientoTecnicoContrato = {
      ...input,
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      registradoEn: new Date().toISOString()
    };
    this.registros$.next([...this.registros$.value, nuevo]);
    this.saveToStorage();
    return nuevo;
  }

  remove(id: string): void {
    this.registros$.next(this.registros$.value.filter((r) => r.id !== id));
    this.saveToStorage();
  }

  removeByContratoId(contratoId: number): void {
    this.registros$.next(this.registros$.value.filter((r) => r.contratoId !== contratoId));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) {
        return;
      }
      this.registros$.next(
        parsed.map((item) => this.normalize(item as Partial<SeguimientoTecnicoContrato>))
      );
    } catch {
      this.registros$.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.registros$.value));
  }

  private normalize(raw: Partial<SeguimientoTecnicoContrato>): SeguimientoTecnicoContrato {
    const registradoEn = raw.registradoEn ?? new Date().toISOString();
    return {
      id: String(raw.id ?? `seg-${Date.now()}`),
      contratoId: Number(raw.contratoId) || 0,
      fechaReporte: this.toYmd(raw.fechaReporte) || this.toYmd(registradoEn),
      detalle: String(raw.detalle ?? ''),
      registradoEn
    };
  }

  private toYmd(value: unknown): string {
    if (!value) {
      return '';
    }
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
}
