import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getAvailablePermissions } from '../dashboard/dashboard.component';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

interface LocalUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface ExternalUser {
  id: number;
  name: string;
  email: string;
  pactos: string[];
  proyectos: string[];
  createdAt: Date;
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
  // Sistema de pestañas
  activeTab = 'roles';
  
  // Gestión de roles (contenido existente)
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
  newRolePermissions: string[] = [];
  
  availableModules = getAvailablePermissions();

  // Gestión de usuarios locales
  localUsers: LocalUser[] = [];
  newLocalUser: { name: string; email: string; role: string } = { name: '', email: '', role: '' };

  // Gestión de usuarios externos
  externalUsers: ExternalUser[] = [];
  newExternalUser: { name: string; email: string; pactos: string[]; proyectos: string[] } = { name: '', email: '', pactos: [], proyectos: [] };
  
  availablePactos = [
    'Pacto Norte de Santander',
    'Pacto Caribe',
    'Pacto Andino',
    'Pacto Amazónico',
    'Pacto Pacífico'
  ];
  
  availableProyectos = [
    'Infraestructura Vial',
    'Desarrollo Sostenible',
    'Educación Rural',
    'Salud Comunitaria',
    'Turismo Regional',
    'Agricultura Tecnificada'
  ];

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

  // Métodos para pestañas
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Métodos para gestión de roles (existentes)
  addRole(): void {
    const name = this.newRoleName.trim();
    const description = this.newRoleDescription.trim();

    if (!name || !description || this.newRolePermissions.length === 0) {
      return;
    }

    const nextId = this.roles.length ? Math.max(...this.roles.map((role) => role.id)) + 1 : 1;

    const permissions = this.newRolePermissions.map(permission => 
      this.getModuleLabel(permission)
    );

    this.roles = [
      ...this.roles,
      {
        id: nextId,
        name,
        description,
        permissions
      }
    ];

    this.newRoleName = '';
    this.newRoleDescription = '';
    this.newRolePermissions = [];
  }

  togglePermission(permission: string): void {
    const index = this.newRolePermissions.indexOf(permission);
    
    if (index > -1) {
      this.newRolePermissions = this.newRolePermissions.filter(p => p !== permission);
    } else {
      this.newRolePermissions = [...this.newRolePermissions, permission];
    }
  }

  removeRole(id: number): void {
    this.roles = this.roles.filter((role) => role.id !== id);
  }

  // Métodos para usuarios locales
  addLocalUser(): void {
    const { name, email, role } = this.newLocalUser;
    
    if (!name.trim() || !email.trim() || !role) {
      return;
    }

    const nextId = this.localUsers.length ? Math.max(...this.localUsers.map(u => u.id)) + 1 : 1;
    
    this.localUsers = [
      ...this.localUsers,
      {
        id: nextId,
        name: name.trim(),
        email: email.trim(),
        role,
        createdAt: new Date()
      }
    ];

    this.newLocalUser = { name: '', email: '', role: '' };
  }

  removeLocalUser(id: number): void {
    this.localUsers = this.localUsers.filter(user => user.id !== id);
  }

  // Métodos para usuarios externos
  addExternalUser(): void {
    const { name, email, pactos, proyectos } = this.newExternalUser;
    
    if (!name.trim() || !email.trim() || pactos.length === 0 || proyectos.length === 0) {
      return;
    }

    const nextId = this.externalUsers.length ? Math.max(...this.externalUsers.map(u => u.id)) + 1 : 1;
    
    this.externalUsers = [
      ...this.externalUsers,
      {
        id: nextId,
        name: name.trim(),
        email: email.trim(),
        pactos: [...pactos],
        proyectos: [...proyectos],
        createdAt: new Date()
      }
    ];

    this.newExternalUser = { name: '', email: '', pactos: [], proyectos: [] };
  }

  removeExternalUser(id: number): void {
    this.externalUsers = this.externalUsers.filter(user => user.id !== id);
  }

  toggleExternalPacto(pacto: string): void {
    const pactos = this.newExternalUser.pactos;
    const index = pactos.indexOf(pacto);
    
    if (index > -1) {
      this.newExternalUser.pactos = pactos.filter(p => p !== pacto);
    } else {
      this.newExternalUser.pactos = [...pactos, pacto];
    }
  }

  toggleExternalProyecto(proyecto: string): void {
    const proyectos = this.newExternalUser.proyectos;
    const index = proyectos.indexOf(proyecto);
    
    if (index > -1) {
      this.newExternalUser.proyectos = proyectos.filter(p => p !== proyecto);
    } else {
      this.newExternalUser.proyectos = [...proyectos, proyecto];
    }
  }

  editExternalUser(user: ExternalUser): void {
    // Para simplicidad, vamos a permitir editar in-place
    // En una implementación real, esto abriría un modal o formulario de edición
    console.log('Editar usuario:', user);
  }

  approveUser(id: number): void {
    this.pendingUsers = this.pendingUsers.filter((user) => user.id !== id);
  }

  rejectUser(id: number): void {
    this.pendingUsers = this.pendingUsers.filter((user) => user.id !== id);
  }

  private getModuleLabel(moduleValue: string): string {
    const module = this.availableModules.find(m => m.value === moduleValue);
    return module?.label ?? 'Módulo desconocido';
  }
}
