import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EtapaLead } from '../enums/etapa-lead.enum';

export const COLUMNAS_ORDEN_PERMITIDAS = [
  'created_at',
  'updated_at',
  'monto',
  'nombre',
  'etapa',
] as const;
export type ColumnaOrdenLead = (typeof COLUMNAS_ORDEN_PERMITIDAS)[number];

export class FiltrarLeadsDto {
  @IsOptional()
  @IsEnum(EtapaLead, { message: 'Etapa inválida' })
  etapa?: EtapaLead;

  @IsOptional()
  @IsUUID('4', { message: 'asignado_a_id debe ser un UUID válido' })
  asignado_a_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1)
  @Max(100, { message: 'limit no puede superar 100' })
  limit?: number = 20;

  @IsOptional()
  @IsIn(COLUMNAS_ORDEN_PERMITIDAS, {
    message: `orderBy inválido. Permitidos: ${COLUMNAS_ORDEN_PERMITIDAS.join(', ')}`,
  })
  orderBy?: ColumnaOrdenLead = 'created_at';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'order debe ser ASC o DESC' })
  order?: 'ASC' | 'DESC' = 'DESC';
}
