import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesUsersService } from '../../core/services/roles-users.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Role, LocalUser, ExternalUser, PendingUser } from '../../shared/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.css'
})
export class AdminRolesComponent implements OnInit {
  activeTab = 'roles';

  roles$: Observable<Role[]>;
  localUsers$: Observable<LocalUser[]>;
  externalUsers$: Observable<ExternalUser[]>;
  pendingUsers$: Observable<PendingUser[]>;

  newRoleName = '';
  newRoleDescription = '';
  newRolePermissions: string[] = [];
  
  newLocalUser: Omit<LocalUser, 'id' | 'createdAt'> = {
    name: '',
    email: '',
    role: '',
    pactos: [],
    proyectos: [],
    contratos: []
  };

  newExternalUser: Omit<ExternalUser, 'id' | 'createdAt'> = {
    name: '',
    email: '',
    entidadResponsable: '',
    pactos: [],
    proyectos: [],
    contratos: []
  };

  availablePactos: string[] = [];
  availableProyectos: string[] = [];
  availableContratos: string[] = [];
  availableModules: Array<{ value: string; label: string }> = [];

  constructor(
    private rolesUsersService: RolesUsersService,
    private dashboardService: DashboardService
  ) {
    this.roles$ = this.rolesUsersService.getRoles();
    this.localUsers$ = this.rolesUsersService.getLocalUsers();
    this.externalUsers$ = this.rolesUsersService.getExternalUsers();
    this.pendingUsers$ = this.rolesUsersService.getPendingUsers();
  }

  ngOnInit(): void {
    this.availableModules = this.dashboardService.getAvailablePermissions();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  addRole(): void {
    const name = this.newRoleName.trim();
    const description = this.newRoleDescription.trim();

    if (!name || !description || this.newRolePermissions.length === 0) {
      return;
    }

    const permissions = this.newRolePermissions.map(permission => 
      this.dashboardService.getAvailablePermissions().find(p => p.value === permission)?.label || permission
    );

    this.rolesUsersService.addRole({
      name,
      description,
      permissions
    });

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
    this.rolesUsersService.removeRole(id);
  }

  addLocalUser(): void {
    const { name, email, role } = this.newLocalUser;
    
    if (!name.trim() || !email.trim() || !role) {
      return;
    }

    this.rolesUsersService.addLocalUser(this.newLocalUser);
    this.newLocalUser = {
      name: '',
      email: '',
      role: '',
      pactos: [],
      proyectos: [],
      contratos: []
    };
  }

  removeLocalUser(id: number): void {
    this.rolesUsersService.removeLocalUser(id);
  }

  addExternalUser(): void {
    const { name, email, entidadResponsable } = this.newExternalUser;
    
    if (!name.trim() || !email.trim() || !entidadResponsable.trim()) {
      return;
    }

    this.rolesUsersService.addExternalUser(this.newExternalUser);
    this.newExternalUser = {
      name: '',
      email: '',
      entidadResponsable: '',
      pactos: [],
      proyectos: [],
      contratos: []
    };
  }

  removeExternalUser(id: number): void {
    this.rolesUsersService.removeExternalUser(id);
  }

  approveUser(id: number): void {
    this.rolesUsersService.approvePendingUser(id);
  }

  rejectUser(id: number): void {
    this.rolesUsersService.rejectPendingUser(id);
  }

  toggleLocalPacto(pacto: string): void {
    const index = this.newLocalUser.pactos.indexOf(pacto);
    if (index > -1) {
      this.newLocalUser.pactos = this.newLocalUser.pactos.filter(p => p !== pacto);
    } else {
      this.newLocalUser.pactos = [...this.newLocalUser.pactos, pacto];
    }
  }

  toggleLocalProyecto(proyecto: string): void {
    const index = this.newLocalUser.proyectos.indexOf(proyecto);
    if (index > -1) {
      this.newLocalUser.proyectos = this.newLocalUser.proyectos.filter(p => p !== proyecto);
    } else {
      this.newLocalUser.proyectos = [...this.newLocalUser.proyectos, proyecto];
    }
  }

  toggleLocalContrato(contrato: string): void {
    const index = this.newLocalUser.contratos.indexOf(contrato);
    if (index > -1) {
      this.newLocalUser.contratos = this.newLocalUser.contratos.filter(c => c !== contrato);
    } else {
      this.newLocalUser.contratos = [...this.newLocalUser.contratos, contrato];
    }
  }

  toggleExternalPacto(pacto: string): void {
    const index = this.newExternalUser.pactos.indexOf(pacto);
    if (index > -1) {
      this.newExternalUser.pactos = this.newExternalUser.pactos.filter(p => p !== pacto);
    } else {
      this.newExternalUser.pactos = [...this.newExternalUser.pactos, pacto];
    }
  }

  toggleExternalProyecto(proyecto: string): void {
    const index = this.newExternalUser.proyectos.indexOf(proyecto);
    if (index > -1) {
      this.newExternalUser.proyectos = this.newExternalUser.proyectos.filter(p => p !== proyecto);
    } else {
      this.newExternalUser.proyectos = [...this.newExternalUser.proyectos, proyecto];
    }
  }

  toggleExternalContrato(contrato: string): void {
    const index = this.newExternalUser.contratos.indexOf(contrato);
    if (index > -1) {
      this.newExternalUser.contratos = this.newExternalUser.contratos.filter(c => c !== contrato);
    } else {
      this.newExternalUser.contratos = [...this.newExternalUser.contratos, contrato];
    }
  }
}
