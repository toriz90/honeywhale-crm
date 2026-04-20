import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  nombre?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtUserPayload {
    if (!payload?.sub || !payload?.email || !payload?.rol) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      rol: payload.rol,
      nombre: payload.nombre,
    };
  }
}
