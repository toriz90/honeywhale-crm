import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Plantilla } from '../plantillas/plantilla.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum EstadoCorreo {
  PENDIENTE = 'PENDIENTE',
  ENVIADO = 'ENVIADO',
  FALLIDO = 'FALLIDO',
  BORRADOR = 'BORRADOR',
}

@Entity({ name: 'correos_enviados' })
export class CorreoEnviado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plantilla_id', type: 'uuid', nullable: true })
  plantilla_id!: string | null;

  @ManyToOne(() => Plantilla, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plantilla_id' })
  plantilla!: Plantilla | null;

  @Column({ name: 'lead_id', type: 'uuid' })
  lead_id!: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuario_id!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario | null;

  @Column({ name: 'asunto_final', type: 'varchar', length: 255 })
  asunto_final!: string;

  @Column({ name: 'cuerpo_html_final', type: 'mediumtext' })
  cuerpo_html_final!: string;

  @Column({ name: 'cuerpo_texto_final', type: 'mediumtext', nullable: true })
  cuerpo_texto_final!: string | null;

  @Column({ name: 'destinatario_email', type: 'varchar', length: 255 })
  destinatario_email!: string;

  @Column({ name: 'reply_to', type: 'varchar', length: 255, nullable: true })
  reply_to!: string | null;

  @Index('IDX_correos_estado')
  @Column({
    type: 'enum',
    enum: EstadoCorreo,
    default: EstadoCorreo.PENDIENTE,
  })
  estado!: EstadoCorreo;

  @Column({ name: 'error_envio', type: 'text', nullable: true })
  error_envio!: string | null;

  @Column({ name: 'mensaje_id_smtp', type: 'varchar', length: 255, nullable: true })
  mensaje_id_smtp!: string | null;

  @Column({
    name: 'token_tracking',
    type: 'varchar',
    length: 120,
    nullable: true,
    unique: true,
  })
  token_tracking!: string | null;

  @Column({ name: 'fecha_envio', type: 'datetime', nullable: true })
  fecha_envio!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}
