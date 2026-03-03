export interface LocalUser {
  id: number;
  name: string;
  email: string;
  role: string;
  pactos: string[];
  proyectos: string[];
  contratos: string[];
  createdAt: Date;
}

export interface ExternalUser {
  id: number;
  name: string;
  email: string;
  entidadResponsable: string;
  pactos: string[];
  proyectos: string[];
  contratos: string[];
  createdAt: Date;
}

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  requestedRole: string;
}
