import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { EtapaLead, Moneda } from './enums/etapa-lead.enum';

@Entity({ name: 'leads' })
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30 })
  telefono!: string;

  @Column({ type: 'varchar', length: 200 })
  producto!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto!: string;

  @Column({ type: 'enum', enum: Moneda, default: Moneda.MXN })
  moneda!: Moneda;

  @Index('IDX_leads_orden_woo_id')
  @Column({
    name: 'orden_woo_id',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  orden_woo_id!: string | null;

  @Index('IDX_leads_etapa')
  @Column({ type: 'enum', enum: EtapaLead, default: EtapaLead.NUEVO })
  etapa!: EtapaLead;

  @Column({
    name: 'motivo_abandono',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivo_abandono!: string | null;

  @Index('IDX_leads_asignado_a_id')
  @Column({ name: 'asignado_a_id', type: 'uuid', nullable: true })
  asignado_a_id!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'asignado_a_id' })
  asignadoA!: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notas!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at!: Date | null;
}
