import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CorreoEnviado } from './correo-enviado.entity';

export enum TipoTrackingEvento {
  ENVIADO = 'ENVIADO',
  ABIERTO = 'ABIERTO',
  CLICKEADO = 'CLICKEADO',
  CONVERTIDO = 'CONVERTIDO',
  REBOTE = 'REBOTE',
}

@Entity({ name: 'tracking_eventos' })
export class TrackingEvento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'correo_id', type: 'uuid' })
  correo_id!: string;

  @ManyToOne(() => CorreoEnviado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'correo_id' })
  correo!: CorreoEnviado;

  @Index('IDX_tracking_tipo_created')
  @Column({ type: 'enum', enum: TipoTrackingEvento })
  tipo!: TipoTrackingEvento;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  user_agent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;
}
