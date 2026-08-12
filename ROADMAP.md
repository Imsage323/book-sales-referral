# 企业小程序销售记账系统 - 项目路线图

> 本文件是项目真实进度源。每次完成开发、修复、文档补齐或重要调研后同步更新。

## 当前阶段

**Phase 5（上线准备与发布验收）** — 域名 ICP 备案和小程序备案已完成；生产登录/支付 fail-closed 与 TLS 代码整改已完成自动验证。2026-08-12 云托管已完成新代码部署：线上 `/api/wx/diag` 返回 `wx-login-v4` 且 `loginMode=real`，`/api/products/storefront` 返回默认直营入口，历史上已完成一次 0.01 元真机支付。以上不等于当前发布候选已验收：真实支付回调落库、微信订单发货管理、真实小程序码、隐私与合法域名、其余安全整改、默认审核入口、正式业务参数、退款客服及分销合规仍是上线前事项。

## 当前状态快照（2026-08-12）

- [x] 域名 ICP 备案完成（用户于 2026-08-06 确认）
- [x] 微信小程序备案完成（用户于 2026-08-07 确认）
- [x] 自有域名已绑定云托管并可通过 HTTPS 访问
- [x] 线上 `/api/wx/diag` 返回 `wx-login-v4`、`loginMode=real`、`hasAppid=true`、`hasSecret=true`（2026-08-12 实测）
- [x] 线上 `/api/products/storefront` 返回默认直营销售方 `SMFMSVV` 与默认商品（2026-08-12 实测）
- [x] 云托管新代码部署完成：补齐 `WX_LOGIN_MODE=real`/`WX_PAY_MODE=real` 后从 `feat/ui-redesign`（`eb0cdcd`）重新构建部署成功
- [x] 本地 Phase 5 Task 2 代码完成：显式 `WX_LOGIN_MODE`/`WX_PAY_MODE`、生产启动校验、生产禁用 mock、TLS 校验恢复；已部署上线
- [x] 本地 Phase 5 Task 3 代码完成：买家 JWT、订单归属鉴权、操作日志脱敏、生产管理员安全初始化与 CORS 收敛；线上与真机人工验收待完成
- [x] 本地 Phase 5 Task 4 代码完成：默认 storefront、无 scene 入口、隐私授权、剪贴板保护、地址/结果页审核信息与首发页面收敛；微信后台配置和真机验收待完成
- [x] 历史 0.01 元真机支付冒烟成功（2026-07-23）
- [ ] 当前发布候选完成真实登录、下单、支付、有效回调落库及主动对账验收
- [ ] 公安联网备案重新核查完成

## 已完成

