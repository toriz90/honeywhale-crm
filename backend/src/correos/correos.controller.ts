import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CorreosService } from './correos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { EnviarCorreoDto } from './dto/enviar-correo.dto';

@Controller('correos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CorreosController {
  constructor(private readonly correosService: CorreosService) {}

  // Rate limit dedicado: máx 10 correos por minuto por agente.
  @Post('enviar')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  @HttpCode(HttpStatus.CREATED)
  enviar(
    @Body() dto: EnviarCorreoDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.correosService.enviarDesdeComposer(dto, usuario);
  }

  @Post('borrador')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  @HttpCode(HttpStatus.CREATED)
  guardarBorrador(
    @Body() dto: EnviarCorreoDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.correosService.guardarBorrador(dto, usuario);
  }

  @Get('lead/:leadId')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  listarPorLead(
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.correosService.listarPorLead(leadId, usuario);
  }
}
