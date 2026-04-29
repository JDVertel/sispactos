import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  @Input() compactMode = false;
  @Output() loginSuccess = new EventEmitter<void>();

  // Datos que el usuario escribe en el formulario.
  username = '';
  password = '';
  showPassword = false;
  isSubmitting = false;
  loginError = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Intenta iniciar sesión y, si es correcto, envía al inicio del panel.
  onSubmit(): void {
    this.loginError = '';
    this.isSubmitting = true;

    this.authService
      .login(this.username, this.password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe((result) => {
        if (!result.isAuthenticated) {
          this.loginError = result.message || 'Credenciales invalidas o servicio no disponible.';
          return;
        }

        this.loginSuccess.emit();

        if (!this.compactMode) {
          this.router.navigateByUrl('/dashboard/home');
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
