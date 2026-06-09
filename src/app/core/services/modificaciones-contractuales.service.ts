import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  CONTRATOS_DATA_SCOPE,
  contratosStorageKey,
  type ContratosDataScope
} from '../contratos/contratos-scope';
import {
  ModificacionContractual,
  TipoModificacionContractual
} from '../../shared/models/modificacion-contractual.model';

export type ModificacionContractualInput = Omit<ModificacionContractual, 'id' | 'registradoEn'>;

@Injectable()
export class ModificacionesContractualesService {
  private readonly storageKey: string;
  private readonly modificaciones$ = new BehaviorSubject<ModificacionContractual[]>([]);

  constructor() {
    const resolvedScope = inject(CONTRATOS_DATA_SCOPE, { optional: true });
    this.storageKey = contratosStorageKey('sispactos.modificaciones.contractuales', resolvedScope);
    this.loadFromStorage();
  }

  watchModificaciones(): Observable<ModificacionContractual[]> {
    return this.modificaciones$.asObservable();
  }

  getSnapshot(): ModificacionContractual[] {
    return this.modificaciones$.value;
  }

  getByContratoId(contratoId: number): ModificacionContractual[] {
    return this.modificaciones$.value
      .filter((m) => m.contratoId === contratoId)
      .sort((a, b) => new Date(b.registradoEn).getTime() - new Date(a.registradoEn).getTime());
  }

  countByContratoId(contratoId: number): number {
    return this.modificaciones$.value.filter((m) => m.contratoId === contratoId).length;
  }

  add(input: ModificacionContractualInput): ModificacionContractual {
    const nueva: ModificacionContractual = {
      ...input,
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      registradoEn: new Date().toISOString()
    };
    this.modificaciones$.next([...this.modificaciones$.value, nueva]);
    this.saveToStorage();
    return nueva;
  }

  remove(id: string): void {
    this.modificaciones$.next(this.modificaciones$.value.filter((m) => m.id !== id));
    this.saveToStorage();
  }

  removeByContratoId(contratoId: number): void {
    this.modificaciones$.next(this.modificaciones$.value.filter((m) => m.contratoId !== contratoId));
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
      this.modificaciones$.next(parsed.map((item) => this.normalize(item as Partial<ModificacionContractual>)));
    } catch {
      this.modificaciones$.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.modificaciones$.value));
  }

  private normalize(raw: Partial<ModificacionContractual>): ModificacionContractual {
    const tipo = (raw.tipoModificacion ?? 'general') as TipoModificacionContractual;
    return {
      id: String(raw.id ?? `mod-${Date.now()}`),
      contratoId: Number(raw.contratoId) || 0,
      idPactoTerritorial: raw.idPactoTerritorial ?? null,
      pacto: String(raw.pacto ?? ''),
      idProyecto: raw.idProyecto ?? null,
      proyecto: String(raw.proyecto ?? ''),
      numeroContrato: String(raw.numeroContrato ?? ''),
      tipoModificacion: tipo,
      fechaModificacion: this.toYmd(raw.fechaModificacion),
      inicioNovedad: this.toYmd(raw.inicioNovedad),
      fechaFinal: this.toYmd(raw.fechaFinal),
      meses: Number(raw.meses) || 0,
      valorAdicionado: Number(raw.valorAdicionado) || 0,
      registradoEn: raw.registradoEn ?? new Date().toISOString()
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
