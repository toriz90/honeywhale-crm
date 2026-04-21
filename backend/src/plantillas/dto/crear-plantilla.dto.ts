import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CategoriaPlantilla } from '../plantilla.entity';

const TEMPERATURAS_PERMITIDAS = [
  'caliente',
  'tibio',
  'templado',
  'enfriandose',
  'frio',
  'congelado',
] as const;

export class CrearPlantillaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  asunto!: string;

  @IsString()
  @MinLength(1)
  cuerpo_html!: string;

  @IsOptional()
  @IsString()
  cuerpo_texto?: string;

  @IsOptional()
  @IsEnum(CategoriaPlantilla)
  categoria?: CategoriaPlantilla;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(TEMPERATURAS_PERMITIDAS, { each: true })
  temperaturas_recomendadas?: string[];

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
