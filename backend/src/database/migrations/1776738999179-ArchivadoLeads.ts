import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArchivadoLeads1776738999179 implements MigrationInterface {
  name = 'ArchivadoLeads1776738999179';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`leads\`
        ADD COLUMN \`archivado\` TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`fecha_archivado\` DATETIME NULL,
        ADD COLUMN \`fecha_cambio_etapa\` DATETIME NULL
    `);

    await queryRunner.query(
      `CREATE INDEX \`IDX_leads_archivado_etapa\` ON \`leads\` (\`archivado\`, \`etapa\`)`,
    );

    // Backfill: leads históricos que ya terminaron en RECUPERADO/PERDIDO
    // no tienen registrada la fecha real del cambio de etapa. Aproximamos con
    // updated_at, que para este CRM suele coincidir con el último movimiento.
    await queryRunner.query(`
      UPDATE \`leads\`
         SET \`fecha_cambio_etapa\` = \`updated_at\`
       WHERE \`fecha_cambio_etapa\` IS NULL
         AND \`etapa\` IN ('RECUPERADO','PERDIDO')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_leads_archivado_etapa\` ON \`leads\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`leads\`
        DROP COLUMN \`fecha_cambio_etapa\`,
        DROP COLUMN \`fecha_archivado\`,
        DROP COLUMN \`archivado\`
    `);
  }
}
