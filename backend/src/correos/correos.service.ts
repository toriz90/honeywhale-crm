import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorreoEnviado, EstadoCorreo } from './correo-enviado.entity';
import { Lead } from '../leads/lead.entity';
import { Plantilla } from '../plantillas/plantilla.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EnviarCorreoDto } from './dto/enviar-correo.dto';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { RenderizadoService, ConfigMarca } from './renderizado.service';
import { EmailSenderService } from './email-sender.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { PlantillasService } from '../plantillas/plantillas.service';
import { sanitizarHtmlCorreo } from './sanitize-html';

@Injectable()
export class CorreosService {
  private readonly logger = new Logger(CorreosService.name);

  constructor(
    @InjectRepository(CorreoEnviado)
    private readonly correosRepo: Repository<CorreoEnviado>,
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Plantilla)
    private readonly plantillasRepo: Repository<Plantilla>,

    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly renderizado: RenderizadoService,
    private readonly emailSender: EmailSenderService,
    private readonly plantillasService: PlantillasService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async enviarDesdeComposer(
    dto: EnviarCorreoDto,
    usuarioActual: JwtUserPayload,
  ): Promise<CorreoEnviado> {
    const { lead, agente, plantilla } = await this.cargarBase(dto, usuarioActual);
    if (!lead.email) {
      throw new BadRequestException(
        'El lead no tiene email registrado',
      );
    }

    const contexto = await this.armarContextoConConfig(lead, agente);

    const asuntoFinal = this.renderizado.renderizar(dto.asunto, contexto);
    const cuerpoHtmlFinal = this.renderizado.renderizar(
      sanitizarHtmlCorreo(dto.cuerpoHtml),
      contexto,
    );
    const cuerpoTextoFinal = dto.cuerpoTexto
      ? this.renderizado.renderizar(dto.cuerpoTexto, contexto)
      : null;

    // Persistimos primero como PENDIENTE para tener id en logs y poder
    // marcar FALLIDO si SMTP truena.
    const registro = this.correosRepo.create({
      plantilla_id: plantilla?.id ?? null,
      lead_id: lead.id,
      usuario_id: usuarioActual.sub,
      asunto_final: asuntoFinal,
      cuerpo_html_final: cuerpoHtmlFinal,
      cuerpo_texto_final: cuerpoTextoFinal,
      destinatario_email: lead.email,
      reply_to: agente.email,
      estado: EstadoCorreo.PENDIENTE,
    });
    const guardado = await this.correosRepo.save(registro);

    try {
      const { mensajeId } = await this.emailSender.enviar({
        destinatario: lead.email,
        replyTo: agente.email,
        asunto: asuntoFinal,
        cuerpoHtml: cuerpoHtmlFinal,
        cuerpoTexto: cuerpoTextoFinal ?? undefined,
      });

      guardado.estado = EstadoCorreo.ENVIADO;
      guardado.fecha_envio = new Date();
      guardado.mensaje_id_smtp = mensajeId;
      await this.correosRepo.save(guardado);

      if (plantilla) {
        await this.plantillasService
          .incrementarVecesUsada(plantilla.id)
          .catch((err) => {
            this.logger.warn(
              `No se pudo incrementar veces_usada plantilla=${plantilla.id}: ${
                err instanceof Error ? err.message : err
              }`,
            );
          });
      }

      this.logger.log(
        `Correo enviado lead=${lead.id} plantilla=${plantilla?.id ?? 'NONE'} usuario=${usuarioActual.email} correoId=${guardado.id}`,
      );
    } catch (err) {
      guardado.estado = EstadoCorreo.FALLIDO;
      guardado.error_envio =
        err instanceof Error ? err.message : 'Error SMTP desconocido';
      await this.correosRepo.save(guardado);
      this.logger.warn(
        `Correo FALLIDO lead=${lead.id} usuario=${usuarioActual.email} error=${guardado.error_envio}`,
      );
      // Re-lanzamos para que el cliente vea el error.
      throw err;
    }

    return this.recargar(guardado.id);
  }

