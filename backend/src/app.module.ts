import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { MailModule } from './mail/mail.module';
import { WoocommerceModule } from './woocommerce/woocommerce.module';
import { PlantillasModule } from './plantillas/plantillas.module';
import { CorreosModule } from './correos/correos.module';
import { typeOrmOptions } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        ...typeOrmOptions,
        host: config.get<string>('DB_HOST') ?? typeOrmOptions.host,
        port: Number(config.get<string>('DB_PORT') ?? 3306),
        username: config.get<string>('DB_USER') ?? 'honeywhale',
        password: config.get<string>('DB_PASSWORD') ?? '',
        database: config.get<string>('DB_NAME') ?? 'honeywhale_crm',
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CryptoModule,
    AuthModule,
    UsuariosModule,
    LeadsModule,
    DashboardModule,
    ConfiguracionModule,
    MailModule,
    WoocommerceModule,
    PlantillasModule,
    CorreosModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
