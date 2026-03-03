import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Role, LocalUser, ExternalUser, PendingUser } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class RolesUsersService {
  private roles = new BehaviorSubject<Role[]>([]);
  private localUsers = new BehaviorSubject<LocalUser[]>([]);
  private externalUsers = new BehaviorSubject<ExternalUser[]>([]);
  private pendingUsers = new BehaviorSubject<PendingUser[]>([]);

  public roles$ = this.roles.asObservable();
  public localUsers$ = this.localUsers.asObservable();
  public externalUsers$ = this.externalUsers.asObservable();
  public pendingUsers$ = this.pendingUsers.asObservable();

  private availablePermissions = [
    { value: 'admin', label: 'Administrador' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'gestion-pactos', label: 'Gestión de Pactos' },
    { value: 'gestion-proyectos', label: 'Gestión de Proyectos' },
    { value: 'gestion-contratos', label: 'Gestión de Contratos' }
  ];

  constructor() {}

  // Roles
  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  addRole(role: Omit<Role, 'id'>): void {
    const currentRoles = this.roles.value;
    const nextId = currentRoles.length ? Math.max(...currentRoles.map(r => r.id)) + 1 : 1;
    
    this.roles.next([
      ...currentRoles,
      { id: nextId, ...role }
    ]);
  }

  removeRole(id: number): void {
    this.roles.next(this.roles.value.filter(r => r.id !== id));
  }

  // Local Users
  getLocalUsers(): Observable<LocalUser[]> {
    return this.localUsers$;
  }

  addLocalUser(user: Omit<LocalUser, 'id' | 'createdAt'>): void {
    const currentUsers = this.localUsers.value;
    const nextId = currentUsers.length ? Math.max(...currentUsers.map(u => u.id)) + 1 : 1;
    
    this.localUsers.next([
      ...currentUsers,
      { id: nextId, ...user, createdAt: new Date() }
    ]);
  }

  removeLocalUser(id: number): void {
    this.localUsers.next(this.localUsers.value.filter(u => u.id !== id));
  }

  // External Users
  getExternalUsers(): Observable<ExternalUser[]> {
    return this.externalUsers$;
  }

  addExternalUser(user: Omit<ExternalUser, 'id' | 'createdAt'>): void {
    const currentUsers = this.externalUsers.value;
    const nextId = currentUsers.length ? Math.max(...currentUsers.map(u => u.id)) + 1 : 1;
    
    this.externalUsers.next([
      ...currentUsers,
      { id: nextId, ...user, createdAt: new Date() }
    ]);
  }

  removeExternalUser(id: number): void {
    this.externalUsers.next(this.externalUsers.value.filter(u => u.id !== id));
  }

  updateExternalUser(id: number, user: Partial<Omit<ExternalUser, 'id' | 'createdAt'>>): void {
    const users = this.externalUsers.value.map(u =>
      u.id === id ? { ...u, ...user } : u
    );
    this.externalUsers.next(users);
  }

  // Pending Users
  getPendingUsers(): Observable<PendingUser[]> {
    return this.pendingUsers$;
  }

  approvePendingUser(id: number): void {
    this.pendingUsers.next(this.pendingUsers.value.filter(u => u.id !== id));
  }

  rejectPendingUser(id: number): void {
    this.pendingUsers.next(this.pendingUsers.value.filter(u => u.id !== id));
  }

  // Permissions
  getAvailablePermissions() {
    return this.availablePermissions;
  }

  getPermissionLabel(value: string): string {
    const permission = this.availablePermissions.find(p => p.value === value);
    return permission?.label ?? 'Permiso desconocido';
  }
}
