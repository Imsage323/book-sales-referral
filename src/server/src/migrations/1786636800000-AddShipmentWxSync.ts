import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipmentWxSync1786636800000 implements MigrationInterface {
  name = 'AddShipmentWxSync1786636800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
        ADD COLUMN \`companyId\` varchar(50) NULL,
        ADD COLUMN \`wxSyncStatus\` varchar(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN \`wxSyncError\` varchar(500) NULL,
        ADD COLUMN \`wxSyncedAt\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
        DROP COLUMN \`companyId\`,
        DROP COLUMN \`wxSyncStatus\`,
        DROP COLUMN \`wxSyncError\`,
        DROP COLUMN \`wxSyncedAt\``,
    );
  }
}
