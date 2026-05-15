import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TextScaleService } from './core/services/text-scale.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'sispactos2';

  /** Inicializa escala de texto (localStorage + clase en documentElement) antes del layout. */
  private readonly _textScale = inject(TextScaleService);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.ensureSessionKeepalive();
  }
}
