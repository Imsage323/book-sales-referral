# 仓库指南（AGENTS.md）

本文件面向 AI 编码代理，介绍本仓库的结构、技术栈、构建/测试命令与项目约定。阅读本文件即可在不熟悉项目的情况下开始工作。

## 项目概述

**企业小程序销售记账系统**（一期）：基于微信小程序的图书销售与返点记账系统。卖的是图书《高三学业生涯导航日历》，核心诉求：

- 订单可归属到具体销售方（通过携带 `seller_code` 的微信小程序码扫码进入）；
- 微信支付、地址、发货、售后观察期、退款状态可追踪；
- 销售返点 + 一层直接推荐奖励可计算、可溯源（`reward_rules` / `reward_records`）；
- 管理后台支持台账查看与 Excel 导出（SheetJS `xlsx`）。

运行时架构：**一个 NestJS 单体后端 + 两个前端**。后端同时通过 `@nestjs/serve-static` 托管管理后台静态产物（`admin-dist/`，排除 `/api*`），API 全局前缀为 `/api`，已启用 CORS。

三个角色端：

- 家长端（小程序）：扫码 → 产品页 → 创建订单 → 支付 → 填地址 → 结果页 → 入群引导；
- 销售方端（小程序）：登录、查看专属二维码、销售数据；
- 管理后台（Web）：销售方、产品、订单、发货、返点规则/记录、台账导出。

当前进度：真实微信支付集成代码已完成（JSAPI 下单、回调验签、主动对账、`wx.requestPayment`），`WX_PAY_ENABLED=true` 且密钥齐全时走真实支付，否则保持 mock 支付；商户号密钥到位后即可联调，见 `ROADMAP.md`。

## 目录结构

- `src/server/`：NestJS 10 + TypeScript 5 后端（唯一的服务端）。
- `src/admin/`：Vue 3 + Element Plus + TypeScript 管理后台（Vite 构建）。
- `src/miniprogram/`：原生微信小程序（TypeScript 源码 + 编译出的同名 `.js`，用微信开发者工具打开）。
- `demo/`：纯静态 HTML/JS 的交互演示稿 + Playwright 冒烟测试，与生产代码无关。
- `docs/`：设计文档（`docs/superpowers/specs/`）与实施计划（`docs/superpowers/plans/`）。
- `notes/`：需求笔记、操作清单等业务资料（已被根 `.gitignore` 忽略，不入库）。
- `assets/`：静态资源。`tests/`：预留目录，目前为空（真实测试在 `src/server` 内）。
- `scripts/check-cdp-proxy.ps1` + `docs/cdp-proxy-troubleshooting.md`：本机浏览器自动化/CDP 代理排障工具。
- `ROADMAP.md`：**项目真实进度源**，含已完成功能清单、验证结果、环境配置与待办。

## 技术栈与关键配置

| 端 | 技术 | 关键配置文件 |
|---|---|---|
| 后端 `src/server` | NestJS 10、TypeORM、MySQL 8（mysql2）、JWT（passport-jwt）、bcrypt、`@nestjs/schedule` 定时任务、class-validator | `package.json`、`nest-cli.json`、`tsconfig.json`、`src/config/database.config.ts`、`src/config/data-source.ts`、`.env` |
| 管理后台 `src/admin` | Vue 3、Element Plus、vue-router、axios、Vite 5、`vue-tsc` | `package.json`、`vite.config.ts`、`tsconfig.json`、`.env.production`（`VITE_API_BASE_URL=/api`） |
| 小程序 `src/miniprogram` | 原生微信小程序 + TypeScript（`tsc` 编译，无框架） | `app.json`、`project.config.json`、`tsconfig.json`、`package.json` |

注意：TypeScript 版本在 admin 和 miniprogram 中锁定为 `~5.3.3`（`vue-tsc` 与 TS 5.9 不兼容，曾踩坑，勿随意升级）。

## 构建、运行与测试命令

后端（在 `src/server/` 下执行；本地依赖 MySQL，见“环境配置”）：

