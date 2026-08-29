import { MigrationInterface, QueryRunner } from 'typeorm';

// 历史 schema 中 seller_qrcodes.seller / sellers.parent 的 JoinColumn
// 指向独立的 seller_id / parent_id 列，而业务代码读写的是 sellerId / parentId 列，
// 导致关联查询永远为 null（后台二维码列表看不到销售方、销售方列表看不到上级）。
// 实体已改为 JoinColumn 指向真实列，本迁移删除冗余列及其外键。
export class DropRedundantSellerRelationColumns1788003200000
  implements MigrationInterface
{
  name = 'DropRedundantSellerRelationColumns1788003200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.dropFkAndColumn(queryRunner, 'seller_qrcodes', 'seller_id');
    await this.dropFkAndColumn(queryRunner, 'sellers', 'parent_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('seller_qrcodes', 'seller_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`seller_qrcodes\` ADD \`seller_id\` varchar(36) NULL`,
      );
      await queryRunner.query(
        `UPDATE \`seller_qrcodes\` SET \`seller_id\` = \`sellerId\``,
      );
    }
    if (!(await queryRunner.hasColumn('sellers', 'parent_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD \`parent_id\` varchar(36) NULL`,
      );
      await queryRunner.query(
        `UPDATE \`sellers\` SET \`parent_id\` = \`parentId\``,
      );
    }
  }

  private async dropFkAndColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    if (!(await queryRunner.hasColumn(table, column))) return;
    // 外键名在不同环境可能不同（历史库由旧迁移创建），按列名动态查找
    const fks: Array<{ CONSTRAINT_NAME: string }> = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [table, column],
    );
    for (const fk of fks) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
      );
    }
    await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  }
}
