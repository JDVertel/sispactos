import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type MenuItem =
  | {
      type: 'item';
      label: string;
      route: string;
      icon: string;
      absolute?: boolean;
      action?: 'open-login-modal' | 'logout' | 'logout-and-open-login';
    }
  | {
      type: 'submenu';
      label: string;
      icon: string;
      children: Array<{
        label: string;
        route: string;
      }>;
    }
  | {
      type: 'separator';
      label: string;
    };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  // Opciones del menú que llegan desde el dashboard.
  @Input() menuItems: MenuItem[] = [];
  // Indica si el panel lateral está abierto (móvil/tablet).
  @Input() isSidebarOpen = false;
  // Identifica el submenú abierto para mostrar sus hijos.
  @Input() activeSubmenu: string | null = null;
  @Input() sessionUserName = 'Usuario';
  @Input() sessionUserRole = 'Sin rol';

  // Eventos para avisar al componente padre acciones del usuario.
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  @Output() toggleSubmenuEvent = new EventEmitter<string>();
  @Output() closeAllMenusEvent = new EventEmitter<void>();
  @Output() closeSidebarEvent = new EventEmitter<void>();
  @Output() menuActionEvent = new EventEmitter<'open-login-modal' | 'logout' | 'logout-and-open-login'>();

  // Solicita abrir/cerrar el sidebar.
  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  // Solicita cerrar sidebar.
  closeSidebar(): void {
    this.closeSidebarEvent.emit();
  }

  // Solicita abrir/cerrar un submenú concreto.
  toggleSubmenu(label: string): void {
    this.toggleSubmenuEvent.emit(label);
  }

  // Solicita cerrar todos los menús.
  closeAllMenus(): void {
    this.closeAllMenusEvent.emit();
  }

  // Ejecuta acciones especiales del menú sin navegación.
  runMenuAction(action: 'open-login-modal' | 'logout' | 'logout-and-open-login'): void {
    this.menuActionEvent.emit(action);
    this.closeSidebar();
  }

  // Inicial del usuario para avatar textual.
  get sessionUserInitial(): string {
    return this.sessionUserName.trim().charAt(0).toUpperCase() || 'U';
  }

  // Convierte etiquetas técnicas a texto legible.
  formatLabel(label: string): string {
    return label
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Traduce nombres de icono a clases de Bootstrap Icons.
  getBootstrapIconClass(icon: string): string {
    const icons: Record<string, string> = {
      home: 'bi-house-door',
      pin: 'bi-geo-alt',
      folder: 'bi-folder2-open',
      file: 'bi-file-earmark-text',
      bell: 'bi-bell',
      wallet: 'bi-wallet2',
      document: 'bi-file-earmark-richtext',
      checklist: 'bi-card-checklist',
      trend: 'bi-graph-up-arrow',
      check: 'bi-check2-square',
      map: 'bi-map',
      chart: 'bi-bar-chart-line',
      gauge: 'bi-speedometer2',
      user: 'bi-person',
      settings: 'bi-sliders',
      config: 'bi-gear',
      info: 'bi-info-circle',
      help: 'bi-question-circle',
      logout: 'bi-box-arrow-right'
    };

    return icons[icon] ?? 'bi-circle';
  }
}