- [x] 项目根目录结构：`src/server`、`src/miniprogram`、`src/admin`、`tests`、`assets`、`docs`
- [x] NestJS 后端初始化（Node.js + NestJS 10 + TypeScript 5）
- [x] TypeORM + MySQL 数据库连接配置
- [x] 13 个核心数据实体（`admin_users`、`sellers`、`products`、`orders`、`order_addresses`、`shipments`、`refund_records`、`payment_events`、`scan_logs`、`reward_rules`、`reward_records`、`operation_logs`、`seller_qrcodes`）
- [x] 管理员认证模块（JWT、登录接口、`JwtStrategy`、`JwtAuthGuard`）
- [x] 操作日志模块（`OperationLogsService`、`OperationLogInterceptor`，best-effort）
- [x] 初始数据库迁移（`InitialSchema1783305843637`），已运行到本地 MySQL
- [x] 全局异常过滤器（`HttpExceptionFilter`）
- [x] 微信小程序原生项目骨架（7 个页面：buyer/index、pay、address、result、group；seller/login、index）
- [x] Vue 3 + Element Plus 管理后台骨架（含 Login.vue）
- [x] 基础 E2E 测试（`test/auth.e2e-spec.ts`），2 个用例通过
- [x] 设计文档：`docs/superpowers/specs/2026-07-05-企业小程序销售记账系统设计.md`
- [x] Phase 1 实施计划：`docs/superpowers/plans/2026-07-05-phase1-infrastructure.md`
- [x] Phase 5 上线整改实施计划：`docs/superpowers/plans/2026-08-06-phase5-miniprogram-launch-readiness.md`
- [x] 本地 MySQL 环境（XAMPP @ `D:\Sql`，数据库 `book_sales`，root 无密码）
- [x] 本地开发存在固定默认管理员播种（生产环境移除固定账号口令播种列入 Phase 5）
- [x] 销售方 CRUD（管理后台）
- [x] 销售方上下级直接推荐关系维护
- [x] 产品配置管理（一期默认一本书）
- [x] `seller_code` 生成规则
- [x] 小程序码记录、下载与解析骨架（当前为占位 SVG；真实可扫码小程序码列入 Phase 5）
- [x] 二维码下载功能
- [x] 二维码生成历史记录
- [x] 扫码访问日志记录
- [x] 二维码公开解析接口（`GET /api/qrcodes/:id/resolve`）
- [x] 产品公开信息接口（`GET /api/products/:id/public`）
- [x] 订单模块（创建、查询、状态流转、地址填写）
- [x] 订单号生成器（`O-YYYYMMDD-XXXX`）
- [x] 内部发货模块（本系统发货记录、售后观察期计算；尚未接入微信订单发货管理）
- [x] 小程序家长端产品页（扫码进入、数量选择、立即购买）
- [x] 小程序地址填写页与结果页
- [x] 小程序入群引导页
- [x] 管理后台订单管理页（列表、详情、改状态、发货）
- [x] 占位微信支付接口（`POST /api/orders/:id/pay`）
- [x] 订单支付状态流转：`pending_payment` → `paid`
- [x] 模拟微信支付单号生成与 `payment_events` 记录
- [x] 小程序支付确认页（`pages/buyer/pay/pay`）
- [x] 小程序 mock 购买流程：扫码 → 产品页 → 创建订单 → 模拟支付 → 填写地址 → 结果页
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
- [x] GitHub 仓库：`https://github.com/Imsage323/book-sales-referral`
- [x] 后端 `Dockerfile` 与 `.dockerignore`
- [x] 容器启动自动运行 TypeORM 迁移
- [x] 微信云托管后端部署（dev 环境）
- [x] 云托管 MySQL 数据库与 `book_sales` 数据库创建
- [x] 基础生产环境变量配置（`NODE_ENV=production`、数据库、JWT、微信登录/支付变量；Phase 5 新增 mode 变量与证书仍待部署前脱敏复核）
- [x] 后端启用 CORS 支持管理后台跨域访问
- [x] 管理后台生产环境 API 地址配置（`.env.production`）
- [x] 管理后台静态构建产物（`src/admin/dist`）
- [x] 管理后台集成到后端服务（`@nestjs/serve-static` 静态文件服务 + 仓库根目录 `Dockerfile` 多阶段构建）
- [x] 微信支付真实集成代码（mock/真实双模式；生产 fail-closed 代码已完成，云托管部署与发布候选完整验收仍待办）
  - `wx.config.ts` 集中读取 `WX_*` 环境变量，`main.ts` 开启 `rawBody`
  - `payments` 模块：JSAPI 下单、`wx.requestPayment` 参数二次签名、回调验签 + AES-256-GCM 解密、按商户订单号主动查询（官方 `wechatpay-axios-plugin`，微信支付公钥模式）
  - `POST /api/wx/login`（code 换 openid；占位 openid 仅允许 development/test 显式 mock）与 `POST /api/wx/notify`（验签失败 401 + FAIL，成功幂等落库）
  - 订单侧：`payOrder` 真实模式返回支付参数不置 paid、`POST :id/pay-sync` 主动对账、`markPaid` 回调/对账/mock 共用
  - 小程序端：启动静默登录并只缓存买家 JWT；下单、扫码日志、订单详情、地址、支付和对账均从认证上下文取得 openid；支付页接入 `wx.requestPayment` + 对账

## 历史验证快照

> 下列结果来自对应开发阶段，不能替代 Phase 5 最终发布候选的全量验证。

