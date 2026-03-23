import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PactosService } from '../../core/services/pactos.service';
import { Pacto } from '../../shared/models';
import { Observable } from 'rxjs';

type PactoFormData = Pick<
  Pacto,
  'tipoPacto' | 'nombre' | 'descripcion' | 'objetivo' | 'lineasTematicas' | 'fechaSuscripcion' | 'idEtapa' | 'fechaVencimiento' | 'urlDocPacto' | 'urlDocMinuta'
>;

@Component({
  selector: 'app-pactos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pactos-management.component.html',
  styleUrl: './pactos-management.component.css'
})
export class PactosManagementComponent implements OnInit {
  // Lista observable de pactos para mostrar en la vista.
  pactos$: Observable<Pacto[]>;
  readonly etapaPorDefecto = 'Construccion y suscripcion';
  // Campos auxiliares del formulario.
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

  newPacto: PactoFormData = {
    tipoPacto: '',
    nombre: '',
    descripcion: '',
    objetivo: '',
    lineasTematicas: [],
    fechaSuscripcion: '',
    idEtapa: this.etapaPorDefecto,
    fechaVencimiento: '',
    urlDocPacto: '',
    urlDocMinuta: ''
  };

  tiposPactos = ['Territorio', 'Nación'];
  etapasPacto = ['Construccion y suscripcion', 'Implementacion', 'Cierre'];

  constructor(private pactosService: PactosService) {
    this.pactos$ = this.pactosService.getPactos();
  }

  ngOnInit(): void {
  }

  // Guarda el nombre del archivo seleccionado en el campo correspondiente.
  onFileSelected(event: Event, field: 'urlDocPacto' | 'urlDocMinuta'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.newPacto[field] = file ? file.name : '';
  }

  // Crea un pacto nuevo si los datos esenciales están completos.
  addPacto(): void {
    const { nombre, descripcion, objetivo, tipoPacto } = this.newPacto;

    if (!nombre.trim() || !descripcion.trim() || !objetivo.trim() || !tipoPacto.trim()) {
      console.warn('[SISPACTOS] No se guarda pacto: faltan campos obligatorios.');
      return;
    }

    const territorio = this.departamentoSeleccionado && this.municipioSeleccionado
      ? `${this.departamentoSeleccionado} - ${this.municipioSeleccionado}`
      : '';
    const detalle = this.alcanceDetalle.trim();
    const alcance = [
      territorio ? `Dptos de intervencion del pacto - municipio: ${territorio}` : '',
      detalle ? `Detalle: ${detalle}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const payload: Omit<Pacto, 'id'> = this.cleanPayload({
      ...this.newPacto,
      alcance,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    });

    console.log('[SISPACTOS] Nuevo pacto (local):', payload);
    this.pactosService.addPacto(payload);
    this.resetForm();
  }

  // Agrega una línea temática escrita por el usuario.
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
      idEtapa: this.etapaPorDefecto,
      fechaVencimiento: '',
      urlDocPacto: '',
      urlDocMinuta: ''
    };
  }

  private cleanPayload(payload: Omit<Pacto, 'id'>): Omit<Pacto, 'id'> {
    const entries = Object.entries(payload).filter(([, value]) => {
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

    return Object.fromEntries(entries) as Omit<Pacto, 'id'>;
  }
}
