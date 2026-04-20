import { Logger, Module, OnModuleInit } from '@nestjs/common';
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
  providers: [AuthService, JwtStrategy, GoogleAuthGuard],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger('GoogleStrategyFactory');

  constructor(private readonly configuracionService: ConfiguracionService) {}

  // Se registra en onModuleInit (y no como useFactory) a propósito:
  // un useFactory corre durante la fase de instanciación de providers,
  // ANTES de que CryptoService.onModuleInit haya inicializado la llave
  // AES. Si se invoca obtenerDescifrada() en ese momento, el decipher
  // recibe key=undefined y crashea con "key argument must be of type
  // string…". En onModuleInit de AuthModule, todos los módulos ya
  // pasaron su onModuleInit, por lo que CryptoService está listo.
  async onModuleInit(): Promise<void> {
    let config;
    try {
      config = await this.configuracionService.obtenerDescifrada();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `No se pudo leer la configuración para Google OAuth: ${mensaje}. La estrategia no se registró.`,
      );
      return;
    }

    if (!config.google_habilitado) {
      this.logger.warn(
        'Google OAuth deshabilitado (google_habilitado=false); no se registra la estrategia.',
      );
      return;
    }

    const faltantes: string[] = [];
    if (!esStringNoVacio(config.google_client_id)) {
      faltantes.push('google_client_id');
    }
    if (!esStringNoVacio(config.google_client_secret)) {
      faltantes.push('google_client_secret');
    }
    if (!esStringNoVacio(config.google_redirect_uri)) {
      faltantes.push('google_redirect_uri');
    }
    if (faltantes.length > 0) {
      this.logger.warn(
        `Google OAuth no se registró: faltan campos obligatorios en la tabla configuracion: ${faltantes.join(', ')}`,
      );
      return;
    }

    try {
      // Instanciar GoogleStrategy tiene efecto secundario:
      // PassportStrategy mixin llama a passport.use('google', this).
      new GoogleStrategy({
        clientID: config.google_client_id as string,
        clientSecret: config.google_client_secret as string,
        callbackURL: config.google_redirect_uri as string,
      });
      this.logger.log('Google OAuth registrado correctamente.');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `No se pudo inicializar Google OAuth: ${mensaje}`,
      );
    }
  }
}

function esStringNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}
