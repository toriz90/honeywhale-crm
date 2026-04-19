import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Rol } from '../common/enums/rol.enum';
import { EtapaLead } from '../leads/enums/etapa-lead.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';

export interface ConteoPorEtapa {
  etapa: EtapaLead;
  cantidad: number;
}

export interface AgenteTop {
  usuarioId: string;
  nombre: string;
  recuperados: number;
  montoRecuperado: number;
}

export interface KpisDashboard {
  totalLeads: number;
  leadsPorEtapa: ConteoPorEtapa[];
  montoTotalRecuperado: number;
  montoEnNegociacion: number;
  tasaRecuperacion: number;
  leadsAsignadosAMi: number;
  leadsNuevosHoy: number;
  topAgentes: AgenteTop[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
  ) {}

  async obtenerKPIs(usuario: JwtUserPayload): Promise<KpisDashboard> {
    const esSupervisorOAdmin =
      usuario.rol === Rol.ADMIN || usuario.rol === Rol.SUPERVISOR;
    const usuarioId = usuario.sub;

    const totalLeads = await this.scopedQb(usuario).getCount();

    const rawEtapas = await this.scopedQb(usuario)
      .select('lead.etapa', 'etapa')
      .addSelect('COUNT(lead.id)', 'cantidad')
      .groupBy('lead.etapa')
      .getRawMany<{ etapa: EtapaLead; cantidad: string }>();

    const leadsPorEtapa: ConteoPorEtapa[] = Object.values(EtapaLead).map(
      (etapa) => {
        const row = rawEtapas.find((r) => r.etapa === etapa);
        return { etapa, cantidad: row ? Number(row.cantidad) : 0 };
      },
    );

    const montoTotalRecuperado = await this.sumarMontoPorEtapas(usuario, [
      EtapaLead.RECUPERADO,
    ]);

    const montoEnNegociacion = await this.sumarMontoPorEtapas(usuario, [
      EtapaLead.CONTACTADO,
      EtapaLead.EN_NEGOCIACION,
      EtapaLead.OFERTA_ENVIADA,
    ]);

    const cantidadRecuperados =
      leadsPorEtapa.find((r) => r.etapa === EtapaLead.RECUPERADO)?.cantidad ?? 0;
    const cantidadPerdidos =
      leadsPorEtapa.find((r) => r.etapa === EtapaLead.PERDIDO)?.cantidad ?? 0;
    const denominador = cantidadRecuperados + cantidadPerdidos;
    const tasaRecuperacion =
      denominador > 0
        ? Math.round((cantidadRecuperados / denominador) * 10000) / 100
        : 0;

    const leadsAsignadosAMi = await this.leadsRepo
      .createQueryBuilder('lead')
      .where('lead.asignado_a_id = :uid', { uid: usuarioId })
      .getCount();

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const qbNuevosHoy = this.scopedQb(usuario).andWhere(
      'lead.created_at >= :inicioHoy',
      { inicioHoy },
    );
    const leadsNuevosHoy = await qbNuevosHoy.getCount();

    let topAgentes: AgenteTop[] = [];
    if (esSupervisorOAdmin) {
      const raw = await this.leadsRepo
        .createQueryBuilder('lead')
        .innerJoin('lead.asignadoA', 'usuario')
        .select('usuario.id', 'usuarioId')
        .addSelect('usuario.nombre', 'nombre')
        .addSelect('COUNT(lead.id)', 'recuperados')
        .addSelect('COALESCE(SUM(lead.monto), 0)', 'montoRecuperado')
        .where('lead.etapa = :etapa', { etapa: EtapaLead.RECUPERADO })
        .groupBy('usuario.id')
        .addGroupBy('usuario.nombre')
        .orderBy('montoRecuperado', 'DESC')
        .limit(5)
        .getRawMany<{
          usuarioId: string;
          nombre: string;
          recuperados: string;
          montoRecuperado: string;
        }>();

      topAgentes = raw.map((r) => ({
        usuarioId: r.usuarioId,
        nombre: r.nombre,
        recuperados: Number(r.recuperados),
        montoRecuperado: Number(r.montoRecuperado),
      }));
    }

    return {
      totalLeads,
      leadsPorEtapa,
      montoTotalRecuperado,
      montoEnNegociacion,
      tasaRecuperacion,
      leadsAsignadosAMi,
      leadsNuevosHoy,
      topAgentes,
    };
  }

  private scopedQb(usuario: JwtUserPayload): SelectQueryBuilder<Lead> {
    const qb = this.leadsRepo.createQueryBuilder('lead');
    if (usuario.rol === Rol.AGENTE) {
      qb.where('lead.asignado_a_id = :uid', { uid: usuario.sub });
    }
    return qb;
  }

  private async sumarMontoPorEtapas(
    usuario: JwtUserPayload,
    etapas: EtapaLead[],
  ): Promise<number> {
    const qb = this.leadsRepo
      .createQueryBuilder('lead')
      .select('COALESCE(SUM(lead.monto), 0)', 'total')
      .where('lead.etapa IN (:...etapas)', { etapas });

    if (usuario.rol === Rol.AGENTE) {
      qb.andWhere('lead.asignado_a_id = :uid', { uid: usuario.sub });
    }

    const raw = await qb.getRawOne<{ total: string | null }>();
    return Number(raw?.total ?? 0);
  }
}
