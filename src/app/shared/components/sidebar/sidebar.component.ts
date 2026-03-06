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
  @Input() menuItems: MenuItem[] = [];
  @Input() isSidebarOpen = false;
  @Input() activeSubmenu: string | null = null;
  @Input() sessionUserName = 'Usuario';
  @Input() sessionUserRole = 'Sin rol';

  @Output() toggleSidebarEvent = new EventEmitter<void>();
  @Output() toggleSubmenuEvent = new EventEmitter<string>();
  @Output() closeAllMenusEvent = new EventEmitter<void>();
  @Output() closeSidebarEvent = new EventEmitter<void>();

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  closeSidebar(): void {
    this.closeSidebarEvent.emit();
  }

  toggleSubmenu(label: string): void {
    this.toggleSubmenuEvent.emit(label);
  }

  closeAllMenus(): void {
    this.closeAllMenusEvent.emit();
  }

  get sessionUserInitial(): string {
    return this.sessionUserName.trim().charAt(0).toUpperCase() || 'U';
  }

  formatLabel(label: string): string {
    return label
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

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
      settings: 'bi-sliders',
      config: 'bi-gear',
      info: 'bi-info-circle',
      help: 'bi-question-circle',
      logout: 'bi-box-arrow-right'
    };

    return icons[icon] ?? 'bi-circle';
  }
}
