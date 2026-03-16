import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  // Define si el acceso será como invitado o usuario registrado.
  loginMode: 'local' | 'guest' = 'guest';
  // Datos que el usuario escribe en el formulario.
  username = '';
  password = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Intenta iniciar sesión y, si es correcto, envía al inicio del panel.
  onSubmit(): void {
    const isAuthenticated = this.authService.login(
      this.username,
      this.password,
      this.loginMode
    );

    if (isAuthenticated) {
      this.router.navigateByUrl('/dashboard/home');
    }
  }
}
