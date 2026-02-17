import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Pacto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  cuantia: number;
  objetivoGeneral: string;
  ambitoGeografico: string;
  duracion: string;
  ejeEstrategico: string;
  fechaCreacion: Date;
}

@Component({
  selector: 'app-pactos-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pactos-management.component.html',
  styleUrl: './pactos-management.component.css'
})
export class PactosManagementComponent {
  pactos: Pacto[] = [
    {
      id: 1,
      nombre: 'Pacto por el Norte de Santander',
      descripcion: 'Alianza estratégica para el desarrollo integral de la región fronteriza del Norte de Santander.',
      codigo: 'PNS-2024-001',
      cuantia: 15000000000,
      objetivoGeneral: 'Promover el desarrollo sostenible e integral del Norte de Santander mediante la implementación de proyectos de infraestructura, educación y fortalecimiento institucional.',
      ambitoGeografico: 'Norte de Santander - Colombia',
      duracion: '4 años (2024-2028)',
      ejeEstrategico: 'Desarrollo Regional Sostenible',
      fechaCreacion: new Date('2024-01-15')
    },
    {
      id: 2,
      nombre: 'Pacto Caribe Próspero',
      descripcion: 'Iniciativa de desarrollo económico y social para la región Caribe colombiana.',
      codigo: 'PCP-2024-002',
      cuantia: 22000000000,
      objetivoGeneral: 'Impulsar el crecimiento económico inclusivo y sostenible de la región Caribe a través de la innovación, el turismo y la conectividad.',
      ambitoGeografico: 'Región Caribe - Colombia',
      duracion: '5 años (2024-2029)',
      ejeEstrategico: 'Crecimiento Económico Inclusivo',
      fechaCreacion: new Date('2024-02-10')
    }
  ];

  newPacto: Omit<Pacto, 'id' | 'fechaCreacion'> = {
    nombre: '',
    descripcion: '',
    codigo: '',
    cuantia: 0,
    objetivoGeneral: '',
    ambitoGeografico: '',
    duracion: '',
    ejeEstrategico: ''
  };

  ejesEstrategicos = [
    'Desarrollo Regional Sostenible',
    'Crecimiento Económico Inclusivo',
    'Fortalecimiento Institucional',
    'Innovación y Competitividad',
    'Desarrollo Social',
    'Infraestructura y Conectividad',
    'Medio Ambiente y Sostenibilidad',
    'Educación y Capital Humano'
  ];

  addPacto(): void {
    const { nombre, descripcion, codigo, cuantia, objetivoGeneral, ambitoGeografico, duracion, ejeEstrategico } = this.newPacto;
    
    if (!nombre.trim() || !descripcion.trim() || !codigo.trim() || cuantia <= 0 || !objetivoGeneral.trim() || !ambitoGeografico.trim() || !duracion.trim() || !ejeEstrategico) {
      return;
    }

    const nextId = this.pactos.length ? Math.max(...this.pactos.map(p => p.id)) + 1 : 1;
    
    this.pactos = [
      ...this.pactos,
      {
        id: nextId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        codigo: codigo.trim(),
        cuantia,
        objetivoGeneral: objetivoGeneral.trim(),
        ambitoGeografico: ambitoGeografico.trim(),
        duracion: duracion.trim(),
        ejeEstrategico,
        fechaCreacion: new Date()
      }
    ];

    this.resetForm();
  }

  removePacto(id: number): void {
    this.pactos = this.pactos.filter(pacto => pacto.id !== id);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTotalCuantia(): number {
    return this.pactos.reduce((sum, pacto) => sum + pacto.cuantia, 0);
  }

  private resetForm(): void {
    this.newPacto = {
      nombre: '',
      descripcion: '',
      codigo: '',
      cuantia: 0,
      objetivoGeneral: '',
      ambitoGeografico: '',
      duracion: '',
      ejeEstrategico: ''
    };
  }
}