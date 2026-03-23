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

  // Mantiene los contratos en memoria y emite cambios a la vista.
  private contratos = new BehaviorSubject<ContratoExtended[]>([]);
  public contratos$ = this.contratos.asObservable();

  private tiposContrato = [
    'Obra Pública',
    'Consultoría',
    'Prestación de Servicios',
    'Suministro',
    'Concesión',
    'Interventoría'
  ];

  private proyectos = ['Proyecto A', 'Proyecto B', 'Proyecto C'];
  private contratistas = ['Consorcio Alfa', 'Unión Temporal Beta', 'Empresa Gamma'];
  private contratosPadre = ['N/A', 'CP-001', 'CP-002', 'CP-003'];
  private contratantes = ['DNP', 'Ministerio de Transporte', 'Gobernación'];
  private supervisores = ['Supervisor 1', 'Supervisor 2', 'Supervisor 3'];

  constructor() {
    this.loadFromStorage();
  }

  // Devuelve la lista de contratos.
  getContratos(): Observable<ContratoExtended[]> {
    return this.contratos$;
  }

  // Agrega un contrato nuevo con ID y fecha de creación.
  addContrato(contrato: Omit<ContratoExtended, 'id' | 'fechaCreacion'>): void {
    const currentContratos = this.contratos.value;
    const nextId = currentContratos.length ? Math.max(...currentContratos.map(c => c.id)) + 1 : 1;

    const newContrato: ContratoExtended = this.sanitizeRecord({
      id: nextId,
      ...contrato,
      fechaCreacion: new Date()
    });

    this.contratos.next([...currentContratos, newContrato]);
    this.saveToStorage();
  }

  // Elimina un contrato según su ID.
  removeContrato(id: number): void {
    this.contratos.next(this.contratos.value.filter(c => c.id !== id));
    this.saveToStorage();
  }

  // Actualiza datos puntuales de un contrato.
  updateContrato(id: number, contrato: Partial<Omit<ContratoExtended, 'id' | 'fechaCreacion'>>): void {
    const contratos = this.contratos.value.map(c =>
      c.id === id ? { ...c, ...contrato } : c
    );
    this.contratos.next(contratos);
    this.saveToStorage();
  }

  // Devuelve el catálogo de tipos de contrato.
  getTiposContrato(): string[] {
    return this.tiposContrato;
  }

  getProyectos(): string[] {
    return this.proyectos;
  }

  getContratistas(): string[] {
    return this.contratistas;
  }

  getContratosPadre(): string[] {
    return this.contratosPadre;
  }

  getContratantes(): string[] {
    return this.contratantes;
  }

  getSupervisores(): string[] {
    return this.supervisores;
  }

  // Calcula la suma total del valor inicial de todos los contratos.
  getTotalValorContratos(): number {
    return this.contratos.value.reduce((sum, c) => sum + c.valorInicial, 0);
  }

  // Cuenta cuántos contratos tienen enlace SECOP diligenciado.
  getContratosConSecop(): number {
    return this.contratos.value.filter(c => c.urlSecop.trim().length > 0).length;
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ContratoExtended[];
      if (!Array.isArray(parsed)) {
        this.contratos.next([]);
        return;
      }

      const hydrated = parsed.map((contrato) => this.sanitizeRecord({
        ...contrato,
        fechaInicio: new Date(contrato.fechaInicio),
        fechaFin: new Date(contrato.fechaFin),
        fechaCreacion: new Date(contrato.fechaCreacion)
      }));
      this.contratos.next(hydrated);
      this.saveToStorage();
    } catch {
      this.contratos.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.contratos.value));
  }

  private sanitizeRecord<T extends Record<string, unknown>>(record: T): T {
    const cleanedEntries = Object.entries(record).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    });

    return Object.fromEntries(cleanedEntries) as T;
  }
}
