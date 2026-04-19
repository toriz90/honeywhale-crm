import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearConfiguracion1713488500000 implements MigrationInterface {
  name = 'CrearConfiguracion1713488500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`configuracion\` (
        \`id\` int NOT NULL,
        \`smtp_host\` varchar(180) NULL,
        \`smtp_port\` int NULL DEFAULT 587,
        \`smtp_secure\` tinyint(1) NOT NULL DEFAULT 0,
        \`smtp_user\` varchar(180) NULL,
        \`smtp_password_cifrada\` text NULL,
        \`smtp_from_email\` varchar(180) NULL,
        \`smtp_from_nombre\` varchar(120) NULL,
        \`google_client_id\` varchar(255) NULL,
        \`google_client_secret_cifrado\` text NULL,
        \`google_redirect_uri\` varchar(255) NULL,
        \`google_habilitado\` tinyint(1) NOT NULL DEFAULT 0,
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updated_by_id\` varchar(36) NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_configuracion_updated_by_usuarios\`
          FOREIGN KEY (\`updated_by_id\`) REFERENCES \`usuarios\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT INTO \`configuracion\`
        (\`id\`, \`smtp_port\`, \`smtp_secure\`, \`google_habilitado\`)
      VALUES (1, 587, 0, 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`configuracion\` DROP FOREIGN KEY \`FK_configuracion_updated_by_usuarios\``,
    );
    await queryRunner.query(`DROP TABLE \`configuracion\``);
  }
}
