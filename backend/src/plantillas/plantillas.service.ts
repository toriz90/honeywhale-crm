import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plantilla, CategoriaPlantilla } from './plantilla.entity';
import { CrearPlantillaDto } from './dto/crear-plantilla.dto';
import { ActualizarPlantillaDto } from './dto/actualizar-plantilla.dto';
import {
  FiltrarPlantillasDto,
  TemperaturaFiltro,
} from './dto/filtrar-plantillas.dto';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { sanitizarHtmlCorreo } from '../correos/sanitize-html';
import { Lead } from '../leads/lead.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { ConfigMarca, RenderizadoService } from '../correos/renderizado.service';

export interface PreviewPlantilla {
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto: string | null;
}

@Injectable()
export class PlantillasService {
  private readonly logger = new Logger(PlantillasService.name);

  constructor(
    @InjectRepository(Plantilla)
    private readonly plantillasRepo: Repository<Plantilla>,
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly renderizado: RenderizadoService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async findAll(filtros: FiltrarPlantillasDto): Promise<Plantilla[]> {
    const qb = this.plantillasRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.creadoPor', 'creadoPor');

    if (filtros.activa !== undefined) {
      qb.andWhere('p.activa = :activa', { activa: filtros.activa });
    }
    if (filtros.categoria) {
      qb.andWhere('p.categoria = :categoria', { categoria: filtros.categoria });
    }
    if (filtros.temperatura) {
      // MySQL JSON_CONTAINS busca el string en el array JSON
      qb.andWhere('JSON_CONTAINS(p.temperaturas_recomendadas, :tempJson)', {
        tempJson: JSON.stringify(filtros.temperatura),
      });
    }

    qb.orderBy('p.veces_usada', 'DESC').addOrderBy('p.nombre', 'ASC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<Plantilla> {
    const plantilla = await this.plantillasRepo.findOne({
      where: { id },
      relations: ['creadoPor'],
    });
    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return plantilla;
  }

  async create(
    dto: CrearPlantillaDto,
    usuarioActual: JwtUserPayload,
  ): Promise<Plantilla> {
    this.verificarPermisoEscritura(usuarioActual);

    const nueva = this.plantillasRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      asunto: dto.asunto,
      cuerpo_html: sanitizarHtmlCorreo(dto.cuerpo_html),
      cuerpo_texto: dto.cuerpo_texto ?? null,
      categoria: dto.categoria ?? CategoriaPlantilla.OTRO,
      temperaturas_recomendadas: dto.temperaturas_recomendadas ?? null,
      activa: dto.activa ?? true,
      creado_por: usuarioActual.sub,
    });
    const guardada = await this.plantillasRepo.save(nueva);
    this.logger.log(
      `Plantilla creada id=${guardada.id} por ${usuarioActual.email}`,
    );
    return this.findOne(guardada.id);
  }

  async update(
    id: string,
    dto: ActualizarPlantillaDto,
    usuarioActual: JwtUserPayload,
  ): Promise<Plantilla> {
    this.verificarPermisoEscritura(usuarioActual);
    const plantilla = await this.findOne(id);

    if (dto.nombre !== undefined) plantilla.nombre = dto.nombre;
    if (dto.descripcion !== undefined) plantilla.descripcion = dto.descripcion;
    if (dto.asunto !== undefined) plantilla.asunto = dto.asunto;
    if (dto.cuerpo_html !== undefined) {
      plantilla.cuerpo_html = sanitizarHtmlCorreo(dto.cuerpo_html);
    }
    if (dto.cuerpo_texto !== undefined) {
      plantilla.cuerpo_texto = dto.cuerpo_texto;
    }
    if (dto.categoria !== undefined) plantilla.categoria = dto.categoria;
    if (dto.temperaturas_recomendadas !== undefined) {
      plantilla.temperaturas_recomendadas = dto.temperaturas_recomendadas;
    }
    if (dto.activa !== undefined) plantilla.activa = dto.activa;

    await this.plantillasRepo.save(plantilla);
    return this.findOne(id);
  }

  async remove(id: string, usuarioActual: JwtUserPayload): Promise<void> {
    if (usuarioActual.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Sólo ADMIN puede eliminar plantillas');
    }
    const plantilla = await this.findOne(id);
    await this.plantillasRepo.softRemove(plantilla);
  }

  async incrementarVecesUsada(id: string): Promise<void> {
    await this.plantillasRepo
      .createQueryBuilder()
      .update('plantillas_correo')
      .set({ veces_usada: () => 'veces_usada + 1' })
      .where('id = :id', { id })
      .execute();
  }

  /** Renderiza una plantilla aplicada a un lead concreto, sin enviarla. */
  async preview(
    plantillaId: string,
    leadId: string,
    usuarioActual: JwtUserPayload,
  ): Promise<PreviewPlantilla> {
    const lead = await this.leadsRepo.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    if (
      usuarioActual.rol === Rol.AGENTE &&
      lead.asignado_a_id !== usuarioActual.sub
    ) {
      throw new ForbiddenException(
        'No tiene permisos para previsualizar este lead',
      );
    }

    const plantilla = await this.findOne(plantillaId);

    const agente = await this.usuariosRepo.findOne({
      where: { id: usuarioActual.sub },
    });
    if (!agente) throw new NotFoundException('Usuario actual no encontrado');

    const config = await this.armarConfigMarca();
    const contexto = this.renderizado.armarContexto(lead, agente, config);

    return {
      asunto: this.renderizado.renderizar(plantilla.asunto, contexto),
      cuerpoHtml: this.renderizado.renderizar(plantilla.cuerpo_html, contexto),
      cuerpoTexto: plantilla.cuerpo_texto
        ? this.renderizado.renderizar(plantilla.cuerpo_texto, contexto)
        : null,
    };
  }

  /**
   * Arma la configuración de marca derivada de la tabla `configuracion`.
   * Compartida con el preview de plantillas y con CorreosService.
   */
  async armarConfigMarca(): Promise<ConfigMarca> {
    const marca = await this.configuracionService.obtenerMarca();
    const credsWc =
      await this.configuracionService.obtenerCredencialesWoocommerce();
    return {
      nombreTienda: marca.nombreTienda,
      telefonoTienda: marca.telefonoTienda,
      emailContacto: marca.emailContacto,
      linkTienda: credsWc.url || '',
      logo: marca.logoUrl || undefined,
    };
  }

  private verificarPermisoEscritura(usuario: JwtUserPayload): void {
    if (usuario.rol !== Rol.ADMIN && usuario.rol !== Rol.SUPERVISOR) {
      throw new ForbiddenException(
        'Sólo ADMIN o SUPERVISOR pueden modificar plantillas',
      );
    }
  }

  /** Helper público para que CorreosService pueda filtrar plantillas por temperatura. */
  static esTemperaturaValida(t: string): t is TemperaturaFiltro {
    return [
      'caliente',
      'tibio',
      'templado',
      'enfriandose',
      'frio',
      'congelado',
    ].includes(t);
  }
}
