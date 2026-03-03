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
  loginMode: 'local' | 'guest' = 'guest';
  username = '';
  password = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

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
