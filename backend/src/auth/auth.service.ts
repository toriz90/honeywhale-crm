import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuario.entity';
import { GooglePerfilValidado } from './strategies/google.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

interface JwtBasePayload {
  sub: string;
  email: string;
  rol: string;
  nombre: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<Usuario> {
    const usuario = await this.usuariosService.findByEmailWithPassword(email);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return usuario;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const usuario = await this.validateUser(email, password);
    return this.generarTokens(usuario);
  }

  async loginConGoogle(perfil: GooglePerfilValidado): Promise<TokenPair> {
    const usuario = await this.usuariosService.findByEmailActivo(perfil.email);
    if (!usuario) {
      throw new ForbiddenException(
        'Este correo de Google no está autorizado en el CRM. Contacta al administrador para que te dé de alta.',
      );
    }
    return this.generarTokens(usuario);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new UnauthorizedException('Configuración de refresh inválida');
    }

    let payload: JwtBasePayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtBasePayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const usuario = await this.usuariosService.findOne(payload.sub);
    if (!usuario.activo) {
      throw new UnauthorizedException('El usuario no está activo');
    }
    return this.generarTokens(usuario);
  }

  logout(): { mensaje: string } {
    return { mensaje: 'Sesión cerrada correctamente' };
  }

  private async generarTokens(usuario: Usuario): Promise<TokenPair> {
    const payload: JwtBasePayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    const accessSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException('Configuración JWT incompleta');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}
