import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AdminRole } from '../admin-users/entities/admin-user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(AdminUsersService);
  const username = process.env.ADMIN_INITIAL_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password || password.length < 12) {
    throw new Error(
      '请设置 ADMIN_INITIAL_USERNAME 和至少 12 位的 ADMIN_INITIAL_PASSWORD',
    );
  }
  if (await service.findByUsername(username)) {
    throw new Error(`管理员 ${username} 已存在`);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await service.create({ username, passwordHash, role: AdminRole.SUPER });
  console.log(`管理员 ${username} 创建成功`);
  await app.close();
}
bootstrap();
