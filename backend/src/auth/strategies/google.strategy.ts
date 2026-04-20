import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';

export interface GooglePerfilValidado {
  email: string;
  nombre: string;
  googleId: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(options: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  }) {
    const opts: StrategyOptions = {
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL,
      scope: ['email', 'profile'],
    };
    super(opts);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: GooglePerfilValidado | false) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new UnauthorizedException('Google no devolvió un email'), false);
      return;
    }
    const usuario: GooglePerfilValidado = {
      email,
      nombre: profile.displayName ?? email,
      googleId: profile.id,
    };
    done(null, usuario);
  }
}
