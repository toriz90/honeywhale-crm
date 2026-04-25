import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import {
  FiltrarLeadsDto,
  FiltroAsignacion,
} from './dto/filtrar-leads.dto';

const LIMITE_KANBAN_POR_ETAPA = 50;
const ETAPAS_FINALES: ReadonlyArray<EtapaLead> = [
  EtapaLead.RECUPERADO,
  EtapaLead.PERDIDO,
];

function esEtapaFinal(etapa: EtapaLead): boolean {
  return ETAPAS_FINALES.includes(etapa);
}

export interface LeadsPaginados {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResultadoArchivado {
  total: number;
  archivados: number;
  year: number;
  month: number;
}

export interface ArchivadosPaginados {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type LeadConIntentos = Lead & {
  intentoNumero: number;
  totalIntentos: number;
};

export interface KanbanEtapaPaginada {
  data: LeadConIntentos[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BucketTemperatura {
  count: number;
  montoTotal: number;
}

export interface StatsTemperatura {
  calientes: BucketTemperatura;
  tibios: BucketTemperatura;
  templados: BucketTemperatura;
  enfriandose: BucketTemperatura;
  frios: BucketTemperatura;
  congelados: BucketTemperatura;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

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

    const etapaInicial = dto.etapa ?? EtapaLead.NUEVO;
    const nuevo = this.leadsRepo.create({
      nombre: dto.nombre,
      email: dto.email ?? null,
      telefono: dto.telefono,
      producto: dto.producto,
      monto: dto.monto.toFixed(2),
      moneda: dto.moneda ?? Moneda.MXN,
      orden_woo_id: dto.orden_woo_id ?? null,
      etapa: etapaInicial,
      motivo_abandono: dto.motivo_abandono ?? null,
      asignado_a_id: dto.asignado_a_id ?? null,
      notas: dto.notas ?? null,
      fecha_cambio_etapa: esEtapaFinal(etapaInicial) ? new Date() : null,
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

    this.aplicarFiltroAsignacion(qb, usuarioActual, filtros.filtro);

    qb.andWhere('lead.archivado = :archivado', { archivado: false });

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
    if (dto.etapa !== undefined && dto.etapa !== lead.etapa) {
      lead.etapa = dto.etapa;
      lead.fecha_cambio_etapa = new Date();
    }
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

    if (dto.etapa !== lead.etapa) {
      lead.etapa = dto.etapa;
      lead.fecha_cambio_etapa = new Date();
      await this.leadsRepo.save(lead);
    }
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
    filtroAsignacion?: FiltroAsignacion,
  ): Promise<Record<EtapaLead, Lead[]>> {
    const etapas = Object.values(EtapaLead);
    const resultado = {} as Record<EtapaLead, Lead[]>;

    await Promise.all(
      etapas.map(async (etapa) => {
        const qb = this.leadsRepo
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
          .where('lead.etapa = :etapa', { etapa })
          .andWhere('lead.archivado = :archivado', { archivado: false });

        this.aplicarFiltroAsignacion(qb, usuarioActual, filtroAsignacion);

        // Ordenamiento: leads con fecha_pedido_wc más reciente primero
        // (calientes arriba), luego updated_at como tiebreaker. En MySQL,
        // ORDER BY ... DESC coloca los NULLs al final de forma natural,
        // así que no hace falta un addOrderBy extra con "IS NULL" (ese patrón
        // rompe TypeORM porque addOrderBy resuelve el string como columna).
        qb.orderBy('lead.fecha_pedido_wc', 'DESC')
          .addOrderBy('lead.updated_at', 'DESC')
          .take(LIMITE_KANBAN_POR_ETAPA);
        resultado[etapa] = await qb.getMany();
      }),
    );

    return resultado;
  }

  /**
   * Variante paginada de findKanban: devuelve UNA etapa con paginación real
   * (total cuenta filas en BD, no está topado a LIMITE_KANBAN_POR_ETAPA).
   * Reusa el mismo orden y filtros que findKanban para que el scroll
   * infinito en frontend siga viendo los leads en el mismo orden.
   *
   * Cada lead viene enriquecido con `intentoNumero` (posición ordinal del
   * lead entre los pedidos del mismo email, ordenados por created_at) y
   * `totalIntentos` (cuántos pedidos no archivados tiene ese email en total).
   * Se calcula con window functions ROW_NUMBER/COUNT OVER (PARTITION BY email)
   * en una subquery que cubre TODOS los leads no archivados (no sólo los de
   * esta etapa) para que el contador sea global por cliente.
   */
  async findKanbanEtapa(
    etapa: EtapaLead,
    page: number,
    pageSize: number,
    usuarioActual: JwtUserPayload,
    filtroAsignacion?: FiltroAsignacion,
  ): Promise<KanbanEtapaPaginada> {
    const aplicarFiltrosBase = (qb: SelectQueryBuilder<Lead>) => {
      qb.where('lead.etapa = :etapa', { etapa }).andWhere(
        'lead.archivado = :archivado',
        { archivado: false },
      );
      this.aplicarFiltroAsignacion(qb, usuarioActual, filtroAsignacion);
    };

    // Conteo total separado del query principal para que take/skip no afecte
    // y para evitar coste de la subquery de window functions cuando sólo
    // queremos saber cuántas filas hay.
    const countQb = this.leadsRepo.createQueryBuilder('lead');
    aplicarFiltrosBase(countQb);
    const total = await countQb.getCount();

    if (total === 0) {
      return { data: [], total: 0, page, pageSize, hasMore: false };
    }

    const dataQb = this.leadsRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
      .leftJoin(
        (sub) =>
          sub
            .select('inner_lead.id', 'lid')
            .addSelect(
              'ROW_NUMBER() OVER (PARTITION BY inner_lead.email ORDER BY inner_lead.created_at ASC, inner_lead.id ASC)',
              'intento',
            )
            .addSelect(
              'COUNT(*) OVER (PARTITION BY inner_lead.email)',
              'total_intentos',
            )
            .from(Lead, 'inner_lead')
            .where('inner_lead.archivado = :archInner', { archInner: false })
            .andWhere('inner_lead.email IS NOT NULL')
            .andWhere("inner_lead.email != ''"),
        'attempts',
        'attempts.lid = lead.id',
      )
      .addSelect('attempts.intento', 'lead_intento')
      .addSelect('attempts.total_intentos', 'lead_total_intentos');

    aplicarFiltrosBase(dataQb);

    dataQb
      .orderBy('lead.fecha_pedido_wc', 'DESC')
      .addOrderBy('lead.updated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const result = await dataQb.getRawAndEntities();

    const data: LeadConIntentos[] = result.entities.map((entity, idx) => {
      const rawRow: Record<string, unknown> = result.raw[idx] ?? {};
      const intentoRaw = Number(rawRow['lead_intento']);
      const totalRaw = Number(rawRow['lead_total_intentos']);
      const intentoNumero =
        Number.isFinite(intentoRaw) && intentoRaw > 0 ? intentoRaw : 1;
      const totalIntentos =
        Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : 1;
      return Object.assign(entity, {
        intentoNumero,
        totalIntentos,
      }) as LeadConIntentos;
    });

    const hasMore = page * pageSize < total;
    return { data, total, page, pageSize, hasMore };
  }

  async tomar(id: string, usuarioActual: JwtUserPayload): Promise<Lead> {
    // UPDATE condicional race-safe: solo asigna si el lead sigue sin dueño
    // y no está archivado. Validamos affected para detectar colisiones.
    // Usamos .update('leads') (tabla raw) en lugar de .update(Lead) para
    // evitar cualquier lookup por metadata — operamos directo sobre los
    // nombres de columna de BD.
    const result = await this.leadsRepo
      .createQueryBuilder()
      .update('leads')
      .set({
        asignado_a_id: usuarioActual.sub,
        fecha_asignacion: () => 'NOW()',
      })
      .where('id = :id', { id })
      .andWhere('asignado_a_id IS NULL')
      .andWhere('archivado = :archivado', { archivado: false })
      .execute();

    if (!result.affected || result.affected === 0) {
      const existe = await this.leadsRepo.findOne({ where: { id } });
      if (!existe) {
        throw new NotFoundException('Lead no encontrado');
      }
      throw new ConflictException(
        'Este lead ya fue tomado por otro agente o ya no está disponible.',
      );
    }

    this.logger.log(`Lead ${id} tomado por ${usuarioActual.email}`);
    return this.findByIdConRelaciones(id);
  }

  async statsTemperatura(
    usuarioActual: JwtUserPayload,
  ): Promise<StatsTemperatura> {
    const qb = this.leadsRepo
      .createQueryBuilder('lead')
      .select(
        `CASE
          WHEN TIMESTAMPDIFF(MINUTE, lead.fecha_pedido_wc, NOW()) < 15 THEN 'calientes'
          WHEN TIMESTAMPDIFF(MINUTE, lead.fecha_pedido_wc, NOW()) < 60 THEN 'tibios'
          WHEN TIMESTAMPDIFF(MINUTE, lead.fecha_pedido_wc, NOW()) < 180 THEN 'templados'
          WHEN TIMESTAMPDIFF(MINUTE, lead.fecha_pedido_wc, NOW()) < 1440 THEN 'enfriandose'
          WHEN TIMESTAMPDIFF(MINUTE, lead.fecha_pedido_wc, NOW()) < 10080 THEN 'frios'
          ELSE 'congelados'
        END`,
        'bucket',
      )
      .addSelect('COUNT(lead.id)', 'count')
      .addSelect('COALESCE(SUM(lead.monto), 0)', 'monto')
      .where('lead.archivado = :archivado', { archivado: false })
      .andWhere('lead.etapa = :etapa', { etapa: EtapaLead.NUEVO })
      .andWhere('lead.fecha_pedido_wc IS NOT NULL');

    if (usuarioActual.rol === Rol.AGENTE) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('lead.asignado_a_id IS NULL').orWhere(
            'lead.asignado_a_id = :uid',
            { uid: usuarioActual.sub },
          );
        }),
      );
    }

    const raws = await qb
      .groupBy('bucket')
      .getRawMany<{ bucket: string; count: string; monto: string }>();

    const base: StatsTemperatura = {
      calientes: { count: 0, montoTotal: 0 },
      tibios: { count: 0, montoTotal: 0 },
      templados: { count: 0, montoTotal: 0 },
      enfriandose: { count: 0, montoTotal: 0 },
      frios: { count: 0, montoTotal: 0 },
      congelados: { count: 0, montoTotal: 0 },
    };

    for (const r of raws) {
      const key = r.bucket as keyof StatsTemperatura;
      if (key in base) {
        base[key] = {
          count: Number(r.count),
          montoTotal: Math.round(Number(r.monto) * 100) / 100,
        };
      }
    }

    return base;
  }

