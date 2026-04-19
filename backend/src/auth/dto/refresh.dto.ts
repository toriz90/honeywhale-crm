import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  @IsJWT({ message: 'El refresh token no tiene un formato válido' })
  refreshToken!: string;
}
