export type Rol = 'ADMIN' | 'SUPERVISOR' | 'AGENTE';

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  usuario: UsuarioAuth;
}

export interface LoginPayload {
  email: string;
  password: string;
}
