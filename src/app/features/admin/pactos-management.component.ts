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
  lineaTematicaInput = '';
  departamentoSeleccionado = '';
  municipioSeleccionado = '';
  alcanceDetalle = '';

  readonly departamentosMunicipios: Record<string, string[]> = {
    Antioquia: ['Medellin', 'Bello', 'Itagui', 'Rionegro'],
    Atlantico: ['Barranquilla', 'Soledad', 'Malambo'],
    Cundinamarca: ['Bogota D.C.', 'Soacha', 'Zipaquira', 'Facatativa'],
    ValleDelCauca: ['Cali', 'Palmira', 'Buenaventura'],
    Santander: ['Bucaramanga', 'Floridablanca', 'Barrancabermeja']
  };

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

  tiposPactos = ['Territorio', 'Nación'];
  etapasPacto = ['Construccion y suscripcion', 'Implementacion', 'Cierre'];

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

    const territorio = this.departamentoSeleccionado && this.municipioSeleccionado
      ? `${this.departamentoSeleccionado} - ${this.municipioSeleccionado}`
      : '';
    const detalle = this.alcanceDetalle.trim();
    this.newPacto.alcance = [
      territorio ? `Dptos de intervencion del pacto - municipio: ${territorio}` : '',
      detalle ? `Detalle: ${detalle}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    this.pactosService.addPacto(this.newPacto);
    this.resetForm();
  }

  addLineaTematicaFromInput(): void {
    const nuevaLinea = this.lineaTematicaInput.trim();

    if (!nuevaLinea) {
      return;
    }

    const existe = this.newPacto.lineasTematicas.some(
      (linea) => linea.toLowerCase() === nuevaLinea.toLowerCase()
    );

    if (!existe) {
      this.newPacto.lineasTematicas = [...this.newPacto.lineasTematicas, nuevaLinea];
    }

    this.lineaTematicaInput = '';
  }

  removeLineaTematica(index: number): void {
    this.newPacto.lineasTematicas = this.newPacto.lineasTematicas.filter((_, i) => i !== index);
  }

  get departamentosDisponibles(): string[] {
    return Object.keys(this.departamentosMunicipios);
  }

  get municipiosDisponibles(): string[] {
    return this.departamentosMunicipios[this.departamentoSeleccionado] ?? [];
  }

  onDepartamentoChange(): void {
    this.municipioSeleccionado = '';
    this.alcanceDetalle = '';
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
    this.lineaTematicaInput = '';
    this.departamentoSeleccionado = '';
    this.municipioSeleccionado = '';
    this.alcanceDetalle = '';
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
