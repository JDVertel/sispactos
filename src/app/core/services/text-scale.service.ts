import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const STORAGE_KEY = 'sispactos.textScaleLevel';
const SCALE_CLASS_PREFIX = 'app-text-scale-';

/** Niveles de tamaño de texto (rem vía tamaño de fuente raíz). */
@Injectable({ providedIn: 'root' })
export class TextScaleService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly minLevel = 0;
  readonly maxLevel = 4;
  readonly defaultLevel = 2;

  /** Nivel actual: 0 más pequeño … 4 más grande; 2 = estándar. */
  readonly level = signal(this.readInitialLevel());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.applyClassToDocument(this.level());
    }
  }

  increase(): void {
    this.setLevel(this.level() + 1);
  }

  decrease(): void {
    this.setLevel(this.level() - 1);
  }

  reset(): void {
    this.setLevel(this.defaultLevel);
  }

  setLevel(value: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const clamped = Math.max(this.minLevel, Math.min(this.maxLevel, Math.round(value)));
    this.level.set(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignorar cuota o modo privado */
    }
    this.applyClassToDocument(clamped);
  }

  private readInitialLevel(): number {
    if (!isPlatformBrowser(this.platformId)) {
      return this.defaultLevel;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null || raw === '') {
        return this.defaultLevel;
      }
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        return this.defaultLevel;
      }
      return Math.max(this.minLevel, Math.min(this.maxLevel, parsed));
    } catch {
      return this.defaultLevel;
    }
  }

  private applyClassToDocument(level: number): void {
    const root = this.document.documentElement;
    for (let i = this.minLevel; i <= this.maxLevel; i++) {
      root.classList.remove(`${SCALE_CLASS_PREFIX}${i}`);
    }
    root.classList.add(`${SCALE_CLASS_PREFIX}${level}`);
  }
}
