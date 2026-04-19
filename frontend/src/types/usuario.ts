import { Rol } from './auth';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo?: boolean;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  email?: string;
  password?: string;
  rol?: Rol;
  activo?: boolean;
}
