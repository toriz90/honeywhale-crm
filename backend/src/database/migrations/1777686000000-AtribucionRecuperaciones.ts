import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Atribución honesta de recuperaciones.
 *
 * - Añade `leads.recuperado_por_agente` (NULL = no aplica / histórico,
 *   1 = recuperación con intervención humana, 0 = compra orgánica).
 * - Crea `eventos_recuperacion` para auditar cada decisión (automática del
 *   webhook o manual desde el CRM) junto con las señales detectadas.
 *
 * NO se hace backfill: los leads que ya están en RECUPERADO antes del deploy
 * quedan con `recuperado_por_agente = NULL` (histórico desconocido). El
 * frontend los etiquetará como "Recuperación histórica".
 */
export class AtribucionRecuperaciones1777686000000
  implements MigrationInterface
{
  name = 'AtribucionRecuperaciones1777686000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`leads\`
        ADD COLUMN \`recuperado_por_agente\` TINYINT(1) NULL DEFAULT NULL
        COMMENT 'NULL=no aplica/histórico, 1=recuperación con agente, 0=orgánica'
    `);

    await queryRunner.query(`
      CREATE TABLE \`eventos_recuperacion\` (
        \`id\` CHAR(36) NOT NULL,
        \`lead_id\` CHAR(36) NOT NULL,
        \`tipo\` ENUM(
          'AUTO_RECUPERADO',
          'AUTO_ORGANICO',
          'MANUAL_RECUPERADO',
          'REVERSION'
        ) NOT NULL,
        \`etapa_anterior\` VARCHAR(40) NULL,
        \`asignado_a_id\` CHAR(36) NULL,
        \`senales_detectadas\` JSON NOT NULL,
        \`origen\` ENUM('WEBHOOK_WC','MANUAL_AGENTE','CRON') NOT NULL,
        \`decidido_automaticamente\` TINYINT(1) NOT NULL,
        \`decidido_por_id\` CHAR(36) NULL,
        \`notas\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_eventos_lead_created\` (\`lead_id\`, \`created_at\`),
        INDEX \`idx_eventos_tipo\` (\`tipo\`),
        CONSTRAINT \`FK_eventos_recuperacion_lead\`
          FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_eventos_recuperacion_asignado\`
          FOREIGN KEY (\`asignado_a_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_eventos_recuperacion_decisor\`
          FOREIGN KEY (\`decidido_por_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`eventos_recuperacion\``);
    await queryRunner.query(`
      ALTER TABLE \`leads\` DROP COLUMN \`recuperado_por_agente\`
    `);
  }
}
