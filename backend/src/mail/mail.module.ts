import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [ConfiguracionModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
