import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  CONTRATOS_DATA_SCOPE,
  contratosStorageKey,
  type ContratosDataScope
} from '../contratos/contratos-scope';
import { DesembolsoProgramado } from '../../shared/models/desembolso-programado.model';

export type DesembolsoProgramadoInput = Omit<DesembolsoProgramado, 'id' | 'registradoEn'>;

@Injectable()
export class DesembolsosProgramadosService {
  private readonly storageKey: string;
  private readonly desembolsos$ = new BehaviorSubject<DesembolsoProgramado[]>([]);

  constructor() {
    const resolvedScope = inject(CONTRATOS_DATA_SCOPE, { optional: true });
    this.storageKey = contratosStorageKey('sispactos.desembolsos.programados', resolvedScope);
    this.loadFromStorage();
  }

  watchDesembolsos(): Observable<DesembolsoProgramado[]> {
    return this.desembolsos$.asObservable();
  }

  getByContratoId(contratoId: number): DesembolsoProgramado[] {
    return this.desembolsos$.value
      .filter((d) => d.contratoId === contratoId)
      .sort((a, b) => a.numeroDesembolso - b.numeroDesembolso);
  }

  countByContratoId(contratoId: number): number {
    return this.desembolsos$.value.filter((d) => d.contratoId === contratoId).length;
  }

  add(input: DesembolsoProgramadoInput): DesembolsoProgramado {
    const nuevo: DesembolsoProgramado = {
      ...input,
      id: `des-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      registradoEn: new Date().toISOString()
    };
    this.desembolsos$.next([...this.desembolsos$.value, nuevo]);
    this.saveToStorage();
    return nuevo;
  }

  remove(id: string): void {
    this.desembolsos$.next(this.desembolsos$.value.filter((d) => d.id !== id));
    this.saveToStorage();
  }

  removeByContratoId(contratoId: number): void {
    this.desembolsos$.next(this.desembolsos$.value.filter((d) => d.contratoId !== contratoId));
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
      this.desembolsos$.next(parsed.map((item) => this.normalize(item as Partial<DesembolsoProgramado>)));
    } catch {
      this.desembolsos$.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.desembolsos$.value));
  }

  private normalize(raw: Partial<DesembolsoProgramado>): DesembolsoProgramado {
    return {
      id: String(raw.id ?? `des-${Date.now()}`),
      contratoId: Number(raw.contratoId) || 0,
      idPactoTerritorial: raw.idPactoTerritorial ?? null,
      pacto: String(raw.pacto ?? ''),
      idProyecto: raw.idProyecto ?? null,
      proyecto: String(raw.proyecto ?? ''),
      numeroContrato: String(raw.numeroContrato ?? ''),
      numeroDesembolso: Number(raw.numeroDesembolso) || 0,
      fechaEstimadaProgramada: this.toYmd(raw.fechaEstimadaProgramada),
      valor: Number(raw.valor) || 0,
      hito: String(raw.hito ?? ''),
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
