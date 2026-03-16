import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface FilterDrawerValues {
  etapa: string;
  pacto: string;
  departamento: string;
}

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-drawer.component.html',
  styleUrl: './filter-drawer.component.css'
})
export class FilterDrawerComponent {
  @Output() filtersChange = new EventEmitter<FilterDrawerValues>();

  // Controla si el panel de filtros está abierto o cerrado.
  isOpen = false;

  // Opciones que verá el usuario en el selector de etapa.
  etapas = ['Formulación', 'Negociación', 'Suscripción', 'Ejecución', 'Terminado'];

  // Opciones disponibles para tipo de pacto.
  pactos = [
    'Pacto Territorial',
    'Contrato Plan',
    'Pacto de Borde',
    'Pacto Subregional',
    'Pacto Metropolitano'
  ];

  // Lista de departamentos para filtrar.
  departamentos = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar',
    'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
    'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
    'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta',
    'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
    'Risaralda', 'San Andrés', 'Santander', 'Sucre', 'Tolima',
    'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  selectedEtapa = '';
  selectedPacto = '';
  selectedDepartamento = '';

  // Indica si hay al menos un filtro activo.
  get hasActiveFilters(): boolean {
    return !!(this.selectedEtapa || this.selectedPacto || this.selectedDepartamento);
  }

  // Cuenta cuántos filtros están activos para mostrar el badge.
  get activeFilterCount(): number {
    return [this.selectedEtapa, this.selectedPacto, this.selectedDepartamento]
      .filter(Boolean).length;
  }

  // Abre o cierra el panel de filtros.
  toggleDrawer(): void {
    this.isOpen = !this.isOpen;
  }

  // Envía los filtros actuales al componente padre.
  applyFilter(): void {
    this.filtersChange.emit({
      etapa: this.selectedEtapa,
      pacto: this.selectedPacto,
      departamento: this.selectedDepartamento
    });
  }

  // Quita solo el filtro de etapa.
  removeEtapa(): void {
    this.selectedEtapa = '';
    this.applyFilter();
  }

  // Quita solo el filtro de pacto.
  removePacto(): void {
    this.selectedPacto = '';
    this.applyFilter();
  }

  // Quita solo el filtro de departamento.
  removeDepartamento(): void {
    this.selectedDepartamento = '';
    this.applyFilter();
  }

  // Limpia todos los filtros de una vez.
  clearFilters(): void {
    this.selectedEtapa = '';
    this.selectedPacto = '';
    this.selectedDepartamento = '';
    this.applyFilter();
  }
}