- `npm ci`：安装依赖（各端均有 lockfile）。
- `npm run start:dev`：开发模式启动（watch），端口 3000。
- `npm run build` / `npm run start:prod`：构建到 `dist/` / 运行产物。
- `npm run test`：Jest 单元测试（`src/**/*.spec.ts`，约 24 个用例）。
- `npm run test:e2e`：E2E 测试（`test/*.e2e-spec.ts`，supertest 打全量 API，约 30 个用例）。
- `npm run lint` / `npm run format`：ESLint --fix / Prettier。
- `npm run migration:run` / `migration:show`：TypeORM 迁移（走 `src/config/data-source.ts`）。

管理后台（在 `src/admin/` 下）：`npm run dev`（Vite 5173 端口，`/api` 代理到 `localhost:3000`）、`npm run build`（先 `vue-tsc` 类型检查再 `vite build`）。

小程序（在 `src/miniprogram/` 下）：`npm run build`（`tsc` 把 `.ts` 编译为同名 `.js`，两类文件都会提交）；日常用微信开发者工具打开本目录预览/上传。修改 `.ts` 后必须重新编译。

demo 冒烟测试：`demo/smoke-test.cjs`（Playwright，需先本地静态服务在 4173 端口）与 `demo/smoke-test.py`。

## 代码组织与约定

后端按业务领域分 NestJS 模块（每个目录含 `*.module.ts` / `*.controller.ts` / `*.service.ts` / `dto/` / `entities/`）：

- `auth` + `admin-users`：管理员 JWT 认证；`main.ts` 启动时自动播种默认管理员 `admin / admin123456`。
- `sellers`：销售方 CRUD 与上下级推荐关系（`sellers.parentId`）；`seller-code.generator.ts` 生成销售方编码。
- `products`：产品配置（一期默认一本书）。
- `qrcodes` + `scan-logs`：小程序码生成（携带 `seller_code` + `product_id`）、下载、生成历史、扫码日志；公开接口 `GET /api/qrcodes/:id/resolve`、`GET /api/products/:id/public`。
- `orders`：订单（订单号格式 `O-YYYYMMDD-XXXX`）、地址、发货（`shipments`）、退款记录、支付事件（`payment_events`）。状态流转含 `pending_payment → paid → aftersale_waiting → settlement_ready`。
- `payments`：微信支付与微信登录。`wx-pay.service.ts` 用官方 `wechatpay-axios-plugin`（APIv3，微信支付公钥验签模式）做 JSAPI 下单、`wx.requestPayment` 参数二次签名、回调验签+AES-256-GCM 解密、按商户订单号主动查询；`wx-login.service.ts` 用 `jscode2session` 换 openid（未配置 AppID/Secret 时返回占位 openid）；`wx.controller.ts` 暴露公开接口 `POST /api/wx/login` 与 `POST /api/wx/notify`。`main.ts` 已开启 `rawBody` 供回调验签。
- `rewards`：返点规则匹配优先级「产品+销售方 → 产品 → 销售方 → 默认规则」，返点记录与一层直接推荐奖励；`settlement.service.ts` 每日凌晨 2 点定时结算（`@nestjs/schedule`），支持手动触发。
- `ledger`：台账 Excel 导出（`GET /api/ledger/export`，依赖 `xlsx`）。
- `operation-logs`：操作日志，`OperationLogInterceptor` 全局拦截、best-effort 写入（失败不阻断业务）。

通用约定：

- 金额单位在数据库与接口中为**分**，展示层换算为元。
- TypeORM `synchronize: false`，schema 一律走 `src/migrations/` 迁移，改了实体要新建迁移。
- API 全局前缀 `/api`；全局 `ValidationPipe({ whitelist, transform })` 与 `HttpExceptionFilter`。
- 业务术语字段保持一致：`seller_code`、`referrer_id`/`parentId`、`reward_rules`、`reward_records`、`wx_transaction_id`。
- 代码风格：2 空格缩进，Prettier `singleQuote: true, trailingComma: 'all'`（见 `src/server/.prettierrc`、`.eslintrc.js`）。管理后台为 Vue SFC + `<script setup lang="ts">` 风格，axios 实例在 `src/admin/src/api/index.ts`（token 存 localStorage，401 自动跳登录）。
- 小程序：`utils/api.ts` 封装 `wx.request`，base URL 取自 `app.ts` 的 `globalData.apiBaseUrl`（当前指向微信云托管 dev 环境）。
- 文件与注释可用中文；本仓库文档以中文为主。

