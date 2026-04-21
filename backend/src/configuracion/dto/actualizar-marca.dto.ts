import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ActualizarMarcaDto {
  @IsString()
  @MinLength(1, { message: 'El nombre de la tienda no puede estar vacío' })
  @MaxLength(120)
  nombreTienda!: string;

  @IsString()
  @MinLength(5, { message: 'El teléfono debe tener al menos 5 caracteres' })
  @MaxLength(40)
  telefonoTienda!: string;

  @IsEmail({}, { message: 'El email de contacto debe ser una dirección válida' })
  @MaxLength(255)
  emailContacto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionTienda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfcTienda?: string;

  // Permite cadena vacía para "borrar" el logo desde el form sin requerirlo.
  @IsOptional()
  @ValidateIf((_o, v) => typeof v === 'string' && v.length > 0)
  @IsUrl({}, { message: 'La URL del logo debe ser válida' })
  @MaxLength(500)
  logoUrl?: string;
}
