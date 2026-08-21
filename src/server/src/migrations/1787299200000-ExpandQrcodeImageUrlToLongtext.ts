import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandQrcodeImageUrlToLongtext1787299200000 implements MigrationInterface {
  name = 'ExpandQrcodeImageUrlToLongtext1787299200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('seller_qrcodes'))) return;
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` MODIFY \`imageUrl\` longtext NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('seller_qrcodes'))) return;
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` MODIFY \`imageUrl\` varchar(2000) NOT NULL`,
    );
  }
}
