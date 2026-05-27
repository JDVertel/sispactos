import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-ubicacion-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ubicacion-map.component.html',
  styleUrl: './ubicacion-map.component.css'
})
export class UbicacionMapComponent implements OnChanges {
  @Input() latitud: number | null = null;
  @Input() longitud: number | null = null;

  mapEmbedUrl: SafeResourceUrl | null = null;
  coordenadasValidas = false;
  openStreetMapLink = '';

  constructor(private readonly sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['latitud'] || changes['longitud']) {
      this.actualizarMapa();
    }
  }

  private actualizarMapa(): void {
    const lat = this.parseCoordenada(this.latitud);
    const lon = this.parseCoordenada(this.longitud);

    if (lat == null || lon == null) {
      this.mapEmbedUrl = null;
      this.coordenadasValidas = false;
      this.openStreetMapLink = '';
      return;
    }

    this.coordenadasValidas = true;
    const delta = 0.015;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    this.openStreetMapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
  }

  private parseCoordenada(value: number | null | undefined): number | null {
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    return value;
  }
}
