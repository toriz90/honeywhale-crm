import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearIntegracionWoocommerce1745164800000
  implements MigrationInterface
{
  name = 'CrearIntegracionWoocommerce1745164800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`configuracion\`
        ADD COLUMN \`woocommerce_habilitado\` tinyint(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`woocommerce_url\` varchar(255) NULL,
        ADD COLUMN \`woocommerce_consumer_key\` varchar(255) NULL,
        ADD COLUMN \`woocommerce_consumer_secret_cifrado\` text NULL,
        ADD COLUMN \`woocommerce_webhook_secret_cifrado\` text NULL,
        ADD COLUMN \`woocommerce_ultima_sync\` datetime NULL
    `);

    // Reutilizamos `orden_woo_id` (ya existía VARCHAR(60) NULL) como identificador
    // único del pedido WooCommerce en leads, en lugar de agregar una columna
    // duplicada `id_pedido_woocommerce`. Lo único que hace falta es convertir
    // el índice en UNIQUE para poder hacer upsert / detectar duplicados.
    await queryRunner.query(
      `DROP INDEX \`IDX_leads_orden_woo_id\` ON \`leads\``,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_leads_orden_woo_id\` ON \`leads\` (\`orden_woo_id\`)`,
    );

    await queryRunner.query(`
      ALTER TABLE \`leads\`
        ADD COLUMN \`origen\` enum('MANUAL','WOOCOMMERCE','IMPORTADO')
          NOT NULL DEFAULT 'MANUAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`leads\` DROP COLUMN \`origen\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_leads_orden_woo_id\` ON \`leads\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_leads_orden_woo_id\` ON \`leads\` (\`orden_woo_id\`)`,
    );
    await queryRunner.query(`
      ALTER TABLE \`configuracion\`
        DROP COLUMN \`woocommerce_ultima_sync\`,
        DROP COLUMN \`woocommerce_webhook_secret_cifrado\`,
        DROP COLUMN \`woocommerce_consumer_secret_cifrado\`,
        DROP COLUMN \`woocommerce_consumer_key\`,
        DROP COLUMN \`woocommerce_url\`,
        DROP COLUMN \`woocommerce_habilitado\`
    `);
  }
}
