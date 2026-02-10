import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type MenuItem =
  | {
      type: 'item';
      label: string;
      route: string;
      icon: string;
      absolute?: boolean;
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

const MENU_ITEMS: MenuItem[] = [
  { type: 'item', label: 'Home', route: 'home', icon: 'home' },
  { type: 'item', label: 'Acerca de', route: 'acerca-de', icon: 'info' },
  { type: 'item', label: 'Pacto territorial', route: 'pacto-territorial', icon: 'pin' },
  { type: 'item', label: 'Proyectos', route: 'proyectos', icon: 'folder' },
  { type: 'item', label: 'Financiero', route: 'financiero', icon: 'wallet' },
  { type: 'item', label: 'Plan de accion', route: 'plan-accion', icon: 'checklist' },
  { type: 'item', label: 'Avances', route: 'avances', icon: 'trend' },
  { type: 'item', label: 'Contratos', route: 'contratos', icon: 'file' },
  { type: 'item', label: 'Compromisos', route: 'compromisos', icon: 'check' },
  { type: 'item', label: 'Mapas', route: 'mapas', icon: 'map' },
  { type: 'item', label: 'Tablero de mando', route: 'tablero-mando', icon: 'gauge' },
  { type: 'separator', label: 'Herramientas ' },
  {
    type: 'submenu',
    label: 'administracion',
    icon: 'settings',
    children: [{ label: 'Gestion de roles', route: 'administracion' }]
  },
  { type: 'item', label: 'Ayudas', route: 'ayudas', icon: 'help' },
  { type: 'item', label: 'Salir', route: '/login', icon: 'logout', absolute: true }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  menuItems = MENU_ITEMS;
  isSidebarOpen = false;
  activeSubmenu: string | null = null;

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSubmenu(label: string): void {
    this.activeSubmenu = this.activeSubmenu === label ? null : label;
  }

  closeAllMenus(): void {
    this.isSidebarOpen = false;
    this.activeSubmenu = null;
  }
}
