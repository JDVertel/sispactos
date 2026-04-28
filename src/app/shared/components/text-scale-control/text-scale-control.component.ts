import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TextScaleService } from '../../../core/services/text-scale.service';

@Component({
  selector: 'app-text-scale-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-scale-control.component.html',
  styleUrl: './text-scale-control.component.css'
})
export class TextScaleControlComponent {
  protected readonly textScale = inject(TextScaleService);

  private readonly labels = ['Muy pequeño', 'Pequeño', 'Normal', 'Grande', 'Muy grande'];

  readonly levelLabel = computed(() => this.labels[this.textScale.level()] ?? 'Normal');
}
