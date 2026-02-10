import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginMode: 'local' | 'guest' = 'local';
  username = '';
  password = '';
  submittedData: {
    mode: string;
    username: string;
    password: string;
    submittedAt: string;
  } | null = null;

  constructor(private router: Router) {}

  onSubmit(): void {
    const modeLabel = this.loginMode === 'guest' ? 'Invitado' : 'Local';
    const safeUsername = this.username.trim() || (this.loginMode === 'guest' ? 'Invitado' : '');
    const safePassword =
      this.loginMode === 'guest'
        ? '(sin clave)'
        : this.password.trim();

    this.submittedData = {
      mode: modeLabel,
      username: safeUsername,
      password: safePassword,
      submittedAt: new Date().toLocaleString('es-CO')
    };
  }

  onGuest(): void {
    this.loginMode = 'guest';
    if (!this.username.trim()) {
      this.username = 'Invitado';
    }
    this.password = '';
    this.onSubmit();
    this.router.navigateByUrl('/dashboard/home');
  }
}
