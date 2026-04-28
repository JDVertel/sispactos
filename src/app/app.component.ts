import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TextScaleService } from './core/services/text-scale.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'sispactos2';

  /** Inicializa escala de texto (localStorage + clase en documentElement) antes del layout. */
  private readonly _textScale = inject(TextScaleService);
}
