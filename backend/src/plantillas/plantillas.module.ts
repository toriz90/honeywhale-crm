import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plantilla } from './plantilla.entity';
import { Lead } from '../leads/lead.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { PlantillasService } from './plantillas.service';
import { PlantillasController } from './plantillas.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { RenderizadoService } from '../correos/renderizado.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plantilla, Lead, Usuario]),
    ConfiguracionModule,
  ],
  controllers: [PlantillasController],
  providers: [PlantillasService, RenderizadoService],
  exports: [PlantillasService, RenderizadoService],
})
export class PlantillasModule {}
