# 企业小程序销售记账系统 - 项目路线图

> 本文件是项目真实进度源。每次完成开发、修复、文档补齐或重要调研后同步更新。

## 当前阶段

**Phase 4：部署准备（GitHub 仓库 + 微信云托管容器部署）** — 进行中

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
- [x] 销售方 CRUD（管理后台）
- [x] 销售方上下级直接推荐关系维护
- [x] 产品配置管理（一期默认一本书）
- [x] `seller_code` 生成规则
- [x] 微信小程序码生成（携带 `seller_code` + `product_id`，暂用占位图）
- [x] 二维码下载功能
- [x] 二维码生成历史记录
- [x] 扫码访问日志记录
- [x] 二维码公开解析接口（`GET /api/qrcodes/:id/resolve`）
- [x] 产品公开信息接口（`GET /api/products/:id/public`）
- [x] 订单模块（创建、查询、状态流转、地址填写）
- [x] 订单号生成器（`O-YYYYMMDD-XXXX`）
- [x] 发货模块（发货记录、售后观察期计算）
- [x] 小程序家长端产品页（扫码进入、数量选择、立即购买）
- [x] 小程序地址填写页与结果页
- [x] 小程序入群引导页
- [x] 管理后台订单管理页（列表、详情、改状态、发货）
- [x] 占位微信支付接口（`POST /api/orders/:id/pay`）
- [x] 订单支付状态流转：`pending_payment` → `paid`
- [x] 模拟微信支付单号生成与 `payment_events` 记录
- [x] 小程序支付确认页（`pages/buyer/pay/pay`）
- [x] 小程序购买流程：扫码 → 产品页 → 创建订单 → 模拟支付 → 填写地址 → 结果页
- [x] 管理后台订单详情显示微信支付单号
- [x] 台账导出模块（`LedgerModule`、`GET /api/ledger/export`）
- [x] 订单明细与销售汇总 Excel 导出
- [x] 订单列表支持按日期范围筛选
- [x] 管理后台“台账导出”页面（筛选、预览、下载）
- [x] 台账导出 E2E 测试
- [x] 售后观察期结算（`aftersale_waiting` → `settlement_ready`）
- [x] 定时结算扫描（`@nestjs/schedule`，每日凌晨 2 点）与手动触发结算
- [x] 返点规则管理（CRUD、`GET /api/rewards/rules`）
- [x] 返点规则匹配：产品+销售方 → 产品 → 销售方 → 默认规则
- [x] 返点记录生成（`reward_records`）
- [x] 一层直接推荐奖励（基于 `sellers.parentId`）
- [x] 返点记录管理（列表、详情、状态更新）
- [x] 管理后台“返点规则”和“返点记录”页面
- [x] 售后观察期与返点相关 E2E 测试

## 验证结果

- `cd src/server && npm run build` ✅ 通过
- `cd src/server && npm run test` ✅ 通过（15 个单元测试）
- `cd src/server && npm run test:e2e` ✅ 25 个测试通过（auth + sellers + products + qrcodes + scan-logs + orders + shipments + ledger + settlements + reward-rules + reward-records）
- `cd src/admin && npm run build` ✅ 通过
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

**Phase 4：部署准备（GitHub 仓库 + 微信云托管容器部署）**

- [ ] 创建 GitHub 仓库 `Imsage323/book-sales-referral` 并推送本地代码
- [ ] 为后端添加 `Dockerfile` 与 `.dockerignore`
- [ ] 添加 TypeORM 迁移脚本（`migration:run` / `migration:show`）
- [ ] 在微信云托管绑定 GitHub 仓库并配置环境变量
- [ ] 在微信云托管创建/连接 MySQL 数据库并运行首次迁移
- [ ] 验证云托管后端服务可访问（健康检查或登录接口）

**Phase 3.2（真实化）：微信支付真实集成**

