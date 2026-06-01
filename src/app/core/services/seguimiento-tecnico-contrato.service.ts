import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  SeguimientoTecnicoContrato,
  SeguimientoTecnicoContratoInput
} from '../../shared/models/seguimiento-tecnico-contrato.model';

const STORAGE_KEY = 'sispactos.seguimiento.tecnico.contrato';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoTecnicoContratoService {
  private readonly registros$ = new BehaviorSubject<SeguimientoTecnicoContrato[]>([]);

  constructor() {
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
      const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.registros$.value));
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
