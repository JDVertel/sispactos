import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class FilterDrawerComponent implements OnChanges {
  @Output() filtersChange = new EventEmitter<FilterDrawerValues>();

  /** Etapas presentes en los registros del servicio (ordenadas). */
  @Input() etapas: string[] = [];

  /** Tipos de pacto presentes en los registros del servicio (ordenados). */
  @Input() tiposPacto: string[] = [];

  /** Departamentos presentes en los registros del servicio (ordenados). */
  @Input() departamentos: string[] = [];

  // Controla si el panel de filtros está abierto o cerrado.
  isOpen = false;

  selectedEtapa = '';
  selectedPacto = '';
  selectedDepartamento = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['etapas'] || changes['tiposPacto'] || changes['departamentos']) {
      this.pruneInvalidSelections();
    }
  }

  /** Si el listado del servicio cambia, quita selecciones que ya no existen. */
  private pruneInvalidSelections(): void {
    let changed = false;
    if (this.selectedEtapa && !this.etapas.includes(this.selectedEtapa)) {
      this.selectedEtapa = '';
      changed = true;
    }
    if (this.selectedPacto && !this.tiposPacto.includes(this.selectedPacto)) {
      this.selectedPacto = '';
      changed = true;
    }
    if (this.selectedDepartamento && !this.departamentos.includes(this.selectedDepartamento)) {
      this.selectedDepartamento = '';
      changed = true;
    }
    if (changed) {
      this.applyFilter();
    }
  }

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
