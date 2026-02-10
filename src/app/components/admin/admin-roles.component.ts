import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

interface PendingUser {
  id: number;
  name: string;
  email: string;
  requestedRole: string;
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.css'
})
export class AdminRolesComponent {
  roles: Role[] = [
    {
      id: 1,
      name: 'Administrador',
      description: 'Acceso completo a configuracion y seguridad.',
      permissions: ['Usuarios', 'Roles', 'Reportes']
    },
    {
      id: 2,
      name: 'Analista',
      description: 'Acceso a informes y seguimiento de proyectos.',
      permissions: ['Reportes', 'Proyectos', 'Avances']
    },
    {
      id: 3,
      name: 'Consulta',
      description: 'Solo lectura para informacion general.',
      permissions: ['Dashboard', 'Mapas']
    }
  ];

  newRoleName = '';
  newRoleDescription = '';
  newRoleType = 'administrador';
  newRoleModule = 'proyectos';

  pendingUsers: PendingUser[] = [
    {
      id: 1,
      name: 'Laura Herrera',
      email: 'laura.herrera@sispactos.co',
      requestedRole: 'Colaborador'
    },
    {
      id: 2,
      name: 'Jorge Diaz',
      email: 'jorge.diaz@sispactos.co',
      requestedRole: 'Registrado'
    },
    {
      id: 3,
      name: 'Ana Perez',
      email: 'ana.perez@sispactos.co',
      requestedRole: 'Visitante'
    }
  ];

  addRole(): void {
    const name = this.newRoleName.trim() || this.newRoleType;
    const description = this.newRoleDescription.trim();

    if (!name || !description) {
      return;
    }

    const nextId = this.roles.length ? Math.max(...this.roles.map((role) => role.id)) + 1 : 1;

    this.roles = [
      ...this.roles,
      {
        id: nextId,
        name,
        description,
        permissions: [this.getModuleLabel(this.newRoleModule)]
      }
    ];

    this.newRoleName = '';
    this.newRoleDescription = '';
    this.newRoleModule = 'proyectos';
  }

  removeRole(id: number): void {
    this.roles = this.roles.filter((role) => role.id !== id);
  }

  approveUser(id: number): void {
    this.pendingUsers = this.pendingUsers.filter((user) => user.id !== id);
  }

  rejectUser(id: number): void {
    this.pendingUsers = this.pendingUsers.filter((user) => user.id !== id);
  }

  private getModuleLabel(moduleValue: string): string {
    const labels: Record<string, string> = {
      proyectos: 'Proyectos',
      financiero: 'Financiero',
      mapas: 'Mapas',
      reportes: 'Reportes'
    };

    return labels[moduleValue] ?? 'Modulo';
  }
}
