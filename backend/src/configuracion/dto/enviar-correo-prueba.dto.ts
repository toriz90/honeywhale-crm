import { IsEmail, MaxLength } from 'class-validator';

export class EnviarCorreoPruebaDto {
  @IsEmail({}, { message: 'El destinatario debe ser un email válido' })
  @MaxLength(180)
  destinatario!: string;
}
