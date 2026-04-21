import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import {
  MetricasMensualesQueryDto,
  UltimosMesesQueryDto,
} from './dto/metricas-mensuales.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  obtenerKPIs(@CurrentUser() usuario: JwtUserPayload) {
    return this.dashboardService.obtenerKPIs(usuario);
  }

  @Get('metricas-mensuales')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  obtenerMetricasMensuales(@Query() query: MetricasMensualesQueryDto) {
    return this.dashboardService.obtenerMetricasMensuales(
      query.year,
      query.month,
    );
  }

  @Get('metricas-ultimos-meses')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  obtenerMetricasUltimosMeses(@Query() query: UltimosMesesQueryDto) {
    return this.dashboardService.obtenerMetricasUltimosMeses(query.n ?? 6);
  }

  @Get('export-excel')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  async exportarExcel(
    @Query() query: MetricasMensualesQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.dashboardService.generarExcelMensual(
      query.year,
      query.month,
    );
    const mm = String(query.month).padStart(2, '0');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="honeywhale-crm-${query.year}-${mm}.xlsx"`,
    );
    res.send(buffer);
  }
}
