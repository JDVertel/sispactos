import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contrato } from '../../shared/models';

interface ContratoExtended extends Contrato {
  proyectoAsociado: string;
  supervisor: string;
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

  private estadosContrato = [
    'En Trámite',
    'Perfeccionado',
    'En Ejecución',
    'Suspendido',
    'Terminado',
    'Liquidado',
    'Anulado'
  ];

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

  getEstadosContrato(): string[] {
    return this.estadosContrato;
  }

  getTotalValorContratos(): number {
    return this.contratos.value.reduce((sum, c) => sum + c.valorContrato, 0);
  }

  getContratosPorEstado(estado: string): number {
    return this.contratos.value.filter(c => c.estado === estado).length;
  }

  getContratosPorTipo(tipo: string): number {
    return this.contratos.value.filter(c => c.tipoContrato === tipo).length;
  }
}
