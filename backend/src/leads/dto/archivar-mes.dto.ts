import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ArchivarMesDto {
  @Type(() => Number)
  @IsInt({ message: 'year debe ser entero' })
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt({ message: 'month debe ser entero' })
  @Min(1)
  @Max(12)
  month!: number;
}

export class ListarArchivadosQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;
}
