import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EtapaLead, Moneda } from '../enums/etapa-lead.enum';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  producto?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser numérico con máximo 2 decimales' },
  )
  @Min(0, { message: 'El monto no puede ser negativo' })
  monto?: number;

  @IsOptional()
  @IsEnum(Moneda, { message: 'Moneda inválida. Use MXN o USD' })
  moneda?: Moneda;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(60)
  orden_woo_id?: string | null;

  @IsOptional()
  @IsEnum(EtapaLead, { message: 'Etapa inválida' })
  etapa?: EtapaLead;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(255)
  motivo_abandono?: string | null;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID('4', { message: 'El id del usuario asignado no es un UUID válido' })
  asignado_a_id?: string | null;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  notas?: string | null;
}