- `cd src/server && npm run build` ✅ 通过
- `cd src/server && npm run test` ✅ 通过（24 个单元测试，含 wx-pay 签名/验签解密/金额校验与 orders 真实模式用例）
- `cd src/server && npm run test:e2e` ✅ 30 个测试通过（auth + sellers + products + qrcodes + scan-logs + orders + shipments + ledger + settlements + reward-rules + reward-records + payments）
- `cd src/miniprogram && npm run build` ✅ 通过
- `cd src/admin && npm run build` ✅ 通过
- 本地验证后端 `/api/auth/login` ✅ 通过
- 本地验证 `/login`、`/sellers` 等前端路由返回 `index.html` ✅ 通过
- 本地验证 `/assets/...` 静态资源 ✅ 通过
- MySQL 数据库表确认 ✅ 13 张业务表 + `migrations` 表
- 2026-08-06 线上 `/api/wx/diag` ✅ 返回 `wx-login-v3`、`hasAppid=true`、`hasSecret=true`（仅证明版本和配置存在，不代表真实登录闭环已验收）
- 2026-07-23 真机 0.01 元 `wx.requestPayment` ✅ 冒烟成功（当前发布候选的有效回调落库仍待验收）

## Phase 5 验证（2026-08-06）

- `cd src/server && npm run build` ✅ 通过
- `cd src/server && npm run test -- --runInBand` ✅ 34 个单元测试通过
- `cd src/server && npm run test:e2e -- --runInBand` ✅ 32 个 E2E 通过
- 生产安全用例 ✅ mock 登录/支付在 production 返回 503，订单保持 `pending_payment`
- TLS 用例 ✅ 微信登录请求不再设置 `rejectUnauthorized: false`

## Phase 5 最近验证（2026-08-07）

