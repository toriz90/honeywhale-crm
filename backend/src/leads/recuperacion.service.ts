import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { EtapaLead } from './enums/etapa-lead.enum';
import {
  EventoRecuperacion,
  OrigenEvento,
  TipoEventoRecuperacion,
} from './evento-recuperacion.entity';
import {
  CorreoEnviado,
  EstadoCorreo,
} from '../correos/correo-enviado.entity';
import { Rol } from '../common/enums/rol.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';

// Una asignación más reciente que esto se considera coincidencia (probablemente
// el agente apenas tomó el lead segundos antes de que el webhook llegara) y
// NO cuenta como intervención humana real.
// TODO: hacer configurable desde la tabla configuracion (commit futuro).
const TIEMPO_MINIMO_ASIGNACION_MS = 5 * 60 * 1000;

export type SenalRecuperacion =
  | 'asignado'
  | 'etapa_cambiada'
  | 'correo_enviado';

export interface ResultadoSenales {
  esAgente: boolean;
  senales: SenalRecuperacion[];
}

interface RegistrarEventoInput {
  leadId: string;
  tipo: TipoEventoRecuperacion;
  etapaAnterior: EtapaLead | null;
  asignadoAId: string | null;
  senales: SenalRecuperacion[];
  origen: OrigenEvento;
  decididoAutomaticamente: boolean;
  decididoPorId?: string | null;
  notas?: string | null;
}

export interface ResultadoCambioAtribucion {
  lead: Lead;
  evento: EventoRecuperacion;
}

/**
 * Decide si una recuperación tuvo intervención humana real o fue una compra
 * orgánica (cliente regresó solo). Se invoca tanto desde el webhook de WC
 * (decisión automática) como desde el override manual del CRM (REVERSION).
 *
 * Las señales se evalúan en tiempo real consultando la BD; no usamos campos
 * cacheados que puedan estar desactualizados.
 */
@Injectable()
export class RecuperacionService {
  private readonly logger = new Logger(RecuperacionService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(EventoRecuperacion)
    private readonly eventoRepo: Repository<EventoRecuperacion>,
    @InjectRepository(CorreoEnviado)
    private readonly correoRepo: Repository<CorreoEnviado>,
  ) {}

  /**
   * Tres señales independientes; basta una para certificar atribución humana:
   *
   *   A. `asignado` — alguien tomó el lead Y lo hizo al menos 5 min antes de
   *      ahora (descartamos coincidencias instantáneas con la compra).
   *   B. `etapa_cambiada` — la etapa actual NO es NUEVO, lo que implica que
   *      hubo movimiento manual en algún punto.
   *   C. `correo_enviado` — existe al menos un CorreoEnviado con estado
   *      ENVIADO ligado al lead (módulo de correos puede estar oculto pero
   *      las plantillas aún existen).
   *
   * Decisión: `esAgente = senales.length > 0`. Si ninguna se dispara, la
   * recuperación se clasifica como orgánica y el evento queda como
   * AUTO_ORGANICO (sigue siendo etapa RECUPERADO en el Kanban; el dashboard
   * lo separará para no inflar las métricas del equipo).
   */
  async evaluarSenales(lead: Lead): Promise<ResultadoSenales> {
    const senales: SenalRecuperacion[] = [];

    if (lead.asignado_a_id && lead.fecha_asignacion) {
      const transcurrido = Date.now() - lead.fecha_asignacion.getTime();
      if (transcurrido >= TIEMPO_MINIMO_ASIGNACION_MS) {
        senales.push('asignado');
      }
    }

    if (lead.etapa !== EtapaLead.NUEVO) {
      senales.push('etapa_cambiada');
    }

    const correosEnviados = await this.correoRepo.count({
      where: { lead_id: lead.id, estado: EstadoCorreo.ENVIADO },
    });
    if (correosEnviados > 0) {
      senales.push('correo_enviado');
    }

    return { esAgente: senales.length > 0, senales };
  }

  async registrarEvento(
    input: RegistrarEventoInput,
  ): Promise<EventoRecuperacion> {
    const evento = this.eventoRepo.create({
      leadId: input.leadId,
      tipo: input.tipo,
      etapaAnterior: input.etapaAnterior ?? null,
      asignadoAId: input.asignadoAId,
      senalesDetectadas: input.senales,
      origen: input.origen,
      decididoAutomaticamente: input.decididoAutomaticamente,
      decididoPorId: input.decididoPorId ?? null,
      notas: input.notas ?? null,
    });
    return this.eventoRepo.save(evento);
  }

  /**
   * Override manual de la atribución. Sólo aplica cuando el lead está en
   * RECUPERADO; cualquier otra etapa es BadRequest (no tiene sentido marcar
   * "recuperado por agente" un lead que aún no ha sido recuperado).
   */
  async cambiarAtribucion(
    leadId: string,
    nuevaAtribucion: boolean,
    decisor: JwtUserPayload,
    notas?: string,
  ): Promise<ResultadoCambioAtribucion> {
    if (decisor.rol !== Rol.ADMIN && decisor.rol !== Rol.SUPERVISOR) {
      throw new ForbiddenException(
        'Sólo ADMIN o SUPERVISOR pueden cambiar la atribución de una recuperación',
      );
    }

    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
      relations: ['asignadoA'],
    });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    if (lead.etapa !== EtapaLead.RECUPERADO) {
      throw new BadRequestException(
        'Sólo se puede cambiar la atribución de leads en etapa RECUPERADO',
      );
    }

    lead.recuperadoPorAgente = nuevaAtribucion;
    const guardado = await this.leadRepo.save(lead);

    const evento = await this.registrarEvento({
      leadId: guardado.id,
      tipo: TipoEventoRecuperacion.REVERSION,
      etapaAnterior: guardado.etapa,
      asignadoAId: guardado.asignado_a_id,
      senales: [],
      origen: OrigenEvento.MANUAL_AGENTE,
      decididoAutomaticamente: false,
      decididoPorId: decisor.sub,
      notas: notas ?? null,
    });

    this.logger.log(
      `Atribución de lead ${guardado.id} cambiada a ${
        nuevaAtribucion ? 'AGENTE' : 'ORGÁNICA'
      } por ${decisor.email} (evento ${evento.id})`,
    );

    return { lead: guardado, evento };
  }

  /**
   * Lista eventos de un lead aplicando control de acceso:
   * - ADMIN / SUPERVISOR: cualquier lead.
   * - AGENTE: sólo si el lead es suyo o si está sin asignar.
   */
  async listarEventosDeLead(
    leadId: string,
    solicitante: JwtUserPayload,
  ): Promise<EventoRecuperacion[]> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
      select: ['id', 'asignado_a_id'],
    });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    if (
      solicitante.rol === Rol.AGENTE &&
      lead.asignado_a_id !== null &&
      lead.asignado_a_id !== solicitante.sub
    ) {
      throw new ForbiddenException(
        'No tiene permisos para ver el historial de este lead',
      );
    }

    return this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.asignadoA', 'asignadoA')
      .leftJoinAndSelect('evento.decididoPor', 'decididoPor')
      .where('evento.leadId = :leadId', { leadId })
      .orderBy('evento.createdAt', 'DESC')
      .getMany();
  }
}
