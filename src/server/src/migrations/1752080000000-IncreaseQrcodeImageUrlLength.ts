import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseQrcodeImageUrlLength1752080000000 implements MigrationInterface {
  name = 'IncreaseQrcodeImageUrlLength1752080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` MODIFY \`imageUrl\` varchar(2000) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` MODIFY \`imageUrl\` varchar(500) NOT NULL`,
    );
  }
}
