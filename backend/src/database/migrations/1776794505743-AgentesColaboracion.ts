import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentesColaboracion1776794505743 implements MigrationInterface {
  name = 'AgentesColaboracion1776794505743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`leads\`
        ADD COLUMN \`fecha_asignacion\` DATETIME NULL,
        ADD COLUMN \`fecha_pedido_wc\` DATETIME NULL
    `);

    await queryRunner.query(
      `CREATE INDEX \`IDX_leads_fecha_pedido_wc\` ON \`leads\` (\`fecha_pedido_wc\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_leads_asignado_archivado\` ON \`leads\` (\`asignado_a_id\`, \`archivado\`)`,
    );

    // Backfill: leads ya asignados toman updated_at como aproximación de
    // cuándo el agente los tomó (no tenemos el timestamp real histórico).
    await queryRunner.query(`
      UPDATE \`leads\`
         SET \`fecha_asignacion\` = \`updated_at\`
       WHERE \`asignado_a_id\` IS NOT NULL
         AND \`fecha_asignacion\` IS NULL
    `);

    // Backfill: leads importados de WooCommerce toman created_at como
    // aproximación de la fecha real del pedido. Para los pedidos nuevos
    // entrantes el valor real se setea desde WoocommerceService.importarPedido().
    await queryRunner.query(`
      UPDATE \`leads\`
         SET \`fecha_pedido_wc\` = \`created_at\`
       WHERE \`orden_woo_id\` IS NOT NULL
         AND \`fecha_pedido_wc\` IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_leads_asignado_archivado\` ON \`leads\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_leads_fecha_pedido_wc\` ON \`leads\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`leads\`
        DROP COLUMN \`fecha_pedido_wc\`,
        DROP COLUMN \`fecha_asignacion\`
    `);
  }
}
