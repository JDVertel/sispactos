import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  getAvailablePermissions() {
    return [
      { value: 'admin', label: 'Administrador' },
      { value: 'dashboard', label: 'Dashboard' },
      { value: 'gestion-pactos', label: 'Gestión de Pactos' },
      { value: 'gestion-proyectos', label: 'Gestión de Proyectos' },
      { value: 'gestion-contratos', label: 'Gestión de Contratos' }
    ];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }
}
