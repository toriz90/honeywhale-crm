import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1713484800000 implements MigrationInterface {
  name = 'InitSchema1713484800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`usuarios\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(120) NOT NULL,
        \`email\` varchar(180) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`rol\` enum('ADMIN','SUPERVISOR','AGENTE') NOT NULL DEFAULT 'AGENTE',
        \`activo\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` timestamp(6) NULL DEFAULT NULL,
        UNIQUE INDEX \`IDX_usuarios_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`leads\` (
        \`id\` varchar(36) NOT NULL,
        \`nombre\` varchar(150) NOT NULL,
        \`email\` varchar(180) NOT NULL,
        \`telefono\` varchar(30) NOT NULL,
        \`producto\` varchar(200) NOT NULL,
        \`monto\` decimal(10,2) NOT NULL,
        \`moneda\` enum('MXN','USD') NOT NULL DEFAULT 'MXN',
        \`orden_woo_id\` varchar(60) NULL,
        \`etapa\` enum('NUEVO','CONTACTADO','EN_NEGOCIACION','OFERTA_ENVIADA','RECUPERADO','PERDIDO') NOT NULL DEFAULT 'NUEVO',
        \`motivo_abandono\` varchar(255) NULL,
        \`asignado_a_id\` varchar(36) NULL,
        \`notas\` text NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` timestamp(6) NULL DEFAULT NULL,
        INDEX \`IDX_leads_etapa\` (\`etapa\`),
        INDEX \`IDX_leads_asignado_a_id\` (\`asignado_a_id\`),
        INDEX \`IDX_leads_orden_woo_id\` (\`orden_woo_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`leads\`
      ADD CONSTRAINT \`FK_leads_asignado_a_usuarios\`
      FOREIGN KEY (\`asignado_a_id\`) REFERENCES \`usuarios\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`leads\` DROP FOREIGN KEY \`FK_leads_asignado_a_usuarios\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_leads_orden_woo_id\` ON \`leads\``);
    await queryRunner.query(`DROP INDEX \`IDX_leads_asignado_a_id\` ON \`leads\``);
    await queryRunner.query(`DROP INDEX \`IDX_leads_etapa\` ON \`leads\``);
    await queryRunner.query(`DROP TABLE \`leads\``);
    await queryRunner.query(`DROP INDEX \`IDX_usuarios_email\` ON \`usuarios\``);
    await queryRunner.query(`DROP TABLE \`usuarios\``);
  }
}
