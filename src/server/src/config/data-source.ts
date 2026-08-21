import { DataSource } from 'typeorm';
import databaseConfig from './database.config';

const config = databaseConfig();
export default new DataSource({
  type: 'mysql',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  entities: config.entities,
  // 只加载数字时间戳开头的正式迁移，避免 *.spec.ts 被 CLI 当作迁移执行。
  migrations: [__dirname + '/../migrations/[0-9]*{.ts,.js}'],
});
