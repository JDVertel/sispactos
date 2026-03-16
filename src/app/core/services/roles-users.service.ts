import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Role, LocalUser, ExternalUser, PendingUser } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class RolesUsersService {
  // Listas en memoria para roles y tipos de usuario.
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

  // Entrega la lista de roles disponibles.
  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  // Crea un rol nuevo y le asigna ID consecutivo.
  addRole(role: Omit<Role, 'id'>): void {
    const currentRoles = this.roles.value;
    const nextId = currentRoles.length ? Math.max(...currentRoles.map(r => r.id)) + 1 : 1;
    
    this.roles.next([
      ...currentRoles,
      { id: nextId, ...role }
    ]);
  }

  // Elimina un rol por su ID.
  removeRole(id: number): void {
    this.roles.next(this.roles.value.filter(r => r.id !== id));
  }

  // Entrega la lista de usuarios locales.
  getLocalUsers(): Observable<LocalUser[]> {
    return this.localUsers$;
  }

  // Crea un usuario local y guarda fecha de creación.
  addLocalUser(user: Omit<LocalUser, 'id' | 'createdAt'>): void {
    const currentUsers = this.localUsers.value;
    const nextId = currentUsers.length ? Math.max(...currentUsers.map(u => u.id)) + 1 : 1;
    
    this.localUsers.next([
      ...currentUsers,
      { id: nextId, ...user, createdAt: new Date() }
    ]);
  }

  // Elimina un usuario local.
  removeLocalUser(id: number): void {
    this.localUsers.next(this.localUsers.value.filter(u => u.id !== id));
  }

  // Entrega la lista de usuarios externos.
  getExternalUsers(): Observable<ExternalUser[]> {
    return this.externalUsers$;
  }

  // Crea un usuario externo y guarda fecha de creación.
  addExternalUser(user: Omit<ExternalUser, 'id' | 'createdAt'>): void {
    const currentUsers = this.externalUsers.value;
    const nextId = currentUsers.length ? Math.max(...currentUsers.map(u => u.id)) + 1 : 1;
    
    this.externalUsers.next([
      ...currentUsers,
      { id: nextId, ...user, createdAt: new Date() }
    ]);
  }

  // Elimina un usuario externo.
  removeExternalUser(id: number): void {
    this.externalUsers.next(this.externalUsers.value.filter(u => u.id !== id));
  }

  // Actualiza campos de un usuario externo existente.
  updateExternalUser(id: number, user: Partial<Omit<ExternalUser, 'id' | 'createdAt'>>): void {
    const users = this.externalUsers.value.map(u =>
      u.id === id ? { ...u, ...user } : u
    );
    this.externalUsers.next(users);
  }

  // Entrega el listado de usuarios pendientes de revisión.
  getPendingUsers(): Observable<PendingUser[]> {
    return this.pendingUsers$;
  }

  // Aprueba una solicitud pendiente quitándola de la cola.
  approvePendingUser(id: number): void {
    this.pendingUsers.next(this.pendingUsers.value.filter(u => u.id !== id));
  }

  // Rechaza una solicitud pendiente quitándola de la cola.
  rejectPendingUser(id: number): void {
    this.pendingUsers.next(this.pendingUsers.value.filter(u => u.id !== id));
  }

  // Devuelve los permisos que se pueden asignar.
  getAvailablePermissions() {
    return this.availablePermissions;
  }

  // Busca la etiqueta legible de un permiso por su valor.
  getPermissionLabel(value: string): string {
    const permission = this.availablePermissions.find(p => p.value === value);
    return permission?.label ?? 'Permiso desconocido';
  }
}
