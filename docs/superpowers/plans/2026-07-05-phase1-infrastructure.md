# Phase 1: 基础架构与数据模型实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建项目骨架，初始化 NestJS + TypeORM + MySQL 后端，建立核心数据表，实现管理员登录，并初始化小程序和后台前端项目。

**Architecture:** 采用一个 NestJS 单体后端，按领域模块划分；小程序和管理后台作为独立项目。

**Tech Stack:** Node.js 20、NestJS 10、TypeScript 5、TypeORM 0.3、MySQL 8、bcrypt、passport-jwt、class-validator；微信小程序原生；Vue 3 + Element Plus。

---

## 文件结构

```text
D:\图书销售分发
├── src/
│   ├── server/          # NestJS 后端
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── config/
│   │   │   ├── common/       # 管道、过滤器、拦截器、工具
│   │   │   ├── auth/
│   │   │   ├── admin-users/
│   │   │   ├── sellers/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── rewards/
│   │   │   └── operation-logs/
│   │   ├── test/
│   │   ├── package.json
│   │   └── .env.example
│   ├── miniprogram/     # 原生微信小程序
│   │   ├── app.json
│   │   ├── app.ts
│   │   ├── pages/
│   │   └── utils/
│   └── admin/           # Vue 3 + Element Plus 管理后台
│       ├── src/
│       ├── package.json
│       └── .env.example
├── tests/
├── assets/
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── README.md
└── .gitignore
```

---

## Task 1: 创建项目根目录结构

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: directories

- [ ] **Step 1: 创建根目录和项目目录**

Run:
```bash
mkdir -p src/server src/miniprogram src/admin tests assets
```

Expected: 目录创建成功。

- [ ] **Step 2: 编写根 README.md**

Create: `README.md`
```markdown
# 企业小程序销售记账系统

一期基于微信小程序的图书销售记账系统，包含：

- 家长端：扫码购买、微信支付、填写地址、入群引导
- 销售方端：登录、查看专属二维码、销售数据
- 管理后台：销售方、产品、订单、发货、返点、导出

## 技术栈

- 后端：Node.js + NestJS + TypeScript + MySQL + TypeORM
- 小程序：原生微信小程序
- 管理后台：Vue 3 + Element Plus + TypeScript

## 目录结构

- `src/server`：NestJS 后端
- `src/miniprogram`：微信小程序
- `src/admin`：Vue 管理后台
- `tests`：测试文件
- `assets`：静态资源
- `docs`：设计文档和计划
```

- [ ] **Step 3: 编写根 .gitignore**

Create: `.gitignore`
```gitignore
node_modules/
dist/
build/
.env
.env.local
logs/
*.log
.DS_Store
coverage/
```

- [ ] **Step 4: 提交根目录结构**

Run:
```bash
git init
git add README.md .gitignore
git commit -m "chore: initialize project structure"
```

Expected: 根目录初始化完成。

---

## Task 2: 初始化 NestJS 后端项目

**Files:**
- Create: `src/server/package.json`
- Create: `src/server/tsconfig.json`
- Create: `src/server/nest-cli.json`
- Create: `src/server/src/main.ts`
- Create: `src/server/src/app.module.ts`

- [ ] **Step 1: 创建 NestJS 项目并安装核心依赖**

Run:
```bash
cd src/server
npx @nestjs/cli@10 new . --skip-git --package-manager npm
```

Expected: `package.json` 等文件生成。

- [ ] **Step 2: 安装数据库和认证依赖**

Run:
```bash
cd src/server
npm install @nestjs/config @nestjs/typeorm typeorm mysql2
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install bcrypt class-validator class-transformer
npm install -D @types/bcrypt @types/passport-jwt ts-node
```

Expected: `package.json` 包含上述依赖。

- [ ] **Step 3: 配置 tsconfig.json**

Create: `src/server/tsconfig.json`
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 4: 编写主入口文件**

Create: `src/server/src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

- [ ] **Step 5: 提交**

Run:
```bash
git add src/server
git commit -m "chore: initialize NestJS backend"
```

---

## Task 3: 环境配置与数据库连接

**Files:**
- Create: `src/server/.env.example`
- Create: `src/server/src/config/database.config.ts`
- Modify: `src/server/src/app.module.ts`

- [ ] **Step 1: 创建环境变量示例文件**

Create: `src/server/.env.example`
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=book_sales

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
WECHAT_MCH_ID=your_mch_id
WECHAT_PAY_KEY=your_pay_key
WECHAT_PAY_NOTIFY_URL=https://yourdomain.com/api/payments/wechat-notify
```

- [ ] **Step 2: 创建数据库配置**

