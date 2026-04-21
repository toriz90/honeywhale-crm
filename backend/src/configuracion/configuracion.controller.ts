import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';
import { ActualizarMarcaDto } from './dto/actualizar-marca.dto';
import { EnviarCorreoPruebaDto } from './dto/enviar-correo-prueba.dto';

@Controller('configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get()
  obtener() {
    return this.service.obtenerParaUI();
  }

  @Patch()
  actualizar(
    @Body() dto: ActualizarConfiguracionDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.service.actualizar(dto, usuario);
  }

  // El bloque "Marca" lo puede tocar también SUPERVISOR — el ADMIN se reserva
  // para datos sensibles (SMTP, OAuth, WC). Override del @Roles del @Controller.
  @Patch('marca')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  actualizarMarca(
    @Body() dto: ActualizarMarcaDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.service.actualizarMarca(dto, usuario);
  }

  @Post('probar-smtp')
  @HttpCode(HttpStatus.OK)
  probarSmtp() {
    return this.service.probarSmtp();
  }

  @Post('enviar-correo-prueba')
  @HttpCode(HttpStatus.OK)
  enviarCorreoPrueba(@Body() dto: EnviarCorreoPruebaDto) {
    return this.service.enviarCorreoPrueba(dto.destinatario);
  }
}
