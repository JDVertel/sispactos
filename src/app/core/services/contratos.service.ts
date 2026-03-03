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

  constructor() {}

  getContratos(): Observable<ContratoExtended[]> {
    return this.contratos$;
  }

  addContrato(contrato: Omit<ContratoExtended, 'id' | 'fechaCreacion'>): void {
    const currentContratos = this.contratos.value;
    const nextId = currentContratos.length ? Math.max(...currentContratos.map(c => c.id)) + 1 : 1;

    const newContrato: ContratoExtended = {
      id: nextId,
      ...contrato,
      fechaCreacion: new Date()
    };

    this.contratos.next([...currentContratos, newContrato]);
  }

  removeContrato(id: number): void {
    this.contratos.next(this.contratos.value.filter(c => c.id !== id));
  }

  updateContrato(id: number, contrato: Partial<Omit<ContratoExtended, 'id' | 'fechaCreacion'>>): void {
    const contratos = this.contratos.value.map(c =>
      c.id === id ? { ...c, ...contrato } : c
    );
    this.contratos.next(contratos);
  }

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

  getTotalValorContratos(): number {
    return this.contratos.value.reduce((sum, c) => sum + c.valor, 0);
  }

  getContratosConSecop(): number {
    return this.contratos.value.filter(c => c.urlSecop.trim().length > 0).length;
  }
}