  async archivarMes(year: number, month: number): Promise<ResultadoArchivado> {
    const rango = calcularRangoMes(year, month);

    const totalCandidatos = await this.leadsRepo
      .createQueryBuilder('lead')
      .where('lead.archivado = :archivado', { archivado: false })
      .andWhere('lead.etapa IN (:...etapas)', {
        etapas: ETAPAS_FINALES as EtapaLead[],
      })
      .andWhere('lead.fecha_cambio_etapa >= :desde', { desde: rango.desde })
      .andWhere('lead.fecha_cambio_etapa < :hasta', { hasta: rango.hasta })
      .getCount();

    const result = await this.leadsRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ archivado: true, fecha_archivado: () => 'NOW()' })
      .where('archivado = :archivado', { archivado: false })
      .andWhere('etapa IN (:...etapas)', {
        etapas: ETAPAS_FINALES as EtapaLead[],
      })
      .andWhere('fecha_cambio_etapa >= :desde', { desde: rango.desde })
      .andWhere('fecha_cambio_etapa < :hasta', { hasta: rango.hasta })
      .execute();

    const archivados = result.affected ?? 0;
    this.logger.log(
      `Archivado mensual ${year}-${String(month).padStart(2, '0')}: ${archivados}/${totalCandidatos} leads archivados`,
    );

