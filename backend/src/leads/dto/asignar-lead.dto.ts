import { IsUUID, ValidateIf } from 'class-validator';

export class AsignarLeadDto {
  @ValidateIf((_o, value) => value !== null)
  @IsUUID('4', {
    message: 'El id del usuario asignado debe ser un UUID válido o null',
  })
  asignado_a_id!: string | null;
}
