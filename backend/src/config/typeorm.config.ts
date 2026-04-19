import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { Usuario } from '../usuarios/usuario.entity';
import { Lead } from '../leads/lead.entity';
import { Configuracion } from '../configuracion/configuracion.entity';

loadEnv({ path: join(process.cwd(), '.env') });

export const typeOrmOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'hw_mysql',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'honeywhale',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'honeywhale_crm',
  entities: [Usuario, Lead, Configuracion],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
};

export const AppDataSource = new DataSource(typeOrmOptions);
