import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PactosService } from '../../core/services/pactos.service';
import { Pacto } from '../../shared/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-pactos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pactos-management.component.html',
  styleUrl: './pactos-management.component.css'
})
export class PactosManagementComponent implements OnInit {
  pactos$: Observable<Pacto[]>;

  newPacto: Omit<Pacto, 'id'> = {
    tipoPacto: '',
    nombre: '',
    descripcion: '',
    objetivo: '',
    lineasTematicas: [],
    fechaSuscripcion: '',
    fechaNegociacion: '',
    valorEstimado: 0,
    valorEstimadoOtros: 0,
    porcentajeEstimado: 0,
    usuarioCreo: '',
    fechaCreacion: new Date().toISOString(),
    usuarioModifico: '',
    fechaModificacion: new Date().toISOString(),
    idEtapa: '',
    fechaVencimiento: '',
    alcance: '',
    urlDocPacto: '',
    urlDocMinuta: '',
    urlDocPEI: '',
    urlDocFicha: ''
  };

  lineasTematicasOptions: string[] = [
    'Educación',
    'Salud',
    'Agricultura',
    'Infraestructura',
    'Medio Ambiente',
    'Seguridad',
    'Vivienda',
    'Empleo'
  ];

  tiposPactos = ['Territorio', 'Nación'];

  constructor(private pactosService: PactosService) {
    this.pactos$ = this.pactosService.getPactos();
  }

  ngOnInit(): void {
  }

  onFileSelected(event: Event, field: 'urlDocPacto' | 'urlDocMinuta' | 'urlDocPEI' | 'urlDocFicha'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.newPacto[field] = file ? file.name : '';
  }

  addPacto(): void {
    const { nombre, descripcion, objetivo, tipoPacto } = this.newPacto;
    
    if (!nombre.trim() || !descripcion.trim() || !objetivo.trim() || !tipoPacto.trim()) {
      return;
    }

    this.pactosService.addPacto(this.newPacto);
    this.resetForm();
  }

  removePacto(id: number): void {
    this.pactosService.removePacto(id);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTotalValorEstimado(): number {
    return this.pactosService.getTotalValorEstimado();
  }

  private resetForm(): void {
    this.newPacto = {
      tipoPacto: '',
      nombre: '',
      descripcion: '',
      objetivo: '',
      lineasTematicas: [],
      fechaSuscripcion: '',
      fechaNegociacion: '',
      valorEstimado: 0,
      valorEstimadoOtros: 0,
      porcentajeEstimado: 0,
      usuarioCreo: '',
      fechaCreacion: new Date().toISOString(),
      usuarioModifico: '',
      fechaModificacion: new Date().toISOString(),
      idEtapa: '',
      fechaVencimiento: '',
      alcance: '',
      urlDocPacto: '',
      urlDocMinuta: '',
      urlDocPEI: '',
      urlDocFicha: ''
    };
  }
}
