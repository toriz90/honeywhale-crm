import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from '../usuario.entity';
import { Rol } from '../../common/enums/rol.enum';
import { AppDataSource } from '../../config/typeorm.config';

const logger = new Logger('AdminSeeder');

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@honeywhale.com';
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!password) {
    logger.warn(
      'ADMIN_SEED_PASSWORD no está definido. Se omite la creación del admin por defecto.',
    );
    return;
  }

  const repo: Repository<Usuario> = dataSource.getRepository(Usuario);
  const existente = await repo.findOne({ where: { email } });
  if (existente) {
    logger.log(`Usuario admin ya existe (${email}). No se crea de nuevo.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const nuevo = repo.create({
    nombre: 'Administrador',
    email,
    password: hash,
    rol: Rol.ADMIN,
    activo: true,
  });
  await repo.save(nuevo);
  logger.log(`Usuario admin creado correctamente: ${email}`);
}

async function run(): Promise<void> {
  const ds = await AppDataSource.initialize();
  try {
    await seedAdmin(ds);
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  run().catch((err) => {
    logger.error('Error al ejecutar el seeder de admin', err);
    process.exit(1);
  });
}
