import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarConfiguracionDto {
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(180)
  smtp_host?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'smtp_port debe ser entero' })
  @Min(1, { message: 'smtp_port debe ser mayor a 0' })
  @Max(65535, { message: 'smtp_port debe ser menor a 65536' })
  smtp_port?: number;

  @IsOptional()
  @IsBoolean()
  smtp_secure?: boolean;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(180)
  smtp_user?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  smtp_password?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsEmail({}, { message: 'smtp_from_email debe ser un email válido' })
  @MaxLength(180)
  smtp_from_email?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  smtp_from_nombre?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(255)
  google_client_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  google_client_secret?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsUrl({}, { message: 'google_redirect_uri debe ser una URL válida' })
  @MaxLength(255)
  google_redirect_uri?: string | null;

  @IsOptional()
  @IsBoolean()
  google_habilitado?: boolean;
}
