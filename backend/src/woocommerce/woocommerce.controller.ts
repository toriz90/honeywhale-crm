import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { WoocommerceService } from './woocommerce.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';

@Controller('woocommerce')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class WoocommerceController {
  constructor(
    private readonly woocommerceService: WoocommerceService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  @Post('probar-conexion')
  @HttpCode(HttpStatus.OK)
  probarConexion() {
    return this.woocommerceService.probarConexion();
  }

  @Post('sync-manual')
  @HttpCode(HttpStatus.OK)
  syncManual() {
    return this.woocommerceService.sincronizar(null);
  }

  @Post('reparar-leads-woocommerce')
  @HttpCode(HttpStatus.OK)
  repararLeads() {
    return this.woocommerceService.repararLeadsExistentes();
  }

  @Get('estado')
  async estado() {
    const creds =
      await this.configuracionService.obtenerCredencialesWoocommerce();
    return {
      habilitado: creds.habilitado,
      ultimaSync: creds.ultimaSync,
      urlConfigurada: !!creds.url,
    };
  }
}
