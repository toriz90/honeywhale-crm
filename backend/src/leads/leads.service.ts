import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Lead } from './lead.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Rol } from '../common/enums/rol.enum';
import { EtapaLead, Moneda } from './enums/etapa-lead.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CambiarEtapaDto } from './dto/cambiar-etapa.dto';
import { AsignarLeadDto } from './dto/asignar-lead.dto';
import { FiltrarLeadsDto } from './dto/filtrar-leads.dto';

const LIMITE_KANBAN_POR_ETAPA = 50;

export interface LeadsPaginados {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async create(
    dto: CreateLeadDto,
    _usuarioActual: JwtUserPayload,
  ): Promise<Lead> {
    if (dto.asignado_a_id) {
      await this.validarUsuarioAsignado(dto.asignado_a_id);
    }

    const nuevo = this.leadsRepo.create({
      nombre: dto.nombre,
      email: dto.email ?? null,
      telefono: dto.telefono,
      producto: dto.producto,
      monto: dto.monto.toFixed(2),
      moneda: dto.moneda ?? Moneda.MXN,
      orden_woo_id: dto.orden_woo_id ?? null,
      etapa: dto.etapa ?? EtapaLead.NUEVO,
      motivo_abandono: dto.motivo_abandono ?? null,
      asignado_a_id: dto.asignado_a_id ?? null,
      notas: dto.notas ?? null,
    });

    const guardado = await this.leadsRepo.save(nuevo);
    return this.findByIdConRelaciones(guardado.id);
  }

