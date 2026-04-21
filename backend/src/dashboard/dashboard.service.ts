import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Lead } from '../leads/lead.entity';
import { Usuario } from '../usuarios/usuario.entity';
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

export interface MetricaEtapa {
  cantidad: number;
  monto: number;
}

export interface MetricaAgente {
  usuarioId: string;
  nombre: string;
  rol: string;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
  conversionPct: number;
}

export interface MetricasMensuales {
  year: number;
  month: number;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
  comparativoMesAnterior: {
    recuperadosDeltaPct: number;
    perdidosDeltaPct: number;
  };
  porAgente: MetricaAgente[];
}

export interface MetricasMensualesSerie {
  year: number;
  month: number;
  etiqueta: string;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
}

export interface ActividadHoyAgente {
  usuarioId: string;
  nombre: string;
  rol: string;
  leadsTomadosHoy: number;
  contactadosHoy: number;
  recuperadosHoy: number;
  perdidosHoy: number;
}

function rangoMes(year: number, month: number): { desde: Date; hasta: Date } {
  if (month < 1 || month > 12) {
    throw new BadRequestException('Mes inválido (1-12)');
  }
  const desde = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const hasta = new Date(year, month, 1, 0, 0, 0, 0);
  return { desde, hasta };
}

function calcularDeltaPct(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

function redondearMonto(v: number): number {
  return Math.round(v * 100) / 100;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async actividadHoy(): Promise<ActividadHoyAgente[]> {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const usuarios = await this.usuariosRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    const elegibles = usuarios.filter(
      (u) => u.rol === Rol.AGENTE || u.rol === Rol.SUPERVISOR,
    );

    if (elegibles.length === 0) return [];

    const ids = elegibles.map((u) => u.id);

    type Conteo = { uid: string; n: string };

    // Una sola pasada por bucket: queries paralelas.
    const [tomados, contactados, recuperados, perdidos] = await Promise.all([
      this.leadsRepo
        .createQueryBuilder('lead')
        .select('lead.asignado_a_id', 'uid')
        .addSelect('COUNT(lead.id)', 'n')
        .where('lead.asignado_a_id IN (:...ids)', { ids })
        .andWhere('lead.fecha_asignacion >= :desde', { desde: inicioHoy })
        .groupBy('lead.asignado_a_id')
        .getRawMany<Conteo>(),
      this.contarPorEtapaHoy(EtapaLead.CONTACTADO, ids, inicioHoy),
      this.contarPorEtapaHoy(EtapaLead.RECUPERADO, ids, inicioHoy),
      this.contarPorEtapaHoy(EtapaLead.PERDIDO, ids, inicioHoy),
    ]);

    const sumar = (rows: Conteo[]): Map<string, number> => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.uid, Number(r.n));
      return m;
    };

    const mTomados = sumar(tomados);
    const mContactados = sumar(contactados);
    const mRecuperados = sumar(recuperados);
    const mPerdidos = sumar(perdidos);

    const filas: ActividadHoyAgente[] = elegibles.map((u) => ({
      usuarioId: u.id,
      nombre: u.nombre,
      rol: u.rol,
      leadsTomadosHoy: mTomados.get(u.id) ?? 0,
      contactadosHoy: mContactados.get(u.id) ?? 0,
      recuperadosHoy: mRecuperados.get(u.id) ?? 0,
      perdidosHoy: mPerdidos.get(u.id) ?? 0,
    }));

    filas.sort((a, b) => b.leadsTomadosHoy - a.leadsTomadosHoy);
    return filas;
  }

  private async contarPorEtapaHoy(
    etapa: EtapaLead,
    ids: string[],
    inicioHoy: Date,
  ): Promise<{ uid: string; n: string }[]> {
    return this.leadsRepo
      .createQueryBuilder('lead')
      .select('lead.asignado_a_id', 'uid')
      .addSelect('COUNT(lead.id)', 'n')
      .where('lead.asignado_a_id IN (:...ids)', { ids })
      .andWhere('lead.etapa = :etapa', { etapa })
      .andWhere('lead.fecha_cambio_etapa >= :desde', { desde: inicioHoy })
      .groupBy('lead.asignado_a_id')
      .getRawMany<{ uid: string; n: string }>();
  }

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

  async obtenerMetricasMensuales(
    year: number,
    month: number,
  ): Promise<MetricasMensuales> {
    const actual = await this.totalesPorEtapaEnMes(year, month);

    const mesAnterior = new Date(year, month - 2, 1);
    const anterior = await this.totalesPorEtapaEnMes(
      mesAnterior.getFullYear(),
      mesAnterior.getMonth() + 1,
    );

    const porAgente = await this.metricasPorAgente(year, month);

    return {
      year,
      month,
      recuperados: actual.recuperados,
      perdidos: actual.perdidos,
      comparativoMesAnterior: {
        recuperadosDeltaPct: calcularDeltaPct(
          actual.recuperados.cantidad,
          anterior.recuperados.cantidad,
        ),
        perdidosDeltaPct: calcularDeltaPct(
          actual.perdidos.cantidad,
          anterior.perdidos.cantidad,
        ),
      },
      porAgente,
    };
  }

  async obtenerMetricasUltimosMeses(
    n: number,
  ): Promise<MetricasMensualesSerie[]> {
    const n2 = Math.min(Math.max(1, n), 24);
    const ahora = new Date();
    const series: MetricasMensualesSerie[] = [];

    for (let i = n2 - 1; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;
      const totales = await this.totalesPorEtapaEnMes(year, month);
      series.push({
        year,
        month,
        etiqueta: fecha.toLocaleDateString('es-MX', {
          month: 'short',
          year: '2-digit',
        }),
        recuperados: totales.recuperados,
        perdidos: totales.perdidos,
      });
    }

    return series;
  }

  async generarExcelMensual(year: number, month: number): Promise<Buffer> {
    const { desde, hasta } = rangoMes(year, month);
    const metricas = await this.obtenerMetricasMensuales(year, month);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HoneyWhale CRM';
    workbook.created = new Date();

    const resumen = workbook.addWorksheet('Resumen');
    resumen.views = [{ state: 'frozen', ySplit: 1 }];

    const etiquetaMes = desde.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
    });

    resumen.getCell('A1').value = 'HoneyWhale CRM — Reporte mensual';
    resumen.getCell('A1').font = { size: 14, bold: true };
    resumen.mergeCells('A1:E1');
    resumen.getCell('A2').value = `Mes: ${etiquetaMes}`;
    resumen.getCell('A2').font = { italic: true };

    resumen.getCell('A4').value = 'Métrica';
    resumen.getCell('B4').value = 'Cantidad';
    resumen.getCell('C4').value = 'Monto';
    resumen.getCell('D4').value = 'Δ vs mes anterior (%)';
    resumen.getRow(4).font = { bold: true };

    resumen.getCell('A5').value = 'Recuperados';
    resumen.getCell('B5').value = metricas.recuperados.cantidad;
    resumen.getCell('C5').value = metricas.recuperados.monto;
    resumen.getCell('D5').value = metricas.comparativoMesAnterior.recuperadosDeltaPct;

    resumen.getCell('A6').value = 'Perdidos';
    resumen.getCell('B6').value = metricas.perdidos.cantidad;
    resumen.getCell('C6').value = metricas.perdidos.monto;
    resumen.getCell('D6').value = metricas.comparativoMesAnterior.perdidosDeltaPct;

    (['C5', 'C6'] as const).forEach((c) => {
      resumen.getCell(c).numFmt = '$#,##0.00';
    });

    resumen.getCell('A8').value = 'Desempeño por agente';
    resumen.getCell('A8').font = { bold: true, size: 12 };

    const headerAgentes = [
      'Agente',
      'Rol',
      'Recuperados (#)',
      'Recuperados ($)',
      'Perdidos (#)',
      'Perdidos ($)',
      '% Conversión',
    ];
    resumen.getRow(9).values = [null, ...headerAgentes];
    resumen.getRow(9).font = { bold: true };

    metricas.porAgente.forEach((a, idx) => {
      const row = resumen.getRow(10 + idx);
      row.values = [
        null,
        a.nombre,
        a.rol,
        a.recuperados.cantidad,
        a.recuperados.monto,
        a.perdidos.cantidad,
        a.perdidos.monto,
        a.conversionPct,
      ];
      row.getCell(5).numFmt = '$#,##0.00';
      row.getCell(7).numFmt = '$#,##0.00';
    });

    resumen.columns.forEach((col) => {
      col.width = 22;
    });

    await this.agregarHojaDetalle(
      workbook,
      'Recuperados',
      EtapaLead.RECUPERADO,
      desde,
      hasta,
      false,
    );
    await this.agregarHojaDetalle(
      workbook,
      'Perdidos',
      EtapaLead.PERDIDO,
      desde,
      hasta,
      true,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async totalesPorEtapaEnMes(
    year: number,
    month: number,
  ): Promise<{ recuperados: MetricaEtapa; perdidos: MetricaEtapa }> {
    const { desde, hasta } = rangoMes(year, month);
    const raw = await this.leadsRepo
      .createQueryBuilder('lead')
      .withDeleted()
      .select('lead.etapa', 'etapa')
      .addSelect('COUNT(lead.id)', 'cantidad')
      .addSelect('COALESCE(SUM(lead.monto), 0)', 'monto')
      .where('lead.etapa IN (:...etapas)', {
        etapas: [EtapaLead.RECUPERADO, EtapaLead.PERDIDO],
      })
      .andWhere('lead.fecha_cambio_etapa >= :desde', { desde })
      .andWhere('lead.fecha_cambio_etapa < :hasta', { hasta })
      .groupBy('lead.etapa')
      .getRawMany<{ etapa: EtapaLead; cantidad: string; monto: string }>();

    const find = (etapa: EtapaLead): MetricaEtapa => {
      const r = raw.find((x) => x.etapa === etapa);
      return {
        cantidad: r ? Number(r.cantidad) : 0,
        monto: r ? redondearMonto(Number(r.monto)) : 0,
      };
    };

    return {
      recuperados: find(EtapaLead.RECUPERADO),
      perdidos: find(EtapaLead.PERDIDO),
    };
  }

  private async metricasPorAgente(
    year: number,
    month: number,
  ): Promise<MetricaAgente[]> {
    const { desde, hasta } = rangoMes(year, month);
    const raw = await this.leadsRepo
      .createQueryBuilder('lead')
      .withDeleted()
      .innerJoin('lead.asignadoA', 'usuario')
      .select('usuario.id', 'usuarioId')
      .addSelect('usuario.nombre', 'nombre')
      .addSelect('usuario.rol', 'rol')
      .addSelect('lead.etapa', 'etapa')
      .addSelect('COUNT(lead.id)', 'cantidad')
      .addSelect('COALESCE(SUM(lead.monto), 0)', 'monto')
      .where('lead.etapa IN (:...etapas)', {
        etapas: [EtapaLead.RECUPERADO, EtapaLead.PERDIDO],
      })
      .andWhere('lead.fecha_cambio_etapa >= :desde', { desde })
      .andWhere('lead.fecha_cambio_etapa < :hasta', { hasta })
      .groupBy('usuario.id')
      .addGroupBy('usuario.nombre')
      .addGroupBy('usuario.rol')
      .addGroupBy('lead.etapa')
      .getRawMany<{
        usuarioId: string;
        nombre: string;
        rol: string;
        etapa: EtapaLead;
        cantidad: string;
        monto: string;
      }>();

    const map = new Map<string, MetricaAgente>();
    for (const r of raw) {
      const actual =
        map.get(r.usuarioId) ??
        ({
          usuarioId: r.usuarioId,
          nombre: r.nombre,
          rol: r.rol,
          recuperados: { cantidad: 0, monto: 0 },
          perdidos: { cantidad: 0, monto: 0 },
          conversionPct: 0,
        } satisfies MetricaAgente);

      const bucket =
        r.etapa === EtapaLead.RECUPERADO ? 'recuperados' : 'perdidos';
      actual[bucket] = {
        cantidad: Number(r.cantidad),
        monto: redondearMonto(Number(r.monto)),
      };
      map.set(r.usuarioId, actual);
    }

    const agentes = Array.from(map.values()).map((a) => {
      const denom = a.recuperados.cantidad + a.perdidos.cantidad;
      const conversionPct =
        denom > 0
          ? Math.round((a.recuperados.cantidad / denom) * 1000) / 10
          : 0;
      return { ...a, conversionPct };
    });

    agentes.sort(
      (a, b) => b.recuperados.cantidad - a.recuperados.cantidad ||
        b.recuperados.monto - a.recuperados.monto,
    );

    return agentes;
  }

  private async agregarHojaDetalle(
    workbook: ExcelJS.Workbook,
    nombreHoja: string,
    etapa: EtapaLead,
    desde: Date,
    hasta: Date,
    incluirMotivo: boolean,
  ): Promise<void> {
    const hoja = workbook.addWorksheet(nombreHoja);

    const leads = await this.leadsRepo
      .createQueryBuilder('lead')
      .withDeleted()
      .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
      .where('lead.etapa = :etapa', { etapa })
      .andWhere('lead.fecha_cambio_etapa >= :desde', { desde })
      .andWhere('lead.fecha_cambio_etapa < :hasta', { hasta })
      .orderBy('lead.fecha_cambio_etapa', 'DESC')
      .getMany();

    const columnas: Partial<ExcelJS.Column>[] = [
      { header: 'ID pedido WC', key: 'orden_woo_id', width: 18 },
      { header: 'Nombre', key: 'nombre', width: 24 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Teléfono', key: 'telefono', width: 16 },
      { header: 'Producto', key: 'producto', width: 28 },
      { header: 'Monto', key: 'monto', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Moneda', key: 'moneda', width: 10 },
      { header: 'Agente', key: 'agente', width: 22 },
      {
        header: 'Fecha creación',
        key: 'created_at',
        width: 20,
        style: { numFmt: 'dd/mm/yyyy hh:mm' },
      },
      {
        header: 'Fecha cambio etapa',
        key: 'fecha_cambio_etapa',
        width: 20,
        style: { numFmt: 'dd/mm/yyyy hh:mm' },
      },
    ];
    if (incluirMotivo) {
      columnas.push({
        header: 'Motivo abandono',
        key: 'motivo_abandono',
        width: 32,
      });
    }
    hoja.columns = columnas;
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];

    for (const l of leads) {
      hoja.addRow({
        orden_woo_id: l.orden_woo_id ?? '',
        nombre: l.nombre,
        email: l.email ?? '',
        telefono: l.telefono,
        producto: l.producto,
        monto: Number(l.monto),
        moneda: l.moneda,
        agente: l.asignadoA?.nombre ?? '',
        created_at: l.created_at,
        fecha_cambio_etapa: l.fecha_cambio_etapa,
        motivo_abandono: l.motivo_abandono ?? '',
      });
    }
  }
}