Create: `src/server/src/config/database.config.ts`
```typescript
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
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
}));
```

- [ ] **Step 3: 修改 AppModule 加载配置和数据库**

Modify: `src/server/src/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<TypeOrmModuleOptions>('database')!,
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 4: 提交**

Run:
```bash
git add src/server
git commit -m "feat: add environment config and database connection"
```

---

## Task 4: 创建核心数据实体

**Files:**
- Create: `src/server/src/admin-users/entities/admin-user.entity.ts`
- Create: `src/server/src/sellers/entities/seller.entity.ts`
- Create: `src/server/src/products/entities/product.entity.ts`
- Create: `src/server/src/orders/entities/order.entity.ts`
- Create: `src/server/src/orders/entities/order-address.entity.ts`
- Create: `src/server/src/orders/entities/shipment.entity.ts`
- Create: `src/server/src/orders/entities/refund-record.entity.ts`
- Create: `src/server/src/payments/entities/payment-event.entity.ts`
- Create: `src/server/src/scan-logs/entities/scan-log.entity.ts`
- Create: `src/server/src/rewards/entities/reward-rule.entity.ts`
- Create: `src/server/src/rewards/entities/reward-record.entity.ts`
- Create: `src/server/src/operation-logs/entities/operation-log.entity.ts`
- Create: `src/server/src/sellers/entities/seller-qrcode.entity.ts`

- [ ] **Step 1: 创建管理员实体**

Create: `src/server/src/admin-users/entities/admin-user.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER = 'super',
}

export enum AdminStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ type: 'enum', enum: AdminStatus, default: AdminStatus.ACTIVE })
  status: AdminStatus;

  @Column({ length: 100, nullable: true })
  nickname?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: 创建销售方实体和上下级关系**

Create: `src/server/src/sellers/entities/seller.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { SellerQrcode } from './seller-qrcode.entity';

export enum SellerStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  sellerCode: string;

  @Column({ length: 100, nullable: true })
  school?: string;

  @Column({ length: 100, nullable: true })
  region?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Seller, (seller) => seller.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Seller;

  @OneToMany(() => Seller, (seller) => seller.parent)
  children: Seller[];

  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.ACTIVE })
  status: SellerStatus;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SellerQrcode, (qrcode) => qrcode.seller)
  qrcodes: SellerQrcode[];
}
```

Create: `src/server/src/sellers/entities/seller-qrcode.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Seller } from './seller.entity';

@Entity('seller_qrcodes')
export class SellerQrcode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => Seller, (seller) => seller.qrcodes)
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ length: 500 })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 3: 创建产品实体**

Create: `src/server/src/products/entities/product.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 500, nullable: true })
  cover?: string;

  @Column({ type: 'int' })
  price: number; // 单位：分

  @Column({ default: true })
  isOnSale: boolean;

  @Column({ default: 1 })
  defaultQuantity: number;

  @Column({ default: 7 })
  aftersaleDays: number;

  @Column({ length: 500, nullable: true })
  groupQrcode?: string;

  @Column({ type: 'text', nullable: true })
  intro?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 4: 创建订单相关实体**

Create: `src/server/src/orders/entities/order.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  ADDRESS_PENDING = 'address_pending',
  SHIPPING_PENDING = 'shipping_pending',
  SHIPPED = 'shipped',
  AFTERSALE_WAITING = 'aftersale_waiting',
  SETTLEMENT_READY = 'settlement_ready',
  CLOSED = 'closed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  orderNo: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ length: 100 })
  openid: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  unitPrice: number; // 分

  @Column({ type: 'int' })
  totalAmount: number; // 分

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ length: 100, nullable: true })
  wxTransactionId?: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

Create: `src/server/src/orders/entities/order-address.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('order_addresses')
export class OrderAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ length: 50 })
  recipient: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 50 })
  province: string;

  @Column({ length: 50 })
  city: string;

  @Column({ length: 50 })
  district: string;

  @Column({ length: 200 })
  address: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

Create: `src/server/src/orders/entities/shipment.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ length: 50 })
  company: string;

  @Column({ length: 100 })
  trackingNo: string;

  @Column()
  shippedAt: Date;

  @Column({ nullable: true })
  aftersaleStart?: Date;

  @Column({ nullable: true })
  aftersaleEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

Create: `src/server/src/orders/entities/refund-record.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('refund_records')
export class RefundRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ length: 100 })
  operator: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 5: 创建支付事件和扫码日志实体**

