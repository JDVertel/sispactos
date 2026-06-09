import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionStore } from '../../core/store/auth-session.store';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { SidebarComponent, type MenuItem } from '../../shared/components/sidebar/sidebar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoginComponent } from '../auth/login.component';
import { TextScaleControlComponent } from '../../shared/components/text-scale-control/text-scale-control.component';
import { DASHBOARD_PATHS_REQUIRING_SESSION } from '../../core/auth/route-access.policy';
import { formatUiLabel } from '../../shared/utils/ui-label.util';

const PROTECTED_ROUTES = DASHBOARD_PATHS_REQUIRING_SESSION;

const RESTRICTED_MENU_SEPARATORS = new Set(['Administración', 'Gestión externa']);
const RESTRICTED_MENU_SUBMENUS = new Set(['Gestión', 'configuracion', 'gestion-externa']);

const MENU_ITEMS: MenuItem[] = [
  // Menú principal que alimenta la navegación del panel.
  { type: 'item', label: 'Home', route: 'home', icon: 'home' },
  { type: 'item', label: 'Pactos territoriales', route: 'pactos-territoriales', icon: 'pin' },
  {
    type: 'submenu',
    label: 'proyectos',
    icon: 'folder',
    children: [
      { label: 'Proyectos nación territorio', route: 'proyectos-nacion-territorio' },
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
  { type: 'item', label: 'Acerca de', route: 'acerca-de', icon: 'info' },
  { type: 'item', label: 'Ayudas', route: 'ayudas', icon: 'help' },
  { type: 'separator', label: 'Administración' },
  {
    type: 'submenu',
    label: 'Gestión',
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
      { label: 'Actores', route: 'configuracion-actores' },
      { label: 'Parámetros', route: 'parametros' }
    ]
  },
  { type: 'separator', label: 'Gestión externa' },
  {
    type: 'submenu',
    label: 'gestion-externa',
    icon: 'file',
    children: [{ label: 'Contratos', route: 'gestion-externa-contratos' }]
  },
  { type: 'separator', label: 'Sesion' },
  // Agrupado bajo “Sesión” para modo invitado.
  { type: 'item', label: 'Iniciar sesión', route: 'home', icon: 'user', action: 'open-login-modal' },
  { type: 'item', label: 'Cerrar sesión', route: 'home', icon: 'logout', action: 'logout' },
  { type: 'item', label: 'Salir', route: 'home', icon: 'logout', action: 'logout' }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    FooterComponent,
    LoginComponent,
    TextScaleControlComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  private authPromptSub?: Subscription;
  private sessionSub?: Subscription;
  // Controla si el menú lateral está abierto en pantallas pequeñas.
  isSidebarOpen = false;
  // Guarda qué submenú está desplegado actualmente.
  activeSubmenu: string | null = null;
  currentYear = new Date().getFullYear();
  showLoginModal = false;
  showUserMenu = false;

  constructor(
    private readonly authService: AuthService,
    private readonly authPromptService: AuthPromptService,
    private readonly authSessionStore: AuthSessionStore,
    private readonly router: Router
  ) {
    this.refreshMenuItems();
    this.authPromptSub = this.authPromptService.loginRequested$.subscribe(() => {
      this.openLoginModal();
    });
  }

  ngOnInit(): void {
    this.sessionSub = this.authSessionStore.session$.subscribe(() => {
      this.refreshMenuItems();
    });
    // Reaplica visibilidad tras hidratar sesión desde localStorage.
    this.refreshMenuItems();
    if (this.authService.hasValidUserSession()) {
      this.authService.ensureSessionKeepalive();
    }
  }

  ngOnDestroy(): void {
    this.authPromptSub?.unsubscribe();
    this.sessionSub?.unsubscribe();
  }

  private formatMenuLabel(label: string): string {
    return formatUiLabel(label);
  }

  // Nombre de usuario que aparece en la barra superior.
  get sessionUserName(): string {
    return this.authService.getCurrentUser()?.username || 'Usuario SISPACTOS';
  }

  get hasAuthenticatedSession(): boolean {
    return this.authService.hasValidUserSession();
  }

  // Texto de rol o tipo de sesión del usuario actual.
  get sessionUserRole(): string {
    if (!this.hasAuthenticatedSession) {
      return 'Invitado';
    }
    return this.authService.getSessionRoleLabel();
  }

  /** Sesión con rol administrador (sombreado amarillo en navbar). */
  get isAdministratorSession(): boolean {
    return this.authService.isAdministratorSession();
  }

  // Abre o cierra el menú lateral.
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Cierra únicamente el menú lateral.
  closeSidebar(): void {
    this.isSidebarOpen = false;
    this.activeSubmenu = null;
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

  // Abre/cierra el modal donde se renderiza el módulo de login.
  openLoginModal(): void {
    this.showUserMenu = false;
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  onLoginSuccess(): void {
    this.closeLoginModal();
    this.refreshMenuItems();
  }

  onSidebarAction(action: 'open-login-modal' | 'logout' | 'logout-and-open-login'): void {
    if (action === 'open-login-modal') {
      this.closeAllMenus();
      this.showUserMenu = false;
      this.openLoginModal();
      return;
    }

    if (action === 'logout' || action === 'logout-and-open-login') {
      this.authService.logout();
      this.closeAllMenus();
      this.showUserMenu = false;
      this.router.navigateByUrl('/dashboard/home');
      if (action === 'logout-and-open-login') {
        this.openLoginModal();
      } else {
        this.closeLoginModal();
      }
      this.refreshMenuItems();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  logoutFromTopbar(): void {
    this.onSidebarAction('logout');
  }

  exitFromTopbar(): void {
    this.onSidebarAction('logout-and-open-login');
  }

  private isRestrictedItemForGuest(item: MenuItem): boolean {
    if (item.type !== 'item') {
      return false;
    }

    if (item.label === 'Salir') {
      return true;
    }

    return item.action === 'logout';
  }

  private isGuestOnlyItem(item: MenuItem): boolean {
    return item.type === 'item' && item.action === 'open-login-modal';
  }

  private applySessionVisibilityRules(item: MenuItem, canAccessProtectedModules: boolean): boolean {
    if (item.type === 'separator' && this.formatMenuLabel(item.label) === 'Sesion') {
      // El separador “Sesión” se muestra siempre para agrupar acciones (login/logout).
      return true;
    }

    if (canAccessProtectedModules && this.isGuestOnlyItem(item)) {
      return false;
    }

    if (!canAccessProtectedModules && this.isRestrictedItemForGuest(item)) {
      return false;
    }

    return true;
  }

  private refreshMenuItems(): void {
    const canAccessProtectedModules = this.authService.hasValidUserSession();

    this.menuItems = MENU_ITEMS
      .map((item) => {
        if (item.type !== 'submenu') {
          return item;
        }

        const children = item.children.filter((child) => {
          return canAccessProtectedModules || !PROTECTED_ROUTES.has(child.route);
        });

        return { ...item, children };
      })
      .filter((item) => {
        if (!this.applySessionVisibilityRules(item, canAccessProtectedModules)) {
          return false;
        }

        if (item.type === 'item') {
          return canAccessProtectedModules || !PROTECTED_ROUTES.has(item.route);
        }

        if (item.type === 'submenu') {
          if (!canAccessProtectedModules && RESTRICTED_MENU_SUBMENUS.has(item.label)) {
            return false;
          }

          return item.children.length > 0;
        }

        return canAccessProtectedModules || !RESTRICTED_MENU_SEPARATORS.has(this.formatMenuLabel(item.label));
      });
  }
}
