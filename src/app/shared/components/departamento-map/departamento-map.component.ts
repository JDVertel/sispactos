import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-departamento-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './departamento-map.component.html',
  styleUrl: './departamento-map.component.css'
})
export class DepartamentoMapComponent implements OnChanges {
  // Recibe el departamento elegido en los filtros.
  @Input() departamento = '';

  /** Marco redondeado tipo home solo en el dashboard; en otras rutas debe ser false. */
  @Input() homeSurface = false;

  // URL segura del mapa que se incrusta en pantalla.
  mapUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer) {
    // Carga el mapa inicial cuando entra al componente.
    this.updateMapUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia el departamento, actualiza el mapa automáticamente.
    if (changes['departamento']) {
      this.updateMapUrl();
    }
  }

  // Texto visible en la etiqueta del mapa.
  get displayDepartamento(): string {
    return this.departamento || 'Colombia';
  }

  // Construye el enlace del mapa según el departamento elegido.
  private updateMapUrl(): void {
    const query = this.departamento ? `${this.departamento}, Colombia` : 'Colombia';
    const url = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
