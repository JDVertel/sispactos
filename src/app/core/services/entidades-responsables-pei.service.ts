import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  EntidadResponsablePei,
  EntidadResponsablePeiInput
} from '../../shared/models/entidad-responsable-pei.model';

const STORAGE_KEY = 'sispactos.entidades.responsables.pei';

const SEED_ENTIDADES: EntidadResponsablePeiInput[] = [
  { nombre: 'Ministerio de Ambiente y Desarrollo Sostenible', observaciones: 'Catálogo inicial' },
  { nombre: 'INVIAS', observaciones: '' },
  { nombre: 'ANLA', observaciones: '' }
];

@Injectable({
  providedIn: 'root'
})
export class EntidadesResponsablesPeiService {
  private readonly entidades$ = new BehaviorSubject<EntidadResponsablePei[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  watchEntidades(): Observable<EntidadResponsablePei[]> {
    return this.entidades$.asObservable();
  }

  getSnapshot(): EntidadResponsablePei[] {
    return this.entidades$.value;
  }

  getOpcionesSelect(): Array<{ id: string; nombre: string }> {
    return this.entidades$.value.map((e) => ({ id: e.id, nombre: e.nombre }));
  }

  add(input: EntidadResponsablePeiInput): EntidadResponsablePei {
    const nombre = input.nombre.trim();
    const duplicado = this.entidades$.value.some(
      (e) => e.nombre.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) {
      throw new Error('Ya existe una entidad con ese nombre.');
    }

    const nueva: EntidadResponsablePei = {
      id: `pei-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nombre,
      observaciones: (input.observaciones ?? '').trim(),
      registradoEn: new Date().toISOString()
    };
    this.entidades$.next([...this.entidades$.value, nueva]);
    this.saveToStorage();
    return nueva;
  }

  remove(id: string): void {
    this.entidades$.next(this.entidades$.value.filter((e) => e.id !== id));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.seedInicial();
        return;
      }
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed) || !parsed.length) {
        this.seedInicial();
        return;
      }
      this.entidades$.next(parsed.map((item) => this.normalize(item as Partial<EntidadResponsablePei>)));
    } catch {
      this.seedInicial();
    }
  }

  private seedInicial(): void {
    const now = new Date().toISOString();
    const seeded: EntidadResponsablePei[] = SEED_ENTIDADES.map((item, index) => ({
      id: `pei-seed-${index + 1}`,
      nombre: item.nombre.trim(),
      observaciones: (item.observaciones ?? '').trim(),
      registradoEn: now
    }));
    this.entidades$.next(seeded);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entidades$.value));
  }

  private normalize(raw: Partial<EntidadResponsablePei>): EntidadResponsablePei {
    return {
      id: String(raw.id ?? `pei-${Date.now()}`),
      nombre: String(raw.nombre ?? '').trim(),
      observaciones: String(raw.observaciones ?? '').trim(),
      registradoEn: raw.registradoEn ?? new Date().toISOString()
    };
  }
}
