import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterLeadsEmailNullable1713488400000 implements MigrationInterface {
  name = 'AlterLeadsEmailNullable1713488400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`leads\` MODIFY \`email\` VARCHAR(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`leads\` MODIFY \`email\` VARCHAR(180) NOT NULL`,
    );
  }
}
