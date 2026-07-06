import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783305843637 implements MigrationInterface {
  name = 'InitialSchema1783305843637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`admin_users\` (\`id\` varchar(36) NOT NULL, \`username\` varchar(50) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`role\` enum ('admin', 'super') NOT NULL DEFAULT 'admin', \`status\` enum ('active', 'disabled') NOT NULL DEFAULT 'active', \`nickname\` varchar(100) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2873882c38e8c07d98cb64f962\` (\`username\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`order_addresses\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`recipient\` varchar(50) NOT NULL, \`phone\` varchar(20) NOT NULL, \`province\` varchar(50) NOT NULL, \`city\` varchar(50) NOT NULL, \`district\` varchar(50) NOT NULL, \`address\` varchar(200) NOT NULL, \`remark\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`operation_logs\` (\`id\` varchar(36) NOT NULL, \`adminId\` varchar(255) NULL, \`action\` varchar(100) NOT NULL, \`target\` varchar(100) NULL, \`detail\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`orders\` (\`id\` varchar(36) NOT NULL, \`orderNo\` varchar(50) NOT NULL, \`productId\` varchar(255) NOT NULL, \`sellerId\` varchar(255) NOT NULL, \`openid\` varchar(100) NOT NULL, \`quantity\` int NOT NULL, \`unitPrice\` int NOT NULL, \`totalAmount\` int NOT NULL, \`status\` enum ('pending_payment', 'paid', 'address_pending', 'shipping_pending', 'shipped', 'aftersale_waiting', 'settlement_ready', 'closed', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending_payment', \`paidAt\` datetime NULL, \`wxTransactionId\` varchar(100) NULL, \`remark\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_9e116d4adfd60229dc662a81b0\` (\`orderNo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`shipments\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`company\` varchar(50) NOT NULL, \`trackingNo\` varchar(100) NOT NULL, \`shippedAt\` datetime NOT NULL, \`aftersaleStart\` datetime NULL, \`aftersaleEnd\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`payment_events\` (\`id\` varchar(36) NOT NULL, \`orderNo\` varchar(50) NOT NULL, \`rawBody\` text NOT NULL, \`verified\` tinyint NOT NULL DEFAULT 0, \`amount\` int NULL, \`result\` varchar(50) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refund_records\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`reason\` text NULL, \`operator\` varchar(100) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`products\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(200) NOT NULL, \`cover\` varchar(500) NULL, \`price\` int NOT NULL, \`isOnSale\` tinyint NOT NULL DEFAULT 1, \`defaultQuantity\` int NOT NULL DEFAULT '1', \`aftersaleDays\` int NOT NULL DEFAULT '7', \`groupQrcode\` varchar(500) NULL, \`intro\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`reward_records\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`productId\` varchar(255) NOT NULL, \`sellerId\` varchar(255) NOT NULL, \`beneficiaryId\` varchar(255) NOT NULL, \`rewardType\` enum ('seller', 'referral') NOT NULL, \`status\` enum ('estimated', 'ready', 'pending', 'processed', 'reversed', 'void') NOT NULL DEFAULT 'estimated', \`amount\` int NOT NULL, \`ruleSnapshot\` json NOT NULL, \`formula\` text NOT NULL, \`calculatedAt\` datetime NOT NULL, \`processedAmount\` int NULL, \`processedAt\` datetime NULL, \`remark\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`reward_rules\` (\`id\` varchar(36) NOT NULL, \`productId\` varchar(255) NULL, \`sellerId\` varchar(255) NULL, \`ruleType\` enum ('fixed_per_book', 'percentage', 'tier') NOT NULL DEFAULT 'percentage', \`baseValue\` int NOT NULL DEFAULT '0', \`threshold\` int NOT NULL DEFAULT '0', \`rate\` int NULL, \`fixedAmount\` int NULL, \`isDefault\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sellers\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(100) NOT NULL, \`sellerCode\` varchar(50) NOT NULL, \`school\` varchar(100) NULL, \`region\` varchar(100) NULL, \`phone\` varchar(50) NULL, \`parentId\` varchar(255) NULL, \`status\` enum ('active', 'disabled') NOT NULL DEFAULT 'active', \`remark\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`parent_id\` varchar(36) NULL, UNIQUE INDEX \`IDX_0b10ae08586c7678f669c41a9c\` (\`sellerCode\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`seller_qrcodes\` (\`id\` varchar(36) NOT NULL, \`sellerId\` varchar(255) NOT NULL, \`productId\` varchar(255) NULL, \`imageUrl\` varchar(500) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`seller_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`scan_logs\` (\`id\` varchar(36) NOT NULL, \`sellerCode\` varchar(50) NOT NULL, \`sellerId\` varchar(255) NULL, \`productId\` varchar(255) NULL, \`openid\` varchar(100) NOT NULL, \`scene\` varchar(100) NULL, \`ip\` varchar(100) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sellers\` ADD CONSTRAINT \`FK_c5dff1e8099a360fa7ef9b8327b\` FOREIGN KEY (\`parent_id\`) REFERENCES \`sellers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` ADD CONSTRAINT \`FK_379450dd44d9c955f4761cd9e48\` FOREIGN KEY (\`seller_id\`) REFERENCES \`sellers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`seller_qrcodes\` DROP FOREIGN KEY \`FK_379450dd44d9c955f4761cd9e48\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sellers\` DROP FOREIGN KEY \`FK_c5dff1e8099a360fa7ef9b8327b\``,
    );
    await queryRunner.query(`DROP TABLE \`scan_logs\``);
    await queryRunner.query(`DROP TABLE \`seller_qrcodes\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_0b10ae08586c7678f669c41a9c\` ON \`sellers\``,
    );
    await queryRunner.query(`DROP TABLE \`sellers\``);
    await queryRunner.query(`DROP TABLE \`reward_rules\``);
    await queryRunner.query(`DROP TABLE \`reward_records\``);
    await queryRunner.query(`DROP TABLE \`products\``);
    await queryRunner.query(`DROP TABLE \`refund_records\``);
    await queryRunner.query(`DROP TABLE \`payment_events\``);
    await queryRunner.query(`DROP TABLE \`shipments\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_9e116d4adfd60229dc662a81b0\` ON \`orders\``,
    );
    await queryRunner.query(`DROP TABLE \`orders\``);
    await queryRunner.query(`DROP TABLE \`operation_logs\``);
    await queryRunner.query(`DROP TABLE \`order_addresses\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2873882c38e8c07d98cb64f962\` ON \`admin_users\``,
    );
    await queryRunner.query(`DROP TABLE \`admin_users\``);
  }
}
