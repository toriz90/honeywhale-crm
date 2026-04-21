import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EnviarCorreoDto {
  @IsUUID('4', { message: 'leadId debe ser un UUID válido' })
  leadId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'plantillaId debe ser un UUID válido' })
  plantillaId?: string;

  @IsString()
  @MinLength(1, { message: 'El asunto no puede estar vacío' })
  @MaxLength(255, { message: 'El asunto no puede exceder 255 caracteres' })
  asunto!: string;

  @IsString()
  @MinLength(1, { message: 'El cuerpo HTML no puede estar vacío' })
  cuerpoHtml!: string;

  @IsOptional()
  @IsString()
  cuerpoTexto?: string;
}