## 环境配置与安全

- 后端环境变量在 `src/server/.env`（本地开发用，含 `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME/JWT_SECRET/JWT_EXPIRES_IN/PORT`）；生产示例见 `src/server/.env.example`。本地 MySQL 为 XAMPP（`D:\Sql`），数据库 `book_sales`，root 无密码。
- 微信支付/登录相关 `WX_*` 变量（集中由 `src/config/wx.config.ts` 读取）：`WX_APPID`、`WX_SECRET`（小程序登录）、`WX_MCHID`、`WX_PAY_SERIAL_NO`、`WX_PAY_APIV3_KEY`、`WX_PAY_PRIVATE_KEY` / `WX_PAY_PUBLIC_KEY`（PEM 内容单行存储、`\n` 转义）、`WX_PAY_PUBLIC_KEY_ID`、`WX_PAY_NOTIFY_URL`、`WX_PAY_ENABLED`。`WX_PAY_ENABLED=true` 且密钥齐全才走真实支付，否则 `POST /api/orders/:id/pay` 保持 mock 行为（E2E/单测默认 mock 模式）。
- **绝不要提交**真实密钥：`.env*`、微信支付商户密钥、JWT 生产密钥等。`.dockerignore` 会排除 `.env*` 和 `*.md`；生产值只在微信云托管控制台环境变量中配置。
- 注意：仓库历史上曾提交过含本地开发值的 `src/server/.env`（JWT_SECRET 等），如复用该密钥到生产必须先更换。

## 测试策略

- 新功能须同时补单元测试（服务/生成器，`*.spec.ts` 与源码同目录）和 E2E 测试（`src/server/test/*.e2e-spec.ts`，按模块命名，如 `orders.e2e-spec.ts`）。
- 提交前在 `src/server` 跑通 `npm run build`、`npm run test`、`npm run test:e2e`；改动管理后台时跑 `npm run build`（含 `vue-tsc` 类型检查）。
- E2E 注意点（踩过的坑）：supertest 导入方式、全局 `/api` 前缀、测试关闭阶段数据库连接（操作日志已改 best-effort）。

## 部署

- 根目录 `Dockerfile` 为多阶段构建：分别构建 server 和 admin，最终镜像 `npm ci --only=production` + 拷贝 `dist/` 与 `admin-dist/`，启动命令先跑 `typeorm migration:run` 再 `node dist/main`。
- 部署目标是**微信云托管**（dev 环境），绑定 GitHub 仓库 `Imsage323/book-sales-referral`，容器启动自动迁移；MySQL 为云托管数据库。
- 管理后台不单独部署，由后端容器托管（`/login`、`/sellers` 等前端路由回退 `index.html`）。

## Windows CDP 代理排障

本机浏览器自动化或 `web-access` 依赖检查失败时，先运行仓库包装脚本：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-cdp-proxy.ps1
```

不要直接调用裸 `bash`——它可能解析到 WindowsApps 的零字节别名而非 Git Bash，报 `指定的登录会话不存在`；包装脚本特意用 Git Bash 登录 shell。健康结果包含 `node: ok`、`chrome: ok`、`proxy: ready`。

若短命令退出时代理被回收，用前台模式并保持终端存活：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-cdp-proxy.ps1 -StartProxyForeground
```

详见 `docs/cdp-proxy-troubleshooting.md`。

## 进度维护规则（重要）

`ROADMAP.md` 是项目唯一进度源。每次完成开发、修复、文档补齐或重要调研后必须同步更新它；纯查询/只读操作不用更新。只有已实现**并验证过**的事项才能标为已完成，未确认的信息写“待确认”，不要猜。
