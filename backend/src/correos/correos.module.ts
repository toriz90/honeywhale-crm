import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorreoEnviado } from './correo-enviado.entity';
import { TrackingEvento } from './tracking-evento.entity';
import { Lead } from '../leads/lead.entity';
import { Plantilla } from '../plantillas/plantilla.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { CorreosService } from './correos.service';
import { RenderizadoService } from './renderizado.service';
import { EmailSenderService } from './email-sender.service';
import { CorreosController } from './correos.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { PlantillasService } from '../plantillas/plantillas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CorreoEnviado,
      TrackingEvento,
      Lead,
      Plantilla,
      Usuario,
    ]),
    ConfiguracionModule,
  ],
  controllers: [CorreosController],
  providers: [
    CorreosService,
    RenderizadoService,
    EmailSenderService,
    PlantillasService,
  ],
  exports: [CorreosService, RenderizadoService, EmailSenderService],
})
export class CorreosModule {}