- `npm.cmd --prefix .\src\server run build` ✅ 通过
- `npm.cmd --prefix .\src\server run test -- --runInBand` ✅ 39 个单元测试通过
- `npm.cmd --prefix .\src\server run test:e2e -- --runInBand` ✅ 35 个 E2E 通过
- `npm.cmd --prefix .\src\miniprogram run build` ✅ 通过
- 买家订单安全用例 ✅ 买家只能访问自己的订单，买家/管理员 token 不可混用，无 token 拒绝访问
- 日志安全用例 ✅ 登录及买家接口不保存请求 body，管理接口敏感字段递归脱敏
- Task 4 storefront 用例 ✅ 未配置默认销售方/商品时返回 503，显式配置后才返回直营入口
- Task 4 小程序配置 ✅ `app.json` 启用隐私检查，首发仅保留家长购买页面，项目与本机配置均启用域名校验
- Task 4 构建后复验 ✅ 39 个单元测试、37 个 E2E、server/miniprogram build、JSON 解析和 `git diff --check` 通过

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
JWT_SECRET=<local-development-secret>
JWT_EXPIRES_IN=7d
DEFAULT_PRODUCT_ID=595f08d3-d92b-4c83-9445-1d743633ad1c
DEFAULT_SELLER_CODE=SMFMSVV
```

Phase 5 Task 2 未修改真实 `src/server/.env`；2026-08-07 经用户确认补入本地直营销售方与默认商品参数。本地若需 mock，必须在 `NODE_ENV=development/test` 下显式设置 `WX_LOGIN_MODE=mock`、`WX_PAY_MODE=mock`。2026-08-12 云托管已补入 `WX_LOGIN_MODE=real`、`WX_PAY_MODE=real` 并完成新版部署，storefront 变量已经公开接口验证生效。

## 进行中

- [ ] Phase 5 上线整改与发布准备：Task 2、Task 3、Task 4 代码与自动验证完成，云托管部署已完成（2026-08-12），微信后台配置及真机人工验收待确认；其余任务待开发，详见 `docs/superpowers/plans/2026-08-06-phase5-miniprogram-launch-readiness.md`

## 阶段计划

**Phase 5：微信小程序上线整改与发布准备** ⏳ 进行中

实施任务书：`docs/superpowers/plans/2026-08-06-phase5-miniprogram-launch-readiness.md`

### Phase 5.1：发布阻塞设计确认

- [ ] 确认正式售价、售后观察期、快递方案、客服渠道、入群二维码和首发范围
- [ ] 确认“一层直接推荐奖励”的合规方案；结论明确前正式环境保持关闭
- [ ] 确认退款、微信发货管理和返点冲销的数据流及迁移范围

### Phase 5.2：核心能力与安全整改

- [x] 生产环境登录/支付配置 fail-closed，禁止占位 openid 和 mock 已支付（代码与自动测试完成；2026-08-12 云托管已补 `WX_LOGIN_MODE=real`/`WX_PAY_MODE=real` 并完成部署，diag 实测 `loginMode=real`）
- [x] 恢复微信接口 TLS 证书校验（代码与自动测试完成；需关闭自签代理并完成真实登录人工验收）
- [x] 买家会话、订单归属鉴权、敏感日志脱敏、生产管理员安全初始化和 CORS 收敛（代码与自动验证完成；线上管理员换密、真机双账号和数据库日志人工验收待办）
- [x] 无 `scene` 默认商品入口、隐私授权、客服与审核体验（代码与自动验证完成；默认 storefront 环境变量、`request` 合法域名、《小程序用户隐私保护指引》已于 2026-08-12 完成配置/验证；客服能力和真机验收待办）
- [ ] 接入真实微信小程序码并完成 trial 码真机归因验证
- [ ] 接入微信订单发货管理，先完成账号能力检查；支持幂等上传、结果不确定时先查询再重放，并区分微信资金结算与本系统返点结算
- [ ] 实现微信退款、退款状态同步和返点冲销最低闭环
- [ ] 移除生产占位售价、奖励和业务参数
- [ ] 以脱敏方式复核当前发布候选全部微信支付配置、通知地址和证书有效性

### Phase 5.3：发布候选与全量验证

- [ ] 固化唯一发布 commit，确保后端、管理后台和小程序体验版来自同一版本
- [ ] 当前发布候选通过 server build、单元测试、E2E、admin build、miniprogram build
- [ ] 真机完成普通入口/销售码 → 登录 → 支付 → 回调/对账 → 地址 → 发货 → 售后 → 退款闭环

### Phase 5.4：提审与发布

- [ ] 小程序备案最终通过
- [ ] 上传体验版并提交微信审核
- [ ] 审核通过后，经用户确认正式发布
- [ ] 发布后重新生成 release 销售码，完成生产冒烟和首单观察

### 已完成阶段

**Phase 4：部署准备（GitHub 仓库 + 微信云托管容器部署）** ✅ 已完成

- [x] 创建 GitHub 仓库 `Imsage323/book-sales-referral` 并推送本地代码
- [x] 为后端添加 `Dockerfile` 与 `.dockerignore`
- [x] 添加 TypeORM 迁移脚本（`migration:run` / `migration:show`）
- [x] 在微信云托管绑定仓库并配置环境变量
- [x] 在微信云托管创建/连接 MySQL 数据库并运行首次迁移
- [x] 验证云托管后端服务可访问（健康检查或登录接口）

**Phase 3.2（真实化）：微信支付真实集成** ✅ 代码完成（生产安全与当前发布候选验收转入 Phase 5）

- [x] 微信小程序登录接口代码（`POST /api/wx/login`；配置齐全时调用 `jscode2session`，未配置时仍会返回占位 openid，Phase 5 必须移除生产保底并重验真实登录）
- [x] 微信支付统一下单接口（接入商户号 / APIv3，JSAPI 下单 + 支付参数二次签名）
- [x] 微信支付回调处理（验签、幂等、金额校验、更新订单状态）
- [x] 小程序端调用 `wx.requestPayment` 调起微信支付（含取消重试与 `pay-sync` 主动对账）
- [x] 替换模拟支付单号生成逻辑，写入真实 `wxTransactionId`（mock 模式保留供本地开发与测试）
- [x] 历史微信支付配置曾支持 2026-07-23 真机支付（当前发布候选的全部支付变量、通知地址和证书仍待脱敏复核）
- [x] 支付代码已推送到 GitHub `master`（`d18c2f9`），登录加固版本已部署；2026-08-06 线上诊断为 `wx-login-v3`
- [x] 历史真机 0.01 元 `wx.requestPayment` 冒烟成功（2026-07-23）
- [ ] 当前发布候选完整闭环：静默登录 openid → JSAPI 下单 → `wx.requestPayment` → 有效回调落库 → 订单 `paid` → 地址/结果页
- [ ] 有效支付回调：`POST /api/wx/notify` 验签、解密、金额校验与 `payment_events` 落库；`pay-sync` 仅作兜底

**Phase 3.3：售后观察期与返点** ✅ 已完成

- [x] 售后观察期自动/手动结算
- [x] 返点规则配置（固定金额/比例/阶梯）
- [x] 预计返点与最终返点计算
- [x] 一层直接推荐奖励
- [x] 返点溯源记录
- [x] 管理后台返点处理页

**Phase 3.4A：基础订单/发货台账与销售汇总** ✅ 已完成

- [x] 订单明细与销售汇总 Excel 导出

**Phase 3.4B（扩展）：返点及更多台账维度**

- [ ] 返点台账导出（依赖 Phase 3.3 的 reward_records 数据）
- [ ] 更多汇总维度：按产品、按地区、按时间段
- [ ] 发货明细独立台账 sheet

## 阻塞

- [业务决策] “一层直接推荐奖励”存在多级分销合规风险；结论明确前正式环境不得启用
- [业务参数] 正式售价、售后观察期、快递方案、客服与退款 SOP、入群二维码尚未确认
- [平台配置] `request` 合法域名与《小程序用户隐私保护指引》已于 2026-08-12 完成配置（用户确认）；微信订单发货管理尚未接入
- [核心能力] 真实小程序码、微信退款及返点冲销尚未实现
- [生产安全] fail-closed、TLS、订单归属鉴权、日志脱敏和默认管理员整改代码已完成且已部署上线（2026-08-12）；线上管理员换密确认和真机人工验收尚未完成
- [发布验收] 当前发布候选的有效支付回调落库与完整真机闭环尚未通过

## 待确认

- [ ] 正式售价（2026-08-12 为配合真机支付验收，生产库商品价格已临时改为 0.10 元；**验收完成后必须改回 168.00 元**，代码默认占位价为 0.01 元仍需核对）
- [ ] 正式售后观察期、发货时限、快递公司及物流编码
- [ ] 客服渠道、退款处理人与人工兜底 SOP
- [ ] 入群二维码维护方式，以及支付后入群入口是否保留
- [ ] 正式销售奖励参数及“一层直接推荐奖励”合规方案
- [ ] 首发是否包含尚未完整实现的销售方/老板端
- [ ] 抖店渠道：资质审核与铺货进行中（用户侧）；抖店订单是否纳入本系统台账/返点体系待评估
- [ ] 公安联网备案重新核查结果
- [x] 直营销售方 `DEFAULT_SELLER_CODE=SMFMSVV` 与默认在售商品 `DEFAULT_PRODUCT_ID=595f08d3-d92b-4c83-9445-1d743633ad1c` 已由用户确认并写入本地与云托管环境；2026-08-12 经 `/api/products/storefront` 公开接口验证已生效

## 资质与外部状态

- [x] 书名、是否允许多本购买：书名《高三学业生涯导航日历》，允许多本购买
- [x] 出版物经营许可证：已取得
- [x] 微信认证：已完成（小程序信息、类目、认证均已通过，2026-07-21 截图确认）
- [x] 微信支付商户号与密钥：历史配置曾支持 2026-07-23 真机支付；当前发布候选的完整配置与证书仍待脱敏复核
- [x] 域名 ICP 备案：已完成（用户于 2026-08-06 确认）
- [x] 自有域名与 HTTPS：`优学启航.com`（punycode `xn--4oqx7jk6ghq7b.com`）已绑定云托管，主域 + www 外网验证 200；TrustAsia 免费 DV 证书 2026-11-01 到期需续期
- [x] 微信小程序备案：已完成（用户于 2026-08-07 确认）

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

- 2026-08-12：买家订单详情接口兼容商户订单号——`GET /api/buyer/orders/:id` 同时接受内部 UUID 与 `orderNo`（`O-YYYYMMDD-XXXX`），为微信订单中心跳转（path 携带 `${商品订单号}`）铺路；openid 归属校验不变。server build、42 个单元测试、38 个 E2E 通过；待提交部署。另：真机支付被微信侧限制（`requestPayment` 付款能力限制），根因是未接入「购物订单」（原订单管理），已按其流程向 wechatpay_order@tencent.com 发送开通申请邮件（用户侧），审批后需配置订单详情 path 并恢复真机验收；生产库商品价格已临时改为 0.10 元供验收，验收后须改回 168.00 元
- 2026-08-12：用户确认微信后台配置完成——`request` 合法域名已加入 `https://xn--4oqx7jk6ghq7b.com`，《用户隐私保护指引》已按实际收集信息（地址/手机号/剪贴板）完善，UGC 声明为不包含；订单中心 path 暂不设，待买家订单列表页与微信订单发货管理一并接入。下一步：真机全流程验收（登录 → 下单 → 真实支付 → 回调落库 → 地址 → 结果页）与线上管理员换密
- 2026-08-12：云托管新代码部署完成，线上从 `wx-login-v3` 切换到 `wx-login-v4`。根因：`eb0cdcd` 新增的生产启动校验（`production-readiness.ts`）要求 `WX_LOGIN_MODE=real`/`WX_PAY_MODE=real`，而云托管环境变量缺这两项 → 新镜像容器启动即崩（server-026 部署失败）→ 之后两次「配置变更」版本（server-025/027）均复用 7 月 23 日 server-024 旧镜像，线上一直停留在 v3。修复：控制台补入两个 mode 变量后从 `feat/ui-redesign` 重新构建部署。实测 `/api/wx/diag` 返回 `wx-login-v4`、`loginMode=real`，`/api/products/storefront` 返回默认直营入口。本次起本机已全局安装 CloudBase 插件/MCP 与 `@cloudbase/cli`（3.7.3）并完成 `tcb login` 授权，后续可用 `tcb cloudrun detail/record/logs` 直接排查线上问题。剩余待办：微信后台配置（合法域名、隐私指引）、线上管理员换密、真机全流程验收
- 2026-08-07：Phase 5 Task 4 代码与自动验证完成——新增 `GET /api/products/storefront`，仅接受显式 `DEFAULT_SELLER_CODE`/`DEFAULT_PRODUCT_ID`，缺失或不可用时返回 503；小程序无 scene 时加载直营商品，有 scene 时保持销售归因。隐私同意前允许浏览但不登录、不记录扫码、不购买；剪贴板仅在主动点击并同意后读取，拒绝可手填。地址页补信息用途、隐私与客服入口，结果页补订单/地址/物流/退款客服并将入群改为自愿；首发 `app.json` 移除销售方/老板端页面入口，启用隐私与域名检查。server build、39 个单元测试、37 个 E2E、miniprogram build、JSON 解析和差异检查通过；本地 `.env` 已按用户确认配置直营销售方与默认商品，云托管新版部署、微信后台与真机验收待办
- 2026-08-07：Phase 5 Task 3 代码与自动验证完成——`POST /api/wx/login` 改为返回短期 buyer JWT，小程序只缓存 token；新增 `/api/buyer/orders` 列表/详情/创建/地址/支付/对账接口并逐单校验 openid，原 `/api/orders` 仅允许管理员；扫码日志也从买家认证上下文取 openid。操作日志不记录登录及买家请求体，管理请求敏感字段递归脱敏；生产不再自动播种固定管理员，改为显式一次性初始化；生产 CORS 默认拒绝跨域。server build、39 个单元测试、35 个 E2E、miniprogram build 全部通过；线上管理员换密、真机双账号和数据库日志人工验收待办
- 2026-08-06：Phase 5 Task 2 代码与自动验证完成——新增显式 `WX_LOGIN_MODE`/`WX_PAY_MODE`，生产环境启动时校验真实登录/支付配置，development/test 才允许显式 mock；配置异常返回 503 且不修改订单，移除微信登录 `rejectUnauthorized: false`，诊断版本升为 `wx-login-v4`。server build、34 个单元测试、32 个 E2E 全部通过；未修改真实 `.env`，云托管配置、关闭自签代理、部署和真实登录验收待用户确认
- 2026-08-06：用户确认域名 ICP 备案已完成、小程序备案进入最后一步；将当前阶段更新为 Phase 5，完成上线差距梳理并新增 `docs/superpowers/plans/2026-08-06-phase5-miniprogram-launch-readiness.md`。同步区分“历史 0.01 元支付冒烟”和“当前发布候选完整验收”，移除已过时的 `/api/wx/login` 500 阻塞，补入真实小程序码、微信订单发货管理、生产 fail-closed、订单鉴权、隐私、退款客服和分销合规等 P0 待办
- 2026-07-31：排查公安备案「网站打不开」问题——根因是域名 `优学启航.com` 无任何 DNS 解析记录。已申请免费 SSL 证书（DNS 手动验证）、云托管绑定主域 + www 自定义域名并上传证书、DNSPod 配置 CNAME，外网验证两地址 HTTPS 均 200（管理后台登录页），可重新接受公安核查
- 2026-07-23：家长端地址页增加一键粘贴识别（剪贴板/文本框 + 本地解析省市区姓名手机），降低手工填写成本
- 2026-07-23：真机支付 0.01 成功后填地址无跳转——`pages/buyer/result/result` 未注册进 `app.json`，已补登记并给 navigateTo fail 提示
- 2026-07-23：login 已到可读错误：`self-signed certificate`（云托管「开放接口服务」代理 api.weixin.qq.com 自签证书）。代码对微信域名 `rejectUnauthorized:false`（diag 升为 wx-login-v3）；官方亦建议自行 jscode2session 时关闭开放接口服务后重新发布
- 2026-07-23：联调点购买仍 toast「Internal server error」；探测线上 login 仍为无 timestamp 的裸 500（说明上一版加固可能未生效或异常未进 HttpExceptionFilter）。再加固：增加 `GET /api/wx/diag` 版本探针、login 全路径捕获、小程序 api 控制台打印完整错误
- 2026-07-23：联调中产品页可加载；点购买失败因 `/api/wx/login` 500。加固 `wx-login.service`（Node https、超时、网络/业务错误分别 503/400 并回传原因），便于区分 Secret 错误与云托管出网问题
- 2026-07-23：用户确认云托管 `WX_*` 环境变量已配置；探测线上 `POST /api/wx/*` 曾为 404，已 push 支付模块后路由恢复（notify 401 缺签名头为预期）；回调入口可达，登录换 openid 仍待修
- 2026-07-23：Phase 3.2 微信支付真实集成代码完成——新增 `payments` 模块（JSAPI 下单、回调验签解密、主动对账、wx.login 换 openid）、订单 mock/真实双模式、小程序端 `wx.requestPayment` 接入；修复 `wechatpay-axios-plugin` 运行时导入错误（`WechatpayAxiosPlugin` 命名空间仅存在于类型声明）；单测 24 个、E2E 30 个全部通过
- 2026-07-21：确认小程序信息/类目/微信认证已完成；澄清 Phase 3.2 阻塞项——小程序备案可与开发并行，ICP 备案对云托管默认域名不强依赖，唯一硬前置是微信支付商户号（待用户申请）
- 2026-07-21：同步用户侧资质进展：出版物经营许可证已取得，域名 ICP 备案进行中，微信小程序备案待办，抖店资质审核与铺货进行中
- 2026-07-09：修复管理后台新增销售方 parentId 空字符串校验、二维码解析 UUID 格式兼容、小程序产品详情 API 路径、二维码图片 URL 列长度不足导致生成失败的问题
- 2026-07-07：修复管理后台登录提示"用户名或密码错误"的问题，后端启动时自动创建固定默认管理员账号（生产环境必须移除固定口令播种）
- 2026-07-07：管理后台集成到后端服务完成，后端容器统一托管管理后台静态文件，API 地址改为相对路径 `/api`，本地 API 和前端路由验证通过
- 2026-07-06：Phase 4 部署准备完成，后端成功部署到微信云托管 dev 环境，数据库迁移自动运行，13 张业务表已创建
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
