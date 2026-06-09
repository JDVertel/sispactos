import { Injectable } from '@angular/core';
import { Observable, map, take } from 'rxjs';
import { EntidadesResponsablesPeiService } from './entidades-responsables-pei.service';

/** Opción de entidad responsable para el formulario de proyecto. */
export interface EntidadResponsableProyectoOption {
  id: string;
  nombre: string;
}

/**
 * Catálogo de entidades responsables del proyecto (desde Parámetros → Entidades responsables PEI).
 */
@Injectable({
  providedIn: 'root'
})
export class EntidadesResponsablesProyectoService {
  constructor(private readonly entidadesPeiService: EntidadesResponsablesPeiService) {}

  /** Una emisión (compatible con forkJoin y otras operaciones que exigen completar). */
  getEntidadesResponsables(): Observable<EntidadResponsableProyectoOption[]> {
    return this.entidadesPeiService.watchEntidades().pipe(
      take(1),
      map((rows) =>
        rows.map((e) => ({ id: e.id, nombre: e.nombre })).sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es-CO', { sensitivity: 'base' })
        )
      )
    );
  }
}
