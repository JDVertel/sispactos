import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

const MENU_ITEMS: MenuItem[] = [
  // Menú principal que alimenta la navegación del panel.
  { type: 'item', label: 'Home', route: 'home', icon: 'home' },
  { type: 'item', label: 'Pactos Territoriales', route: 'pactos-territoriales', icon: 'pin' },
  {
    type: 'submenu',
    label: 'proyectos',
    icon: 'folder',
    children: [
      { label: 'Proyectos Nación Territorio', route: 'proyectos-nacion-territorio' },
      { label: 'Proyectos FRPT', route: 'proyectos-frpt' }
    ]
  },
  {
    type: 'submenu',
    label: 'contratos-plan',
    icon: 'file',
    children: [
      { label: 'Proyectos CP', route: 'proyectos-cp' },
      { label: 'Proyectos FRCP', route: 'proyectos-frcp' }
    ]
  },
  { type: 'item', label: 'Alertas', route: 'alertas', icon: 'bell' },

  { type: 'item', label: 'Financiero', route: 'financiero', icon: 'wallet' },
  { type: 'item', label: 'PEI', route: 'pei', icon: 'document' },
  { type: 'item', label: 'Plan de accion', route: 'plan-accion', icon: 'checklist' },
  { type: 'item', label: 'Avances', route: 'avances', icon: 'trend' },

  {
    type: 'submenu',
    label: 'compromisos',
    icon: 'check',
    children: [
      { label: 'Pactos', route: 'compromisos-pactos' },
      { label: 'Proyectos', route: 'compromisos-proyectos' }
    ]
  },
  { type: 'item', label: 'Mapas', route: 'mapas', icon: 'map' },
  { type: 'item', label: 'Reportes', route: 'reportes', icon: 'chart' },
  { type: 'item', label: 'Tablero de mando', route: 'tablero-mando', icon: 'gauge' },
  { type: 'separator', label: 'Herramientas ' },
  {
    type: 'submenu',
    label: 'administracion',
    icon: 'settings',
    children: [
      { label: 'Pactos', route: 'gestion-pactos' },
      { label: 'Proyectos', route: 'gestion-proyectos' },
      { label: 'Contratos', route: 'gestion-contratos' }
    ]
  },
  {
    type: 'submenu',
    label: 'configuracion',
    icon: 'config',
    children: [
      { label: 'Roles', route: 'administracion' },
      { label: 'Actores', route: 'configuracion-actores' }
    ]
  },
  { type: 'item', label: 'Acerca de', route: 'acerca-de', icon: 'info' },
  { type: 'item', label: 'Ayudas', route: 'ayudas', icon: 'help' },
  { type: 'item', label: 'Salir', route: '/login', icon: 'logout', absolute: true }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, FooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  // Lista final de opciones que se envía al sidebar.
  menuItems = MENU_ITEMS;
  // Controla si el menú lateral está abierto en pantallas pequeñas.
  isSidebarOpen = false;
  // Guarda qué submenú está desplegado actualmente.
  activeSubmenu: string | null = null;
  currentYear = new Date().getFullYear();

  constructor(private readonly authService: AuthService) {}

  // Nombre de usuario que aparece en la barra superior.
  get sessionUserName(): string {
    return this.authService.getCurrentUser()?.username || 'Usuario SISPACTOS';
  }

  // Texto de rol o tipo de sesión del usuario actual.
  get sessionUserRole(): string {
    const mode = this.authService.getCurrentUser()?.mode;

    if (mode === 'guest') {
      return 'Usuario Invitado';
    }

    if (mode === 'local') {
      return 'Usuario Local';
    }

    return 'Sin sesion activa';
  }

  // Abre o cierra el menú lateral.
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Cierra únicamente el menú lateral.
  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  // Muestra/oculta el submenú seleccionado.
  toggleSubmenu(label: string): void {
    this.activeSubmenu = this.activeSubmenu === label ? null : label;
  }

  // Cierra menú lateral y cualquier submenú abierto.
  closeAllMenus(): void {
    this.isSidebarOpen = false;
    this.activeSubmenu = null;
  }
}
