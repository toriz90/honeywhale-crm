import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsEnum(Rol, { message: 'Rol inválido. Use ADMIN, SUPERVISOR o AGENTE' })
  rol?: Rol;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
