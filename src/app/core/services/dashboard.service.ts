import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Lista los módulos/permisos que se pueden asignar en administración.
  getAvailablePermissions() {
    return [
      { value: 'admin', label: 'Administrador' },
      { value: 'dashboard', label: 'Dashboard' },
      { value: 'gestion-pactos', label: 'Gestión de Pactos' },
      { value: 'gestion-proyectos', label: 'Gestión de Proyectos' },
      { value: 'gestion-contratos', label: 'Gestión de Contratos' },
      { value: 'configuracion-actores', label: 'Configuración de Actores' }
    ];
  }

  // Convierte números a formato de moneda colombiana.
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Convierte fechas a un formato legible para Colombia.
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }
}
