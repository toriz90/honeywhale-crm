import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ConfiguracionService } from '../configuracion/configuracion.service';

const googleStrategyLogger = new Logger('GoogleStrategyFactory');

@Module({
  imports: [
    UsuariosModule,
    ConfiguracionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleAuthGuard,
    {
      provide: GoogleStrategy,
      useFactory: async (configuracionService: ConfiguracionService) => {
        try {
          const c = await configuracionService.obtenerDescifrada();
          if (
            !c.google_habilitado ||
            !c.google_client_id ||
            !c.google_client_secret ||
            !c.google_redirect_uri
          ) {
            googleStrategyLogger.warn(
              'Google OAuth no se registró (google_habilitado=false o faltan credenciales).',
            );
            return null;
          }
          googleStrategyLogger.log('Google OAuth registrado correctamente.');
          return new GoogleStrategy({
            clientID: c.google_client_id,
            clientSecret: c.google_client_secret,
            callbackURL: c.google_redirect_uri,
          });
        } catch (err) {
          const mensaje = err instanceof Error ? err.message : String(err);
          googleStrategyLogger.warn(
            `No se pudo inicializar Google OAuth: ${mensaje}`,
          );
          return null;
        }
      },
      inject: [ConfiguracionService],
    },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
