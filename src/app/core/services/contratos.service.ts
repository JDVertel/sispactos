import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contrato } from '../../shared/models';

interface ContratoExtended extends Contrato {
  fechaCreacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ContratosService {
  private readonly storageKey = 'sispactos.contratos';

  private contratos = new BehaviorSubject<ContratoExtended[]>([]);
  public contratos$ = this.contratos.asObservable();

  private readonly tiposContratoFallback = [
    'Obra Pública',
    'Consultoría',
    'Prestación de Servicios',
    'Suministro',
    'Concesión',
    'Interventoría'
  ];

  constructor() {
    this.loadFromStorage();
  }

  getContratos(): Observable<ContratoExtended[]> {
    return this.contratos$;
  }

  getContratosSnapshot(): ContratoExtended[] {
    return this.contratos.value;
  }

  addContrato(contrato: Omit<ContratoExtended, 'id' | 'fechaCreacion'>): void {
    const currentContratos = this.contratos.value;
    const nextId = currentContratos.length ? Math.max(...currentContratos.map((c) => c.id)) + 1 : 1;

    const newContrato: ContratoExtended = {
      id: nextId,
      ...contrato,
      fechaCreacion: new Date()
    };

    this.contratos.next([...currentContratos, newContrato]);
    this.saveToStorage();
  }

  removeContrato(id: number): void {
    this.contratos.next(this.contratos.value.filter((c) => c.id !== id));
    this.saveToStorage();
  }

  updateContrato(id: number, contrato: Partial<Omit<ContratoExtended, 'id' | 'fechaCreacion'>>): void {
    const contratos = this.contratos.value.map((c) => (c.id === id ? { ...c, ...contrato } : c));
    this.contratos.next(contratos);
    this.saveToStorage();
  }

  getTiposContratoFallback(): string[] {
    return [...this.tiposContratoFallback];
  }

  getTotalValorContratos(): number {
    return this.contratos.value.reduce((sum, c) => sum + (Number(c.valorInicial) || 0), 0);
  }

  getContratosConSecop(): number {
    return this.contratos.value.filter((c) => (c.urlSecop ?? '').trim().length > 0).length;
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) {
        this.contratos.next([]);
        return;
      }

      const hydrated = parsed.map((item) => this.migrateRecord(item as Record<string, unknown>));
      this.contratos.next(hydrated);
      this.saveToStorage();
    } catch {
      this.contratos.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.contratos.value));
  }

  private migrateRecord(raw: Record<string, unknown>): ContratoExtended {
    const fechaCreacion = this.toDate(raw['fechaCreacion']) ?? new Date();
    const legacyFin = raw['fechaFin'];
    const fechaTerminacionInicial =
      this.toDateString(raw['fechaTerminacionInicial']) ??
      this.toDateString(legacyFin) ??
      '';

    return {
      id: Number(raw['id']) || 0,
      idPactoTerritorial:
        this.readOptionalNumber(raw['idPactoTerritorial']) ?? this.readOptionalNumber(raw['idPacto']),
      pacto: String(raw['pacto'] ?? ''),
      idProyecto: this.readOptionalNumber(raw['idProyecto']),
      proyecto: String(raw['proyecto'] ?? ''),
      idTipoContrato: this.readOptionalNumber(raw['idTipoContrato']),
      tipoContrato: String(raw['tipoContrato'] ?? ''),
      contratista: String(raw['contratista'] ?? ''),
      numeroContrato: String(raw['numeroContrato'] ?? ''),
      fechaSuscripcion:
        this.toDateString(raw['fechaSuscripcion']) ?? this.toDateString(raw['fechaCreacion']) ?? '',
      fechaInicio: this.toDateString(raw['fechaInicio']) ?? '',
      fechaTerminacionInicial,
      idEstado: this.readOptionalNumber(raw['idEstado']),
      estado: String(raw['estado'] ?? ''),
      idCondicion: this.readOptionalNumber(raw['idCondicion']),
      condicion: String(raw['condicion'] ?? ''),
      valorInicial: Number(raw['valorInicial']) || 0,
      numeroDesembolsos: Number(raw['numeroDesembolsos']) || 0,
      contratoPadre: String(raw['contratoPadre'] ?? '') || undefined,
      contratante: String(raw['contratante'] ?? ''),
      interventor: String(raw['interventor'] ?? raw['supervisor'] ?? ''),
      objeto: String(raw['objeto'] ?? ''),
      urlSecop: String(raw['urlSecop'] ?? '') || undefined,
      fechaCreacion
    };
  }

  private readOptionalNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toDateString(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    const d = this.toDate(value);
    if (!d) {
      return null;
    }
    return d.toISOString().slice(0, 10);
  }
}
