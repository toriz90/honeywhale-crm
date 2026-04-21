import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { CategoriaPlantilla } from '../plantilla.entity';

const TEMPERATURAS_PERMITIDAS = [
  'caliente',
  'tibio',
  'templado',
  'enfriandose',
  'frio',
  'congelado',
] as const;
export type TemperaturaFiltro = (typeof TEMPERATURAS_PERMITIDAS)[number];

function aBoolean(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (s === '1' || s === 'true') return true;
  if (s === '0' || s === 'false') return false;
  return undefined;
}

export class FiltrarPlantillasDto {
  @IsOptional()
  @Transform(({ value }) => aBoolean(value))
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsEnum(CategoriaPlantilla)
  categoria?: CategoriaPlantilla;

  @IsOptional()
  @IsIn(TEMPERATURAS_PERMITIDAS)
  temperatura?: TemperaturaFiltro;
}