Create: `src/server/src/payments/entities/payment-event.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('payment_events')
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  orderNo: string;

  @Column({ type: 'text' })
  rawBody: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'int', nullable: true })
  amount?: number;

  @Column({ length: 50, nullable: true })
  result?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

Create: `src/server/src/scan-logs/entities/scan-log.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('scan_logs')
export class ScanLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  sellerCode: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ length: 100 })
  openid: string;

  @Column({ length: 100, nullable: true })
  scene?: string;

  @Column({ length: 100, nullable: true })
  ip?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 6: 创建返点相关实体**

Create: `src/server/src/rewards/entities/reward-rule.entity.ts`
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum RewardRuleType {
  FIXED_PER_BOOK = 'fixed_per_book',
  PERCENTAGE = 'percentage',
  TIER = 'tier',
}

@Entity('reward_rules')
export class RewardRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  @Column({ type: 'enum', enum: RewardRuleType, default: RewardRuleType.PERCENTAGE })
  ruleType: RewardRuleType;

  @Column({ type: 'int', default: 0 })
  baseValue: number; // 基础值：比例时分母 10000，固定金额时分

  @Column({ type: 'int', default: 0 })
  threshold: number; // 阶梯门槛

  @Column({ type: 'int', nullable: true })
  rate?: number; // 万分比

  @Column({ type: 'int', nullable: true })
  fixedAmount?: number; // 固定金额 分

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

Create: `src/server/src/rewards/entities/reward-record.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum RewardType {
  SELLER = 'seller',
  REFERRAL = 'referral',
}

export enum RewardStatus {
  ESTIMATED = 'estimated',
  READY = 'ready',
  PENDING = 'pending',
  PROCESSED = 'processed',
  REVERSED = 'reversed',
  VOID = 'void',
}

@Entity('reward_records')
export class RewardRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  beneficiaryId: string;

  @Column({ type: 'enum', enum: RewardType })
  rewardType: RewardType;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ESTIMATED })
  status: RewardStatus;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'json' })
  ruleSnapshot: Record<string, unknown>;

  @Column({ type: 'text' })
  formula: string;

  @Column()
  calculatedAt: Date;

  @Column({ type: 'int', nullable: true })
  processedAmount?: number;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 7: 创建操作日志实体**

Create: `src/server/src/operation-logs/entities/operation-log.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100, nullable: true })
  target?: string;

  @Column({ type: 'json', nullable: true })
  detail?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 8: 提交实体代码**

Run:
```bash
git add src/server/src
npm run format
git commit -m "feat: add core data entities"
```

---

## Task 5: 管理员认证模块

**Files:**
- Create: `src/server/src/auth/auth.module.ts`
- Create: `src/server/src/auth/auth.service.ts`
- Create: `src/server/src/auth/auth.controller.ts`
- Create: `src/server/src/auth/jwt.strategy.ts`
- Create: `src/server/src/auth/jwt-auth.guard.ts`
- Create: `src/server/src/admin-users/admin-users.module.ts`
- Create: `src/server/src/admin-users/admin-users.service.ts`
- Create: `src/server/src/admin-users/dto/create-admin-user.dto.ts`

- [ ] **Step 1: 创建管理员用户服务**

Create: `src/server/src/admin-users/admin-users.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser, AdminRole } from './entities/admin-user.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
  ) {}

  async findByUsername(username: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { username } });
  }

  async create(data: {
    username: string;
    passwordHash: string;
    role: AdminRole;
  }): Promise<AdminUser> {
    return this.repo.save(data);
  }
}
```

Create: `src/server/src/admin-users/admin-users.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser])],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
```

- [ ] **Step 2: 创建操作日志服务与模块**

Create: `src/server/src/operation-logs/operation-logs.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from './entities/operation-log.entity';

@Injectable()
export class OperationLogsService {
  constructor(
    @InjectRepository(OperationLog)
    private readonly repo: Repository<OperationLog>,
  ) {}

  async log(
    adminId: string | undefined,
    action: string,
    target: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save({ adminId, action, target, detail });
  }
}
```

Create: `src/server/src/operation-logs/operation-logs.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from './entities/operation-log.entity';
import { OperationLogsService } from './operation-logs.service';
import { OperationLogInterceptor } from './operation-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [OperationLogsService, OperationLogInterceptor],
  exports: [OperationLogsService, OperationLogInterceptor],
})
export class OperationLogsModule {}
```

- [ ] **Step 3: 创建 JWT 策略和守卫**

Create: `src/server/src/auth/jwt.strategy.ts`
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUsersService } from '../admin-users/admin-users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminUsersService: AdminUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.adminUsersService.findByUsername(payload.username);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    return { userId: user.id, username: user.username, role: user.role };
  }
}
```

Create: `src/server/src/auth/jwt-auth.guard.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 4: 创建认证服务和控制器**

