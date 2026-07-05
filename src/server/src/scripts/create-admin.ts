import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AdminRole } from '../admin-users/entities/admin-user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(AdminUsersService);
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123456';
  const passwordHash = await bcrypt.hash(password, 10);
  await service.create({ username, passwordHash, role: AdminRole.SUPER });
  console.log(`管理员 ${username} 创建成功`);
  await app.close();
}
bootstrap();