    return {
      total: totalCandidatos,
      archivados,
      year,
      month,
    };
  }

  async listarArchivados(
    page = 1,
    pageSize = 50,
    year?: number,
    month?: number,
  ): Promise<ArchivadosPaginados> {
    const qb = this.leadsRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
      .where('lead.archivado = :archivado', { archivado: true });

    if (year && month) {
      const rango = calcularRangoMes(year, month);
      qb.andWhere('lead.fecha_cambio_etapa >= :desde', { desde: rango.desde });
      qb.andWhere('lead.fecha_cambio_etapa < :hasta', { hasta: rango.hasta });
    }

    qb.orderBy('lead.fecha_cambio_etapa', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

    return { data, total, page, pageSize, totalPages };
  }

  async desarchivar(id: string): Promise<Lead> {
    const lead = await this.leadsRepo.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    if (!lead.archivado) {
      throw new BadRequestException('El lead no está archivado');
    }
    lead.archivado = false;
    lead.fecha_archivado = null;
    await this.leadsRepo.save(lead);
    return this.findByIdConRelaciones(id);
  }

  async fechaUltimoArchivado(): Promise<Date | null> {
    const row = await this.leadsRepo
      .createQueryBuilder('lead')
      .select('MAX(lead.fecha_archivado)', 'max')
      .where('lead.fecha_archivado IS NOT NULL')
      .getRawOne<{ max: Date | string | null }>();
    const max = row?.max ?? null;
    if (!max) return null;
    return max instanceof Date ? max : new Date(max);
  }

  /**
   * Aplica el filtro de asignación combinado con RBAC. Para AGENTE el default
   * es "mios_y_sin_asignar" (sus leads + los disponibles), pero puede pedir
   * explícitamente "equipo" o "sin_asignar". "todos" sólo para SUPERVISOR/ADMIN.
   */
  private aplicarFiltroAsignacion(
    qb: SelectQueryBuilder<Lead>,
    usuario: JwtUserPayload,
    filtro?: FiltroAsignacion,
  ): void {
    const esAgente = usuario.rol === Rol.AGENTE;
    const f = filtro ?? (esAgente ? undefined : 'todos');

    if (esAgente && f === 'todos') {
      // Silent upgrade: un AGENTE nunca ve "todos"; lo degradamos a la vista
      // mios + sin asignar (default).
      this.aplicarMiosYSinAsignar(qb, usuario.sub);
      return;
    }

    switch (f) {
      case 'mios':
        qb.andWhere('lead.asignado_a_id = :uid', { uid: usuario.sub });
        break;
      case 'sin_asignar':
        qb.andWhere('lead.asignado_a_id IS NULL');
        break;
      case 'equipo':
        if (esAgente) {
          // Para AGENTE, "equipo" = leads asignados a otros (no suyos ni sin asignar)
          qb.andWhere('lead.asignado_a_id IS NOT NULL').andWhere(
            'lead.asignado_a_id != :uid',
            { uid: usuario.sub },
          );
        }
        // Para SUPERVISOR/ADMIN "equipo" no filtra (ya ven todo)
        break;
      case 'todos':
        // sin filtro adicional (SUPERVISOR/ADMIN)
        break;
      default:
        // Default AGENTE: suyos + sin asignar
        if (esAgente) {
          this.aplicarMiosYSinAsignar(qb, usuario.sub);
        }
        break;
    }
  }

  private aplicarMiosYSinAsignar(
    qb: SelectQueryBuilder<Lead>,
    uid: string,
  ): void {
    qb.andWhere(
      new Brackets((w) => {
        w.where('lead.asignado_a_id = :uid', { uid }).orWhere(
          'lead.asignado_a_id IS NULL',
        );
      }),
    );
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

export function calcularRangoMes(
  year: number,
  month: number,
): { desde: Date; hasta: Date } {
  if (month < 1 || month > 12) {
    throw new BadRequestException('Mes inválido (1-12)');
  }
  const desde = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const hasta = new Date(year, month, 1, 0, 0, 0, 0);
  return { desde, hasta };
}
