import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarAtribucionDto {
  @IsBoolean({
    message:
      'recuperadoPorAgente debe ser true (recuperación con agente) o false (orgánica)',
  })
  recuperadoPorAgente!: boolean;

  @IsOptional()
  @IsString({ message: 'notas debe ser texto' })
  @MaxLength(500, { message: 'notas no puede exceder 500 caracteres' })
  notas?: string;
}
