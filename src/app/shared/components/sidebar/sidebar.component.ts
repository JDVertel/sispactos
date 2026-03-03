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
}
