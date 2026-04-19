import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EtapaLead, Moneda } from '../enums/etapa-lead.enum';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(180)
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(30)
  telefono!: string;

  @IsString()
  @IsNotEmpty({ message: 'El producto es obligatorio' })
  @MaxLength(200)
  producto!: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser numérico con máximo 2 decimales' },
  )
  @Min(0, { message: 'El monto no puede ser negativo' })
  monto!: number;

  @IsOptional()
  @IsEnum(Moneda, { message: 'Moneda inválida. Use MXN o USD' })
  moneda?: Moneda;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  orden_woo_id?: string;

  @IsOptional()
  @IsEnum(EtapaLead, {
    message:
      'Etapa inválida. Use NUEVO, CONTACTADO, EN_NEGOCIACION, OFERTA_ENVIADA, RECUPERADO o PERDIDO',
  })
  etapa?: EtapaLead;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo_abandono?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El id del usuario asignado no es un UUID válido' })
  asignado_a_id?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
