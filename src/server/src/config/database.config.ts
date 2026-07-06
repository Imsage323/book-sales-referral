import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', () => ({
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'book_sales',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // 已使用 migrations 管理 schema，关闭自动同步以避免与现有迁移冲突
  logging: process.env.NODE_ENV === 'development',
}));
