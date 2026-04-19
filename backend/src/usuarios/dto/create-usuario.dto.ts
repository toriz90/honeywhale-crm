import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum';

export class CreateUsuarioDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  nombre!: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password!: string;

  @IsEnum(Rol, { message: 'Rol inválido. Use ADMIN, SUPERVISOR o AGENTE' })
  rol!: Rol;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
