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
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
});