  async guardarBorrador(
    dto: EnviarCorreoDto,
    usuarioActual: JwtUserPayload,
  ): Promise<CorreoEnviado> {
    const { lead, agente, plantilla } = await this.cargarBase(dto, usuarioActual);

    const contexto = await this.armarContextoConConfig(lead, agente);
    const asuntoFinal = this.renderizado.renderizar(dto.asunto, contexto);
    const cuerpoHtmlFinal = this.renderizado.renderizar(
      sanitizarHtmlCorreo(dto.cuerpoHtml),
      contexto,
    );
    const cuerpoTextoFinal = dto.cuerpoTexto
      ? this.renderizado.renderizar(dto.cuerpoTexto, contexto)
      : null;

    const registro = this.correosRepo.create({
      plantilla_id: plantilla?.id ?? null,
      lead_id: lead.id,
      usuario_id: usuarioActual.sub,
      asunto_final: asuntoFinal,
      cuerpo_html_final: cuerpoHtmlFinal,
      cuerpo_texto_final: cuerpoTextoFinal,
      destinatario_email: lead.email ?? '',
      reply_to: agente.email,
      estado: EstadoCorreo.BORRADOR,
    });
    const guardado = await this.correosRepo.save(registro);
    this.logger.log(
      `Borrador guardado lead=${lead.id} usuario=${usuarioActual.email} correoId=${guardado.id}`,
    );
    return this.recargar(guardado.id);
  }

  async listarPorLead(
    leadId: string,
    usuarioActual: JwtUserPayload,
  ): Promise<CorreoEnviado[]> {
    const lead = await this.leadsRepo.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    if (
      usuarioActual.rol === Rol.AGENTE &&
      lead.asignado_a_id !== usuarioActual.sub
    ) {
      throw new ForbiddenException(
        'No tiene permisos para ver los correos de este lead',
      );
    }
    return this.correosRepo.find({
      where: { lead_id: leadId },
      order: { created_at: 'DESC' },
      relations: ['plantilla', 'usuario'],
    });
  }

  /** Permite previsualizar cómo queda una plantilla aplicada a un lead concreto. */
  async preview(
    plantillaId: string,
    leadId: string,
    usuarioActual: JwtUserPayload,
  ): Promise<{ asunto: string; cuerpoHtml: string; cuerpoTexto: string | null }> {
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

    const plantilla = await this.plantillasRepo.findOne({
      where: { id: plantillaId },
    });
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada');

    const agente = await this.usuariosRepo.findOne({
      where: { id: usuarioActual.sub },
    });
    if (!agente) throw new NotFoundException('Usuario actual no encontrado');

    const contexto = await this.armarContextoConConfig(lead, agente);
    return {
      asunto: this.renderizado.renderizar(plantilla.asunto, contexto),
      cuerpoHtml: this.renderizado.renderizar(plantilla.cuerpo_html, contexto),
      cuerpoTexto: plantilla.cuerpo_texto
        ? this.renderizado.renderizar(plantilla.cuerpo_texto, contexto)
        : null,
    };
  }

  // -------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------

  private async cargarBase(
    dto: EnviarCorreoDto,
    usuarioActual: JwtUserPayload,
  ): Promise<{ lead: Lead; agente: Usuario; plantilla: Plantilla | null }> {
    const lead = await this.leadsRepo.findOne({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    if (
      usuarioActual.rol === Rol.AGENTE &&
      lead.asignado_a_id !== usuarioActual.sub
    ) {
      throw new ForbiddenException(
        'No tiene permisos para enviar correos a este lead',
      );
    }

    const agente = await this.usuariosRepo.findOne({
      where: { id: usuarioActual.sub },
    });
    if (!agente) throw new NotFoundException('Usuario actual no encontrado');

    let plantilla: Plantilla | null = null;
    if (dto.plantillaId) {
      plantilla = await this.plantillasRepo.findOne({
        where: { id: dto.plantillaId },
      });
      if (!plantilla) throw new NotFoundException('Plantilla no encontrada');
    }

    return { lead, agente, plantilla };
  }

  private async armarContextoConConfig(lead: Lead, agente: Usuario) {
    // El bloque "Marca" se administra desde Configuracion → Marca/Empresa.
    // De ahí salen nombre, teléfono, email de contacto y logo. La URL de
    // la tienda sigue viniendo de WooCommerce porque es la URL canónica.
    const marca = await this.configuracionService.obtenerMarca();
    const credsWc =
      await this.configuracionService.obtenerCredencialesWoocommerce();
    const config: ConfigMarca = {
      nombreTienda: marca.nombreTienda,
      telefonoTienda: marca.telefonoTienda,
      emailContacto: marca.emailContacto,
      linkTienda: credsWc.url || '',
      logo: marca.logoUrl || undefined,
    };
    return this.renderizado.armarContexto(lead, agente, config);
  }

  private async recargar(id: string): Promise<CorreoEnviado> {
    const r = await this.correosRepo.findOne({
      where: { id },
      relations: ['plantilla', 'usuario', 'lead'],
    });
    if (!r) throw new NotFoundException('Correo no encontrado');
    return r;
  }
}