  async findAll(
    filtros: FiltrarLeadsDto,
    usuarioActual: JwtUserPayload,
  ): Promise<LeadsPaginados> {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const orderBy = filtros.orderBy ?? 'created_at';
    const order = filtros.order ?? 'DESC';

    const qb = this.leadsRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.asignadoA', 'asignadoA');

    this.aplicarRbac(qb, usuarioActual);

    if (filtros.etapa) {
      qb.andWhere('lead.etapa = :etapa', { etapa: filtros.etapa });
    }

    if (filtros.asignado_a_id) {
      qb.andWhere('lead.asignado_a_id = :asignadoAId', {
        asignadoAId: filtros.asignado_a_id,
      });
    }

    if (filtros.search) {
      const search = `%${filtros.search}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('lead.nombre LIKE :search', { search })
            .orWhere('lead.email LIKE :search', { search })
            .orWhere('lead.telefono LIKE :search', { search })
            .orWhere('lead.producto LIKE :search', { search });
        }),
      );
    }

    qb.orderBy(`lead.${orderBy}`, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string, usuarioActual: JwtUserPayload): Promise<Lead> {
    const lead = await this.findByIdConRelaciones(id);
    this.verificarAccesoLead(lead, usuarioActual, 'ver');
    return lead;
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    usuarioActual: JwtUserPayload,
  ): Promise<Lead> {
    const lead = await this.findByIdConRelaciones(id);
    this.verificarAccesoLead(lead, usuarioActual, 'editar');

    if (
      dto.asignado_a_id !== undefined &&
      dto.asignado_a_id !== lead.asignado_a_id
    ) {
      if (usuarioActual.rol === Rol.AGENTE) {
        throw new ForbiddenException(
          'No tiene permisos para reasignar este lead',
        );
      }
      if (dto.asignado_a_id !== null) {
        await this.validarUsuarioAsignado(dto.asignado_a_id);
      }
      lead.asignado_a_id = dto.asignado_a_id;
    }

    if (dto.nombre !== undefined) lead.nombre = dto.nombre;
    if (dto.email !== undefined) lead.email = dto.email;
    if (dto.telefono !== undefined) lead.telefono = dto.telefono;
    if (dto.producto !== undefined) lead.producto = dto.producto;
    if (dto.monto !== undefined) lead.monto = dto.monto.toFixed(2);
    if (dto.moneda !== undefined) lead.moneda = dto.moneda;
    if (dto.orden_woo_id !== undefined) lead.orden_woo_id = dto.orden_woo_id;
    if (dto.etapa !== undefined) lead.etapa = dto.etapa;
    if (dto.motivo_abandono !== undefined) {
      lead.motivo_abandono = dto.motivo_abandono;
    }
    if (dto.notas !== undefined) lead.notas = dto.notas;

    await this.leadsRepo.save(lead);
    return this.findByIdConRelaciones(id);
  }

  async cambiarEtapa(
    id: string,
    dto: CambiarEtapaDto,
    usuarioActual: JwtUserPayload,
  ): Promise<Lead> {
    const lead = await this.findByIdConRelaciones(id);
    this.verificarAccesoLead(lead, usuarioActual, 'mover de etapa');

    lead.etapa = dto.etapa;
    await this.leadsRepo.save(lead);
    return this.findByIdConRelaciones(id);
  }

  async asignar(
    id: string,
    dto: AsignarLeadDto,
    usuarioActual: JwtUserPayload,
  ): Promise<Lead> {
    if (usuarioActual.rol === Rol.AGENTE) {
      throw new ForbiddenException('No tiene permisos para reasignar leads');
    }

    const lead = await this.findByIdConRelaciones(id);

    if (dto.asignado_a_id) {
      await this.validarUsuarioAsignado(dto.asignado_a_id);
    }

    lead.asignado_a_id = dto.asignado_a_id;
    await this.leadsRepo.save(lead);
    return this.findByIdConRelaciones(id);
  }

  async remove(id: string, usuarioActual: JwtUserPayload): Promise<void> {
    if (usuarioActual.rol === Rol.AGENTE) {
      throw new ForbiddenException('No tiene permisos para eliminar leads');
    }

    const lead = await this.leadsRepo.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    await this.leadsRepo.softRemove(lead);
  }

  async findKanban(
    usuarioActual: JwtUserPayload,
  ): Promise<Record<EtapaLead, Lead[]>> {
    const etapas = Object.values(EtapaLead);
    const resultado = {} as Record<EtapaLead, Lead[]>;

    await Promise.all(
      etapas.map(async (etapa) => {
        const qb = this.leadsRepo
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
          .where('lead.etapa = :etapa', { etapa });

        this.aplicarRbac(qb, usuarioActual);

        qb.orderBy('lead.updated_at', 'DESC').take(LIMITE_KANBAN_POR_ETAPA);
        resultado[etapa] = await qb.getMany();
      }),
    );

    return resultado;
  }

  private aplicarRbac(
    qb: SelectQueryBuilder<Lead>,
    usuario: JwtUserPayload,
  ): void {
    if (usuario.rol === Rol.AGENTE) {
      qb.andWhere('lead.asignado_a_id = :usuarioActualId', {
        usuarioActualId: usuario.sub,
      });
    }
  }

  private verificarAccesoLead(
    lead: Lead,
    usuario: JwtUserPayload,
    accion: string,
  ): void {
    if (usuario.rol !== Rol.AGENTE) return;
    if (lead.asignado_a_id !== usuario.sub) {
      throw new ForbiddenException(
        `No tiene permisos para ${accion} este lead`,
      );
    }
  }

  private async findByIdConRelaciones(id: string): Promise<Lead> {
    const lead = await this.leadsRepo.findOne({
      where: { id },
      relations: ['asignadoA'],
    });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    return lead;
  }

  private async validarUsuarioAsignado(usuarioId: string): Promise<void> {
    const existe = await this.usuariosRepo.findOne({
      where: { id: usuarioId },
    });
    if (!existe) {
      throw new BadRequestException(
        'El usuario asignado no existe o fue eliminado',
      );
    }
    if (!existe.activo) {
      throw new BadRequestException(
        'El usuario asignado está inactivo',
      );
    }
  }
}
