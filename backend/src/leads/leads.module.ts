import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { EventoRecuperacion } from './evento-recuperacion.entity';
import { CorreoEnviado } from '../correos/correo-enviado.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsArchiveService } from './leads-archive.service';
import { RecuperacionService } from './recuperacion.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, EventoRecuperacion, CorreoEnviado]),
    UsuariosModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsArchiveService, RecuperacionService],
  exports: [LeadsService, RecuperacionService, TypeOrmModule],
})
export class LeadsModule {}
