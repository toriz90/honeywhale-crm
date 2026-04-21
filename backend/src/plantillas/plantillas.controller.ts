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
import { PlantillasService } from './plantillas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import {
  CurrentUser,
  JwtUserPayload,
} from '../common/decorators/current-user.decorator';
import { CrearPlantillaDto } from './dto/crear-plantilla.dto';
import { ActualizarPlantillaDto } from './dto/actualizar-plantilla.dto';
import { FiltrarPlantillasDto } from './dto/filtrar-plantillas.dto';

@Controller('plantillas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  findAll(@Query() filtros: FiltrarPlantillasDto) {
    return this.plantillasService.findAll(filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plantillasService.findOne(id);
  }

  @Get(':id/preview')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.AGENTE)
  preview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('leadId', new ParseUUIDPipe()) leadId: string,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.plantillasService.preview(id, leadId, usuario);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CrearPlantillaDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.plantillasService.create(dto, usuario);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarPlantillaDto,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.plantillasService.update(id, dto, usuario);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() usuario: JwtUserPayload,
  ) {
    return this.plantillasService.remove(id, usuario);
  }
}