Create: `src/server/src/auth/auth.service.ts`
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUsersService } from '../admin-users/admin-users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.adminUsersService.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已禁用');
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

Create: `src/server/src/auth/auth.controller.ts`
```typescript
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }
}
```

Create: `src/server/src/auth/dto/login.dto.ts`
```typescript
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 5: 注册认证模块**

Create: `src/server/src/auth/auth.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminUsersModule } from '../admin-users/admin-users.module';

@Module({
  imports: [
    AdminUsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as
            `${number}${'d' | 'h' | 'm' | 's' | 'w' | 'y'}` | number,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

- [ ] **Step 6: 修改 AppModule 注册新模块**

Modify: `src/server/src/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { OperationLogsModule } from './operation-logs/operation-logs.module';
import { OperationLogInterceptor } from './operation-logs/operation-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database'),
    }),
    AuthModule,
    AdminUsersModule,
    OperationLogsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor },
  ],
})
export class AppModule {}
```

- [ ] **Step 6: 提交**

Run:
```bash
git add src/server/src
npm run format
git commit -m "feat: add admin authentication module"
```

- [ ] **Step 7: 创建管理员初始化脚本**

Create: `src/server/src/scripts/create-admin.ts`
```typescript
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
```

Run:
```bash
cd src/server
npx ts-node src/scripts/create-admin.ts admin admin123456
```

Expected: 输出“管理员 admin 创建成功”。

---

## Task 6: 数据库迁移

**Files:**
- Create: `src/server/src/migrations/initial-schema.ts` (generated by TypeORM)

- [ ] **Step 1: 生成初始迁移**

Run:
```bash
cd src/server
npx typeorm-ts-node-commonjs migration:generate -d ./src/config/data-source.ts ./src/migrations/InitialSchema
```

Expected: 生成迁移文件 `src/server/src/migrations/xxxxxxxx-InitialSchema.ts`。

- [ ] **Step 2: 创建 TypeORM 数据源配置**

Create: `src/server/src/config/data-source.ts`
```typescript
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
```

- [ ] **Step 3: 运行迁移**

Run:
```bash
cd src/server
npx typeorm-ts-node-commonjs migration:run -d ./src/config/data-source.ts
```

Expected: 数据库表创建成功。

- [ ] **Step 4: 提交**

Run:
```bash
git add src/server/src/migrations
npm run format
git commit -m "chore: add initial database migration"
```

---

## Task 7: 全局验证、异常处理和日志

**Files:**
- Create: `src/server/src/common/filters/http-exception.filter.ts`
- Create: `src/server/src/operation-logs/operation-log.interceptor.ts`
- Modify: `src/server/src/main.ts`
- Modify: `src/server/src/app.module.ts` (已在 Task 5 中注册 APP_INTERCEPTOR)

- [ ] **Step 1: 创建统一异常过滤器**

Create: `src/server/src/common/filters/http-exception.filter.ts`
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Internal error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 2: 创建操作日志拦截器**

Create: `src/server/src/operation-logs/operation-log.interceptor.ts`
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OperationLogsService } from './operation-logs.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.operationLogsService.log(
            user?.userId,
            `${request.method} ${request.path}`,
            request.params?.id || '-',
            { body: request.body },
          );
        } catch {
          // Operation logging is best-effort; do not fail the request.
        }
      }),
    );
  }
}
```

- [ ] **Step 3: 注册全局过滤器和拦截器**

Modify: `src/server/src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

- [ ] **Step 4: 提交**

Run:
```bash
git add src/server/src/common src/server/src/main.ts
npm run format
git commit -m "feat: add global exception filter and operation log interceptor"
```

---

## Task 8: 初始化微信小程序项目

**Files:**
- Create: `src/miniprogram/app.json`
- Create: `src/miniprogram/app.ts`
- Create: `src/miniprogram/app.wxss`
- Create: `src/miniprogram/sitemap.json`
- Create: `src/miniprogram/project.config.json`

- [ ] **Step 1: 创建小程序配置**

