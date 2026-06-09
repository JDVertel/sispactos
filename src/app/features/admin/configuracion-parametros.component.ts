import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EntidadesResponsablesPeiService } from '../../core/services/entidades-responsables-pei.service';
import { EntidadResponsablePei } from '../../shared/models/entidad-responsable-pei.model';

export type ParametroTab = 'entidadesResponsablesPei' | 'generales' | 'catalogos';

export interface ParametroTabDef {
  id: ParametroTab;
  label: string;
}

interface EntidadPeiFormState {
  nombre: string;
  observaciones: string;
}

@Component({
  selector: 'app-configuracion-parametros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-parametros.component.html',
  styleUrl: './configuracion-parametros.component.css'
})
export class ConfiguracionParametrosComponent implements OnInit, OnDestroy {
  readonly tabs: ParametroTabDef[] = [
    { id: 'entidadesResponsablesPei', label: 'Entidades responsables PEI' },
    { id: 'generales', label: 'Parámetros generales' },
    { id: 'catalogos', label: 'Catálogos' }
  ];

  tabActivo: ParametroTab = 'entidadesResponsablesPei';

  entidades: EntidadResponsablePei[] = [];
  form: EntidadPeiFormState = this.emptyForm();
  formError = '';
  formOk = false;

  private sub: Subscription | null = null;

  constructor(private readonly entidadesPeiService: EntidadesResponsablesPeiService) {}

  ngOnInit(): void {
    this.sub = this.entidadesPeiService.watchEntidades().subscribe((rows) => {
      this.entidades = rows;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setTab(tab: ParametroTab): void {
    this.tabActivo = tab;
  }

  guardarEntidad(): void {
    this.formError = '';
    this.formOk = false;
    const nombre = this.form.nombre.trim();
    if (!nombre) {
      this.formError = 'Indique el nombre de la entidad.';
      return;
    }

    try {
      this.entidadesPeiService.add({
        nombre,
        observaciones: this.form.observaciones.trim()
      });
      this.formOk = true;
      this.resetForm();
    } catch (err) {
      this.formError = err instanceof Error ? err.message : 'No fue posible guardar la entidad.';
    }
  }

  quitarEntidad(entidad: EntidadResponsablePei): void {
    this.entidadesPeiService.remove(entidad.id);
  }

  resetForm(): void {
    this.form = this.emptyForm();
    this.formError = '';
  }

  trackEntidad(_index: number, item: EntidadResponsablePei): string {
    return item.id;
  }

  private emptyForm(): EntidadPeiFormState {
    return { nombre: '', observaciones: '' };
  }
}
