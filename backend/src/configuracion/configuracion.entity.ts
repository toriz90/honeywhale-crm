import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity({ name: 'configuracion' })
export class Configuracion {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 180, nullable: true })
  smtp_host!: string | null;

  @Column({ type: 'int', nullable: true, default: 587 })
  smtp_port!: number | null;

  @Column({ type: 'boolean', default: false })
  smtp_secure!: boolean;

  @Column({ type: 'varchar', length: 180, nullable: true })
  smtp_user!: string | null;

  @Column({ type: 'text', nullable: true })
  smtp_password_cifrada!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  smtp_from_email!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  smtp_from_nombre!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  google_client_id!: string | null;

  @Column({ type: 'text', nullable: true })
  google_client_secret_cifrado!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  google_redirect_uri!: string | null;

  @Column({ type: 'boolean', default: false })
  google_habilitado!: boolean;

  @Column({ type: 'boolean', default: false })
  woocommerce_habilitado!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  woocommerce_url!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  woocommerce_consumer_key!: string | null;

  @Column({ type: 'text', nullable: true })
  woocommerce_consumer_secret_cifrado!: string | null;

  @Column({ type: 'text', nullable: true })
  woocommerce_webhook_secret_cifrado!: string | null;

  @Column({ type: 'datetime', nullable: true })
  woocommerce_ultima_sync!: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updated_by_id!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy!: Usuario | null;
}
