# 企业小程序销售记账系统 - 项目路线图

> 本文件是项目真实进度源。每次完成开发、修复、文档补齐或重要调研后同步更新。

## 当前阶段

**Phase 1：基础架构与数据模型** — 已完成并验证

## 已完成

- [x] 项目根目录结构：`src/server`、`src/miniprogram`、`src/admin`、`tests`、`assets`、`docs`
- [x] NestJS 后端初始化（Node.js + NestJS 10 + TypeScript 5）
- [x] TypeORM + MySQL 数据库连接配置
- [x] 13 个核心数据实体（`admin_users`、`sellers`、`products`、`orders`、`order_addresses`、`shipments`、`refund_records`、`payment_events`、`scan_logs`、`reward_rules`、`reward_records`、`operation_logs`、`seller_qrcodes`）
- [x] 管理员认证模块（JWT、登录接口、`JwtStrategy`、`JwtAuthGuard`）
- [x] 操作日志模块（`OperationLogsService`、`OperationLogInterceptor`，best-effort）
- [x] 初始数据库迁移（`InitialSchema1783305843637`），已运行到本地 MySQL
- [x] 全局异常过滤器（`HttpExceptionFilter`）
- [x] 微信小程序原生项目骨架（6 个页面：buyer/index、result、address、group；seller/login、index）
- [x] Vue 3 + Element Plus 管理后台骨架（含 Login.vue）
- [x] 基础 E2E 测试（`test/auth.e2e-spec.ts`），2 个用例通过
- [x] 设计文档：`docs/superpowers/specs/2026-07-05-企业小程序销售记账系统设计.md`
- [x] Phase 1 实施计划：`docs/superpowers/plans/2026-07-05-phase1-infrastructure.md`
- [x] 本地 MySQL 环境（XAMPP @ `D:\Sql`，数据库 `book_sales`，root 无密码）
- [x] 初始管理员账号：`admin / admin123456`

## 验证结果

- `cd src/server && npm run build` ✅ 通过
- `cd src/server && npm run test:e2e` ✅ 2 个测试通过
- MySQL 数据库表确认 ✅ 13 张业务表 + `migrations` 表

## 环境配置

`src/server/.env` 已配置（本地开发）：

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=book_sales
JWT_SECRET=book-sales-jwt-secret-key-2026
JWT_EXPIRES_IN=7d
```

## 进行中

无

## 待办（下一阶段）

**Phase 2：销售方、产品和二维码**

- [ ] 销售方 CRUD（管理后台）
- [ ] 销售方上下级直接推荐关系维护
- [ ] 产品配置管理（一期默认一本书）
- [ ] `seller_code` 生成规则
- [ ] 微信小程序码生成（携带 `seller_code` + `product_id`）
- [ ] 二维码下载功能
- [ ] 二维码生成历史记录

## 阻塞

无

## 待确认

- 具体书名、售价、是否允许多本购买
- 返点规则（固定金额/比例、阶梯门槛、直接推荐奖励）
- 微信认证、商户号、支付回调域名准备情况
- 入群二维码维护方式
- 快递公司选择

## 技术栈

- 后端：Node.js + NestJS 10 + TypeScript 5 + TypeORM + MySQL 8
- 小程序：原生微信小程序
- 管理后台：Vue 3 + Element Plus + TypeScript
- 本地 MySQL：XAMPP（`D:\Sql`）

## 重要修复记录

- 修复 `Order` 和 `Seller` 实体中 `@Index({ unique: true })` 与 `@Column({ unique: true })` 重复导致的迁移失败
- 修复 `OperationLogInterceptor` 在测试关闭阶段的数据库连接错误，改为 best-effort 捕获
- 修复 E2E 测试中 `supertest` 的导入方式和全局路由前缀问题

## 最近更新

- 2026-07-06：Phase 1 完成，数据库迁移和 E2E 测试通过

## 维护规则

- 每次完成开发、修复、文档补齐或重要调研后，必须同步更新本文件。
- 纯查询、只读分析、临时命令、未改变项目状态的操作，不需要更新本文件。
- 只有已经实现并验证过的事项才能放进“已完成”。
- 未确认的信息写“待确认”，不要猜。
- 做完代码但未验证时，不得把事项标为已完成。
- 本文件只写会变化的进度，不写固定不变的项目背景。
