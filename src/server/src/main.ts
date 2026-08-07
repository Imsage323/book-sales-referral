import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { AdminUsersService } from './admin-users/admin-users.service';
import { AdminRole } from './admin-users/entities/admin-user.entity';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getCorsOrigins } from './config/cors.config';

async function bootstrap() {
  // rawBody: 微信支付回调验签需要原始报文
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: getCorsOrigins() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  await seedDefaultAdmin(app.get(AdminUsersService));

  await app.listen(process.env.PORT || 3000);
}

async function seedDefaultAdmin(service: AdminUsersService): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const existing = await service.findByUsername('admin');
    if (existing) return;

    const passwordHash = await bcrypt.hash('admin123456', 10);
    await service.create({
      username: 'admin',
      passwordHash,
      role: AdminRole.SUPER,
    });
    console.log('本地开发管理员账号 admin 已创建');
  } catch (error) {
    console.error('创建默认管理员账号失败:', error);
  }
}

bootstrap();
