import { IsEnum } from 'class-validator';
import { EtapaLead } from '../enums/etapa-lead.enum';

export class CambiarEtapaDto {
  @IsEnum(EtapaLead, {
    message:
      'Etapa inválida. Use NUEVO, CONTACTADO, EN_NEGOCIACION, OFERTA_ENVIADA, RECUPERADO o PERDIDO',
  })
  etapa!: EtapaLead;
}
