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

export enum CategoriaPlantilla {
  RECORDATORIO = 'RECORDATORIO',
  DESCUENTO = 'DESCUENTO',
  URGENCIA = 'URGENCIA',
  PERSONAL = 'PERSONAL',
  OTRO = 'OTRO',
}

@Entity({ name: 'plantillas_correo' })
export class Plantilla {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'varchar', length: 255 })
  asunto!: string;

  @Column({ name: 'cuerpo_html', type: 'mediumtext' })
  cuerpo_html!: string;

  @Column({ name: 'cuerpo_texto', type: 'mediumtext', nullable: true })
  cuerpo_texto!: string | null;

  @Index('IDX_plantillas_categoria')
  @Column({
    type: 'enum',
    enum: CategoriaPlantilla,
    default: CategoriaPlantilla.OTRO,
  })
  categoria!: CategoriaPlantilla;

  @Column({ name: 'temperaturas_recomendadas', type: 'json', nullable: true })
  temperaturas_recomendadas!: string[] | null;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creado_por!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por' })
  creadoPor!: Usuario | null;

  @Index('IDX_plantillas_activa')
  @Column({ type: 'boolean', default: true })
  activa!: boolean;

  @Column({ name: 'veces_usada', type: 'int', unsigned: true, default: 0 })
  veces_usada!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at!: Date | null;
}