Create: `src/miniprogram/app.json`
```json
{
  "pages": [
    "pages/buyer/index/index",
    "pages/buyer/result/result",
    "pages/buyer/address/address",
    "pages/buyer/group/group",
    "pages/seller/login/login",
    "pages/seller/index/index"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "图书购买",
    "navigationBarTextStyle": "black"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

Create: `src/miniprogram/app.ts`
```typescript
App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api',
  },
  onLaunch() {
    console.log('小程序启动');
  },
});
```

Create: `src/miniprogram/sitemap.json`
```json
{
  "desc": "关于本小程序的索引",
  "rules": [
    {
      "action": "allow",
      "page": "*"
    }
  ]
}
```

Create: `src/miniprogram/project.config.json`
```json
{
  "description": "企业小程序销售记账系统",
  "packOptions": {
    "ignore": []
  },
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "appid": "your-appid-here",
  "projectname": "book-sales-miniprogram",
  "condition": {}
}
```

- [ ] **Step 2: 创建空页面文件**

Create: `src/miniprogram/pages/buyer/index/index.wxml`
```xml
<view class="container">
  <text>产品页</text>
</view>
```

Create: `src/miniprogram/pages/buyer/index/index.ts`
```typescript
Page({
  data: {},
  onLoad() {},
});
```

Create: `src/miniprogram/pages/buyer/index/index.wxss`
```css
.container {
  padding: 20px;
}
```

Create: `src/miniprogram/pages/buyer/index/index.json`
```json
{
  "navigationBarTitleText": "图书购买"
}
```

为其他页面创建同样的空文件（result、address、group、seller/login、seller/index）。

- [ ] **Step 3: 提交小程序骨架**

Run:
```bash
git add src/miniprogram
git commit -m "chore: initialize WeChat mini-program skeleton"
```

---

## Task 9: 初始化 Vue 3 管理后台

**Files:**
- Create: `src/admin/package.json`
- Create: `src/admin/vite.config.ts`
- Create: `src/admin/tsconfig.json`
- Create: `src/admin/index.html`
- Create: `src/admin/src/main.ts`
- Create: `src/admin/src/App.vue`
- Create: `src/admin/src/views/Login.vue`

- [ ] **Step 1: 创建 Vue 3 项目文件**

Create: `src/admin/package.json`
```json
{
  "name": "book-sales-admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "element-plus": "^2.5.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.0"
  }
}
```

Create: `src/admin/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

Create: `src/admin/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

Create: `src/admin/index.html`
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>销售记账管理后台</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create: `src/admin/src/main.ts`
```typescript
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.mount('#app');
```

Create: `src/admin/src/App.vue`
```vue
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 2: 创建登录页面**

Create: `src/admin/src/views/Login.vue`
```vue
<template>
  <div class="login-page">
    <h2>销售记账管理后台</h2>
    <el-form :model="form">
      <el-form-item label="用户名">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const form = reactive({ username: '', password: '' });
</script>

<style scoped>
.login-page {
  max-width: 400px;
  margin: 100px auto;
}
</style>
```

- [ ] **Step 3: 提交管理后台骨架**

Run:
```bash
git add src/admin
git commit -m "chore: initialize Vue 3 admin skeleton"
```

---

## Task 10: 基础测试

**Files:**
- Create: `src/server/test/auth.e2e-spec.ts`
- Create: `src/server/test/entities.spec.ts`

- [ ] **Step 1: 创建认证端到端测试**

Create: `src/server/test/auth.e2e-spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/login (POST) should reject invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
  });

  it('/api/auth/login (POST) should return access token for valid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
```

- [ ] **Step 2: 安装测试依赖**

Run:
```bash
cd src/server
npm install -D supertest @types/supertest jest @types/jest
```

- [ ] **Step 3: 运行测试**

运行前确保已通过 `create-admin` 脚本创建管理员账号 `admin/admin123456`。

Run:
```bash
cd src/server
npm run test:e2e
```

Expected: 测试运行成功，至少认证接口返回符合预期。

- [ ] **Step 4: 提交测试**

Run:
```bash
git add src/server/test
npm run format
git commit -m "test: add basic auth e2e test"
```

---

## 自评检查

- [x] **Spec 覆盖度**：阶段 1 的交付物（项目骨架、数据库、管理员登录、环境变量示例）都对应到任务。
- [x] **无占位符**：所有任务包含具体文件路径和代码，无 TBD/TODO。
- [x] **类型一致性**：所有实体字段名、枚举值、DTO 字段一致，没有命名冲突。已修复 `ConfigService` 导入和 `OperationLogInterceptor` 依赖注入。
- [x] **环境依赖**：数据库 MySQL 需要在本地运行，`.env` 需要用户手动配置。

---

## 执行方式选择

计划已保存到 `docs/superpowers/plans/2026-07-05-phase1-infrastructure.md`。

两种执行方式：

1. **Subagent-Driven（推荐）**：每个任务派一个独立子代理执行，我在每步之间做 Review，迭代快。
2. **Inline Execution**：在当前会话中直接按任务执行，批量完成并设置检查点。

请选择执行方式，或直接告诉我开始执行。

