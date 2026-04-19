import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), UsuariosModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService, TypeOrmModule],
})
export class LeadsModule {}
