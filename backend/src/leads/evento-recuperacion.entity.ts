import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum TipoEventoRecuperacion {
  AUTO_RECUPERADO = 'AUTO_RECUPERADO',
  AUTO_ORGANICO = 'AUTO_ORGANICO',
  MANUAL_RECUPERADO = 'MANUAL_RECUPERADO',
  REVERSION = 'REVERSION',
}

export enum OrigenEvento {
  WEBHOOK_WC = 'WEBHOOK_WC',
  MANUAL_AGENTE = 'MANUAL_AGENTE',
  CRON = 'CRON',
}

@Entity({ name: 'eventos_recuperacion' })
@Index('idx_eventos_lead_created', ['leadId', 'createdAt'])
@Index('idx_eventos_tipo', ['tipo'])
export class EventoRecuperacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lead_id', type: 'char', length: 36 })
  leadId!: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @Column({
    type: 'enum',
    enum: TipoEventoRecuperacion,
  })
  tipo!: TipoEventoRecuperacion;

  @Column({
    name: 'etapa_anterior',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  etapaAnterior!: string | null;

  // Snapshot del agente al momento del evento. Se conserva aunque el lead se
  // reasigne después; por eso es columna independiente y no se deriva del Lead.
  @Column({
    name: 'asignado_a_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  asignadoAId!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'asignado_a_id' })
  asignadoA!: Usuario | null;

  @Column({ name: 'senales_detectadas', type: 'json' })
  senalesDetectadas!: string[];

  @Column({
    type: 'enum',
    enum: OrigenEvento,
  })
  origen!: OrigenEvento;

  @Column({ name: 'decidido_automaticamente', type: 'tinyint', width: 1 })
  decididoAutomaticamente!: boolean;

  @Column({
    name: 'decidido_por_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  decididoPorId!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decidido_por_id' })
  decididoPor!: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notas!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;
}