- [ ] 微信小程序登录获取真实 `openid`
- [ ] 微信支付统一下单接口（接入商户号 / APIv3）
- [ ] 微信支付回调处理（验签、幂等、更新订单状态）
- [ ] 小程序端调用 `wx.requestPayment` 调起微信支付
- [ ] 替换模拟支付单号生成逻辑，写入真实 `wxTransactionId`

**Phase 3.3：售后观察期与返点** ✅ 已完成

- [x] 售后观察期自动/手动结算
- [x] 返点规则配置（固定金额/比例/阶梯）
- [x] 预计返点与最终返点计算
- [x] 一层直接推荐奖励
- [x] 返点溯源记录
- [x] 管理后台返点处理页

**Phase 3.4（完整化）：台账与导出（含返点台账）**

- [ ] 返点台账导出（依赖 Phase 3.3 的 reward_records 数据）
- [ ] 更多汇总维度：按产品、按地区、按时间段
- [ ] 发货明细独立台账 sheet

## 阻塞

无

## 待确认

- [x] 书名、是否允许多本购买：书名《高三学业生涯导航日历》，允许多本购买
- [ ] 售价（暂用占位价 0.01 元）
- [x] 返点规则：已使用占位规则（默认销售奖励 1 分/本、推荐奖励 0.5 分/本），后续可替换为真实规则
- [ ] 微信认证、商户号、支付回调域名准备情况
- [ ] 入群二维码维护方式
- [ ] 快递公司选择

## 技术栈

- 后端：Node.js + NestJS 10 + TypeScript 5 + TypeORM + MySQL 8
- 小程序：原生微信小程序
- 管理后台：Vue 3 + Element Plus + TypeScript
- 本地 MySQL：XAMPP（`D:\Sql`）

## 重要修复记录

- 修复 `Order` 和 `Seller` 实体中 `@Index({ unique: true })` 与 `@Column({ unique: true })` 重复导致的迁移失败
- 修复 `OperationLogInterceptor` 在测试关闭阶段的数据库连接错误，改为 best-effort 捕获
- 修复 E2E 测试中 `supertest` 的导入方式和全局路由前缀问题
- 关闭 TypeORM `synchronize`，避免与现有迁移脚本冲突导致启动时报错
- 修复管理后台 `vue-tsc` 与 TypeScript 5.9 不兼容问题，将 `typescript` 锁定为 `~5.3.3`

## 最近更新

- 2026-07-06：Phase 4 部署准备开始，创建 GitHub 仓库 https://github.com/Imsage323/book-sales-referral，添加后端 Dockerfile、.dockerignore 与 TypeORM 迁移脚本
- 2026-07-06：Phase 3.3 完成，实现售后观察期结算、返点规则/记录管理、一层直接推荐奖励，使用占位返点规则，单元测试与 E2E 测试全部通过
- 2026-07-06：Phase 3.4（订单/发货台账 + 销售汇总）完成，新增 `LedgerModule`、Excel 导出接口、管理后台台账导出页面，单元测试与 E2E 测试全部通过
- 2026-07-06：Phase 3.2（占位版）完成，实现模拟支付接口、小程序支付确认页、`payment_events` 记录，单元测试与 E2E 测试全部通过
- 2026-07-06：Phase 3.1 完成，实现扫码产品页、订单创建、地址填写、发货管理及对应管理后台和小程序页面
- 2026-07-06：Phase 2 完成，销售方、产品、二维码模块及对应管理后台页面开发完成，单元测试与 E2E 测试全部通过
- 2026-07-06：Phase 1 完成，数据库迁移和 E2E 测试通过

## 维护规则

- 每次完成开发、修复、文档补齐或重要调研后，必须同步更新本文件。
- 纯查询、只读分析、临时命令、未改变项目状态的操作，不需要更新本文件。
- 只有已经实现并验证过的事项才能放进“已完成”。
- 未确认的信息写“待确认”，不要猜。
- 做完代码但未验证时，不得把事项标为已完成。
- 本文件只写会变化的进度，不写固定不变的项目背景。
