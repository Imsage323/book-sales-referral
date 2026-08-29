import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundWxFields1787995200000 implements MigrationInterface {
  name = 'AddRefundWxFields1787995200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`refund_records\`
        ADD COLUMN \`outRefundNo\` varchar(64) NULL,
        ADD COLUMN \`status\` enum('processing','success','abnormal','closed') NOT NULL DEFAULT 'processing',
        ADD COLUMN \`wxRefundId\` varchar(64) NULL,
        ADD UNIQUE INDEX \`IDX_refund_records_outRefundNo\` (\`outRefundNo\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`refund_records\`
        DROP INDEX \`IDX_refund_records_outRefundNo\`,
        DROP COLUMN \`outRefundNo\`,
        DROP COLUMN \`status\`,
        DROP COLUMN \`wxRefundId\``,
    );
  }
}
