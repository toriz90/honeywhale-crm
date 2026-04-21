import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CambiarEtapaDto } from './dto/cambiar-etapa.dto';
import { AsignarLeadDto } from './dto/asignar-lead.dto';
import { FiltrarLeadsDto } from './dto/filtrar-leads.dto';
import {
  ArchivarMesDto,
  ListarArchivadosQueryDto,
} from './dto/archivar-mes.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.create(dto, usuario);
  }

  @Get()
  findAll(
    @Query() filtros: FiltrarLeadsDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.findAll(filtros, usuario);
  }

  @Get('kanban')
  findKanban(@CurrentUser() usuario: JwtUserPayload) {
    return this.leadsService.findKanban(usuario);
  }

  @Get('archivados')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  listarArchivados(@Query() query: ListarArchivadosQueryDto) {
    return this.leadsService.listarArchivados(
      query.page ?? 1,
      query.pageSize ?? 50,
      query.year,
      query.month,
    );
  }

  @Get('archivados/ultimo')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  async fechaUltimoArchivado() {
    const fecha = await this.leadsService.fechaUltimoArchivado();
    return { fecha: fecha ? fecha.toISOString() : null };
  }

  @Post('archivar-mes')
  @Roles(Rol.ADMIN)
  archivarMes(@Body() dto: ArchivarMesDto) {
    return this.leadsService.archivarMes(dto.year, dto.month);
  }

  @Patch(':id/desarchivar')
  @Roles(Rol.ADMIN)
  desarchivar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leadsService.desarchivar(id);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.findOne(id, usuario);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.update(id, dto, usuario);
  }

  @Patch(':id/etapa')
  cambiarEtapa(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CambiarEtapaDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.cambiarEtapa(id, dto, usuario);
  }

  @Patch(':id/asignar')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  asignar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AsignarLeadDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.asignar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.leadsService.remove(id, usuario);
  }
}
