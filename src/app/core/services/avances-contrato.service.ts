import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AvanceContrato, AvanceContratoInput } from '../../shared/models/avance-contrato.model';

const STORAGE_KEY = 'sispactos.avances.contrato';

@Injectable({
  providedIn: 'root'
})
export class AvancesContratoService {
  private readonly avances$ = new BehaviorSubject<AvanceContrato[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  watchAvances(): Observable<AvanceContrato[]> {
    return this.avances$.asObservable();
  }

  getByContratoId(contratoId: number): AvanceContrato[] {
    return this.avances$.value
      .filter((a) => a.contratoId === contratoId)
      .sort((a, b) => new Date(b.registradoEn).getTime() - new Date(a.registradoEn).getTime());
  }

  countByContratoId(contratoId: number): number {
    return this.avances$.value.filter((a) => a.contratoId === contratoId).length;
  }

  add(input: AvanceContratoInput): AvanceContrato {
    const nuevo: AvanceContrato = {
      ...input,
      id: `avc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      registradoEn: new Date().toISOString()
    };
    this.avances$.next([...this.avances$.value, nuevo]);
    this.saveToStorage();
    return nuevo;
  }

  remove(id: string): void {
    this.avances$.next(this.avances$.value.filter((a) => a.id !== id));
    this.saveToStorage();
  }

  removeByContratoId(contratoId: number): void {
    this.avances$.next(this.avances$.value.filter((a) => a.contratoId !== contratoId));
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
      this.avances$.next(
        parsed.map((item) => this.normalize(item as Partial<AvanceContrato>))
      );
    } catch {
      this.avances$.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.avances$.value));
  }

  private normalize(raw: Partial<AvanceContrato>): AvanceContrato {
    const registradoEn = raw.registradoEn ?? new Date().toISOString();
    return {
      id: String(raw.id ?? `avc-${Date.now()}`),
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
