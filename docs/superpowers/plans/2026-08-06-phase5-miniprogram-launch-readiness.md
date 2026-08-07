# Phase 5：微信小程序上线整改与发布准备实施计划

> 本计划用于把项目从“核心功能代码已具备、历史真机支付已冒烟”推进到“可安全收款、发货、售后并正式发布”。任务使用 `- [ ]` 跟踪；只有实现并完成对应自动验证和人工验收后，才能在 `ROADMAP.md` 标为完成。

**Goal:** 完成微信小程序正式上线前的 P0 整改，形成唯一、可追溯、可回滚的发布候选版本，并通过微信体验版真机全链路验收。

**Architecture:** 保持 NestJS 单体后端、原生微信小程序和 Vue 管理后台现有架构；新增微信平台通用服务承载 access token、小程序码和订单发货管理能力。生产环境采用 fail-closed，任何微信登录或支付关键配置缺失均不得回退到占位 openid 或 mock 支付。

**Tech Stack:** NestJS 10、TypeORM、MySQL 8、微信支付 APIv3、微信小程序服务端 API、原生微信小程序、Vue 3、Element Plus。

---

## 1. 上线完成定义

只有同时满足以下条件，Phase 5 才算完成：

- 小程序备案最终显示成功，服务类目、出版物经营许可证、微信认证和商户号绑定保持有效。
- 小程序在关闭“开发环境不校验请求域名”后，普通入口和销售专属码入口均可正常访问。
- 《小程序用户隐私保护指引》按后台可选项及必要补充文档如实覆盖实际处理的账号标识、联系人姓名、手机号、收货地址和剪贴板内容，隐私同意、拒绝和再次授权路径均可用。
- 生产环境不允许占位 openid 或 mock 支付；支付配置异常时明确失败，不产生“未付款但已支付”订单。
- 真实登录、下单、JSAPI 支付、有效回调、主动对账、地址、微信订单发货管理、售后与退款状态形成闭环。
- 销售专属码由微信官方接口生成，可在体验版和正式版正确解析并归因。
- 默认管理员、敏感日志、订单越权访问和 TLS 绕过等 P0 安全问题已修复。
- 正式价格、售后天数、物流方案、客服渠道、入群二维码和返点参数已经确认并配置。
- “一层直接推荐奖励”已有明确合规结论；结论未确认时，正式环境保持关闭。
- 最终 commit 通过三端构建、后端单元测试和 E2E，并在体验版完成真机验收。
- 审核通过后，经用户再次确认才执行正式发布；发布后完成生产冒烟和首单监控。

## 2. 当前已验证基线（2026-08-06）

- 域名 ICP 备案已完成，用户于 2026-08-06 确认。
- 小程序备案处于最后一步，尚未达到“备案成功”。
- 自有域名 `优学启航.com` 已绑定微信云托管并配置 HTTPS；公安联网备案仍待复核。
- 线上 `GET /api/wx/diag` 已确认运行 `wx-login-v3`，且 AppID、AppSecret 配置存在。
- 2026-07-23 曾完成一次 0.01 元真机支付冒烟；该记录不能替代当前发布候选的支付回调完整验收。
- 微信支付 JSAPI 下单、回调验签解密和 `pay-sync` 代码已实现，但生产 fail-closed 尚未实现。
- 当前销售专属码仍是占位 SVG；内部 `shipments` 记录尚未接入微信订单发货管理。
- 当前工作分支为 `feat/ui-redesign`，存在未提交和未跟踪改动，尚未形成唯一发布基线。

## 3. 范围、推荐方案与确认门

### 3.1 首发范围

推荐首发只包含：家长购买端、销售归因、管理后台订单/发货/返点管理。当前未完成的销售方/老板端不作为首发承诺；若用户确认必须首发，则需要另行补充销售方身份绑定、专属码和个人销售数据任务。

### 3.2 返点合规

推荐正式环境默认 `REFERRAL_REWARD_ENABLED=false`。只有在微信平台或专业合规意见确认“一层直接推荐奖励”不构成违规多级分销后，才允许开启；不能通过隐藏页面规避审核。

### 3.3 必须由用户确认的业务参数

- 正式售价和是否保留 0.01 元测试商品。
- 正式售后观察期、发货时限、快递公司及物流编码。
- 客服渠道、退款处理人和人工兜底 SOP。
- 入群二维码维护方式，以及是否保留支付后入群入口。
- 正式销售奖励规则；如推荐奖励获准启用，还需确认其金额或比例。
- 首发是否包含销售方/老板端。

### 3.4 高风险操作确认门

以下步骤写入计划但不自动获得执行权限，实施时必须再次确认：

- 修改真实 `.env`、云托管环境变量、密钥、支付通知地址或线上安全配置。
- 数据库 schema 变更、迁移和生产数据修正。
- push、生产部署、上传审核、正式发布、灰度、回滚或 Cloudflare/云托管线上配置变更。

## 4. 依赖顺序

```text
业务与合规确认
  → 生产支付/登录安全护栏
  → 买家身份与订单数据安全
  → 默认入口、隐私和审核体验
  → 微信平台通用服务
      ├─ 真实小程序码
      └─ 微信订单发货管理
  → 退款、售后和返点冲销
  → 正式业务数据
  → 发布候选全量验证
  → 体验版提审与正式发布
```

---

## Task 1：确认发布范围、业务参数与合规决策

**Goal:** 在编码前消除会改变数据模型和审核结论的关键歧义。

**Files:**

- Modify: `ROADMAP.md`
- Modify: 本计划中的“确认门”状态
- Optional Modify: `docs/superpowers/specs/2026-07-05-企业小程序销售记账系统设计.md`

**Steps:**

- [ ] 确认正式售价、售后天数、物流方案、客服渠道和入群方式。
- [ ] 确认首发是否只包含家长端和管理后台；推荐暂缓未完成的销售方/老板端。
- [ ] 对“一层直接推荐奖励”取得合规结论；结论未明确前采用正式环境关闭方案。
- [ ] 确认退款采用“管理后台发起微信退款”的最低闭环，还是首发同时提供用户自助申请。
- [ ] 确认需要新增的数据库字段和迁移范围，再进入实现。

**Done when:** 所有影响实现路径的业务项均有明确结论，未确认项继续保留在 `ROADMAP.md`，不以猜测代替。

---

## Task 2：生产支付与微信登录 fail-closed

**Goal:** 杜绝生产配置失效时生成占位 openid 或把未付款订单标成已支付。

**Status（2026-08-06）：** 代码与自动验证已完成；云托管环境变量调整、关闭自签代理、部署和真实登录人工验收待确认。

**Files:**

- Modify: `src/server/src/config/wx.config.ts`
- Create: `src/server/src/config/production-readiness.ts`
- Modify: `src/server/src/app.module.ts`
- Modify: `src/server/src/payments/wx-login.service.ts`
- Modify: `src/server/src/orders/orders.service.ts`
- Modify: `src/server/.env.example`
- Modify/Test: `src/server/src/payments/*.spec.ts`
- Modify/Test: `src/server/src/orders/orders.service.spec.ts`
- Modify/Test: `src/server/test/payments.e2e-spec.ts`
- Modify/Test: `src/server/test/orders.e2e-spec.ts`
- Modify/Test: `src/server/test/settlements.e2e-spec.ts`

**Steps:**

- [x] 新增生产微信配置校验：`NODE_ENV=production` 时缺少登录或支付关键配置应在启动阶段失败，错误只列缺失字段名，不输出值。
- [x] 将 mock 支付和 `dev-openid-*` 严格限制在 `development`/`test`；生产支付不可用时返回 503，不修改订单状态。
- [x] 恢复 `api.weixin.qq.com` 的标准 TLS 证书校验，移除 `rejectUnauthorized: false`。
- [ ] 部署前由用户确认并关闭导致自签证书代理的云托管“开放接口服务”或采用受信任的官方调用路径。
- [x] 为配置完整、配置缺失、显式关闭、生产/测试环境组合补单元测试。
- [x] 更新 E2E，证明生产配置缺失不会走 mock，测试环境仍可显式使用 mock。

**Verification:**

```powershell
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
```

**Manual acceptance:** 经用户确认部署到非生产验证环境后，真实 `wx.login` 能换取 openid，TLS 校验保持开启。

**Verification result（2026-08-06）：** server build 通过；34 个单元测试通过；32 个 E2E 通过。

**Done when:** 上述自动验证和云托管人工验收均通过；生产配置缺失只能失败、不能产生已支付订单或占位用户。

---

## Task 3：买家会话、订单归属校验与敏感日志治理

**Status（2026-08-07）：** 代码与自动验证已完成；线上管理员换密确认、真实微信双账号越权验证和数据库日志抽查待人工验收。

**Goal:** 防止通过订单 UUID 越权读取或修改姓名、手机号、地址、支付状态等数据。

**Recommended design:** `/api/wx/login` 在换取 openid 后返回短期买家 JWT；小程序只保存买家 token，不再把客户端提交的 openid 当可信身份。管理端继续使用现有管理员 JWT，买家查询使用独立的“我的订单”接口，避免混用权限。

**Files:**

- Create: `src/server/src/auth/buyer-jwt.strategy.ts`
- Create: `src/server/src/auth/buyer-jwt-auth.guard.ts`
- Create: `src/server/src/orders/buyer-orders.controller.ts`
- Modify: `src/server/src/payments/wx-login.service.ts`
- Modify: `src/server/src/payments/wx.controller.ts`
- Modify: `src/server/src/orders/orders.controller.ts`
- Modify: `src/server/src/orders/orders.service.ts`
- Modify: `src/server/src/orders/dto/create-order.dto.ts`
- Modify: `src/server/src/operation-logs/operation-log.interceptor.ts`
- Modify: `src/server/src/main.ts`
- Modify: `src/miniprogram/app.ts`
- Modify: `src/miniprogram/utils/api.ts`
- Modify: buyer pages that request order APIs
- Modify/Test: auth、orders、operation-logs 单元与 E2E

**Steps:**

- [x] 登录成功后签发包含 openid 和明确 `tokenType=buyer` 的短期 JWT；不在响应或日志中暴露 session_key。
- [x] 创建订单时从服务端认证上下文写入 openid，移除对客户端 `openid` 字段的信任。
- [x] 新增买家“我的订单”详情/列表接口，并对改地址、支付、对账操作校验订单所有权。
- [x] 将原 `GET /orders/:id` 改为管理员权限；管理后台继续使用管理员 JWT。
- [x] 操作日志对 `password`、token、code、openid、手机号、姓名、完整地址、支付原文等字段脱敏或不记录。
- [x] 成功登录不保存请求 body；公开买家接口只记录动作、订单 ID 和结果，不记录个人信息。
- [x] 生产环境取消固定默认账号口令自动播种，改为使用临时环境变量执行的一次性安全初始化脚本。
- [ ] 确认线上管理员已更换默认密码。
- [x] 生产环境 CORS 默认拒绝跨域，只允许 `CORS_ORIGINS` 显式来源；开发环境保留本地来源。
- [x] 补充“买家只能访问自己的订单”“管理员可访问订单”“无 token/错误 token 拒绝”等 E2E。

**Verification:**

```powershell
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\miniprogram run build
```

**Verification result（2026-08-07）：** server build 通过；39 个单元测试通过；35 个 E2E 通过；miniprogram build 通过。

**Manual acceptance:** 用两个微信账号分别下单，互相不能查看、修改、支付或对账对方订单；数据库操作日志不包含明文密码和完整地址。

**Done when:** 订单公开接口不再依赖 UUID 充当唯一访问凭证，敏感日志和默认管理员风险已关闭。

---

## Task 4：普通入口、隐私授权与审核可体验性

**Status（2026-08-07）：** 代码与自动验证已完成；`DEFAULT_SELLER_CODE`/`DEFAULT_PRODUCT_ID`、微信后台隐私指引、客服能力、`request` 合法域名及关闭调试后的真机验收待配置确认。

**Goal:** 审核人员和普通用户不依赖 `scene` 也能进入真实售书流程，隐私调用与后台声明一致。

**Recommended design:** 配置一个企业直营销售方 `DEFAULT_SELLER_CODE`。无 `scene` 时由后端返回“直营销售方 + 默认在售商品”；有 `scene` 时继续按销售专属码归因。

**Files:**

- Modify: `src/server/.env.example`
- Create or Modify: products/qrcodes 的公开 storefront 接口与测试
- Modify: `src/miniprogram/pages/buyer/index/index.ts`
- Modify: `src/miniprogram/pages/buyer/index/index.wxml`
- Modify: `src/miniprogram/pages/buyer/index/index.wxss`
- Modify: `src/miniprogram/pages/buyer/address/address.ts`
- Modify: `src/miniprogram/pages/buyer/address/address.wxml`
- Modify: `src/miniprogram/pages/buyer/result/result.*`
- Modify: `src/miniprogram/app.json`
- Modify: `src/miniprogram/project.config.json`

**Steps:**

- [x] 新增普通入口的默认 storefront 数据接口；默认销售方或商品未配置时返回可读 503，不随机归因。
- [x] 无 `scene` 时加载默认商品，有 `scene` 时保持现有销售码解析。
- [x] 接入 `wx.getPrivacySetting` 和 `wx.openPrivacyContract`；使用 `<button open-type="agreePrivacyAuthorization">` 主动同步同意状态。
- [x] `wx.getClipboardData` 仅在用户主动点击且微信已记录同意后调用；拒绝后保留文本粘贴和手工填写路径。
- [x] 地址页说明姓名、电话、地址的使用目的；补充隐私协议和微信客服入口。
- [x] 支付结果页优先展示订单、地址、物流、退款/客服信息；入群入口保持自愿、可跳过，不自动跳营销页面。
- [x] 首发 `app.json` 页面范围仅保留家长购买流程，销售方/老板端源码保留但不进入首发包。
- [ ] 在微信后台配置《小程序用户隐私保护指引》，声明与代码实际处理的信息一致。
- [ ] 在微信后台配置 `https://xn--4oqx7jk6ghq7b.com` 为 `request` 合法域名。
- [x] 项目与本机私有配置均启用 `urlCheck: true`，不再依赖开发工具关闭域名校验。
- [ ] 在关闭调试模式的 iOS/Android 真机验证。

**Verification:**

```powershell
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\miniprogram run build
```

**Verification result（2026-08-07）：** server build 通过；39 个单元测试通过；37 个 E2E 通过；miniprogram build 通过；JSON 配置解析与 `git diff --check` 通过。

**Manual acceptance:** 清除微信授权数据后，分别验证首次同意、首次拒绝、拒绝超过 10 秒后再次授权（或清除授权状态后重试）；从搜索/最近使用入口打开能看到默认商品并完成到支付前流程。

**Done when:** 普通入口可体验，隐私声明与调用一致，审核不依赖销售码或隐藏参数。

---

## Task 5：微信平台通用服务与真实小程序码

**Goal:** 用微信官方 `getUnlimitedQRCode` 替换占位 SVG，并为发货管理复用稳定 access token 能力。

**Recommended design:** 新建 `wechat-platform` 模块，集中管理 `access_token` 缓存、微信服务端错误解析和超时。小程序码数量较少，一期将 PNG data URL 存为 MySQL `LONGTEXT`；达到明显规模后再迁移对象存储，避免首发引入额外基础设施。

**Files:**

- Create: `src/server/src/wechat-platform/wechat-platform.module.ts`
- Create: `src/server/src/wechat-platform/wechat-access-token.service.ts`
- Create: `src/server/src/wechat-platform/wechat-qrcode.service.ts`
- Modify: `src/server/src/qrcodes/qrcodes.module.ts`
- Modify: `src/server/src/qrcodes/qrcodes.service.ts`
- Modify: `src/server/src/qrcodes/qrcodes.controller.ts`
- Modify: `src/server/src/sellers/entities/seller-qrcode.entity.ts`
- Create: `src/server/src/migrations/*-ExpandSellerQrcodeImage.ts`
- Modify: `src/admin/src/views/Qrcodes.vue`
- Modify/Test: qrcodes、wechat-platform 单元与 E2E

**Steps:**

- [ ] 实现稳定 access token 获取、内存缓存、提前刷新、并发合并、超时和微信错误码解析；不得记录 AppSecret 或 token。
- [ ] 调用 `getUnlimitedQRCode`，使用现有 32 字符无连字符二维码 ID 作为 `scene`，`page=pages/buyer/index/index`。
- [ ] 通过显式配置选择 `trial` 或 `release`；非生产默认 `trial`，生产只能 `release`。
- [ ] 对成功的 PNG 二进制和失败的 JSON 响应做严格区分。
- [ ] 新迁移将 `seller_qrcodes.imageUrl` 从短字符串扩展为 `LONGTEXT`，兼容已有占位记录。
- [ ] 下载接口支持 `image/png`，管理后台文件名改为 `.png`。
- [ ] 生成失败不写入伪成功记录；重复请求应可重试，并保留明确状态或错误。
- [ ] 单元测试完全 mock 微信接口；E2E 不调用真实微信网络。
- [ ] 经用户确认后在体验版生成 `trial` 码并真机扫码；`release` 码的生成与验收由 Task 11 在正式发布后完成。

**Verification:**

```powershell
npm --prefix .\src\server run migration:show
npm --prefix .\src\server run migration:run
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\admin run build
```

**Manual acceptance:** 两个不同销售方的体验版码均能打开商品页，后台扫码日志和订单分别归因到正确销售方。

**Done when:** 后台不再生成占位 SVG，真实微信码接口完成，且 `trial` 码已通过体验版真机归因验收。

---

## Task 6：接入微信订单发货管理

**Goal:** 内部发货记录与微信平台发货状态一致，满足实物电商发货和资金结算要求。

**Files:**

- Create: `src/server/src/wechat-platform/wechat-shipping.service.ts`
- Modify: `src/server/src/orders/entities/shipment.entity.ts`
- Modify: `src/server/src/shipments/dto/create-shipment.dto.ts`
- Modify: `src/server/src/shipments/shipments.service.ts`
- Modify: `src/server/src/shipments/shipments.controller.ts`
- Create: `src/server/src/migrations/*-AddWxShippingStatus.ts`
- Modify: `src/admin/src/views/Orders.vue`
- Modify: buyer order/result pages
- Modify/Test: shipments、orders、wechat-platform 单元与 E2E

**Recommended state flow:**

1. 发布前先调用 `is_trade_managed` 与 `is_trade_management_confirmation_completed`，确认账号已开通并完成交易结算管理确认。
2. 创建内部 shipment，状态为 `pending_upload`，订单保持 `shipping_pending`。
3. 调用微信 `/wxa/sec/order/upload_shipping_info`。
4. 明确成功后写入 `uploadedAt`；明确失败写入脱敏错误并进入可处理状态。
5. 网络超时或结果不确定时先调用 `get_order` 对账，再决定更新还是重放；不得直接盲重试。

**Steps:**

- [ ] 增加物流公司编码、微信上传状态、上传时间、结果不确定状态、查询次数和最后错误字段，并创建迁移。
- [ ] 发布前检查账号是否开通发货信息管理、是否完成交易结算管理确认；未通过时阻止进入发布候选。
- [ ] 管理后台将自由文本快递公司改成受控物流编码 + 运单号输入；编码通过 `get_delivery_list` 获取，不接受任意文本。
- [ ] 一期实体快递使用 `logistics_type=1`、统一发货使用 `delivery_mode=1` 且 `shipping_list` 仅一项；提交真实 `tracking_no`、`express_company`、`item_desc`、RFC 3339 `upload_time` 和付款人 openid。
- [ ] 顺丰等要求联系方式的运力按官方规则提交寄件人或收件人掩码联系方式，不记录无关明文。
- [ ] 实现幂等和防重复发货；结果不确定时先 `get_order` 对账，只有确认未录入且符合微信更新/重新发货次数限制时才允许管理员重放。
- [ ] 发货上传成功前不启动本系统返点售后观察期；将微信资金结算状态与本系统返点结算状态分别建模，建议使用 `wxSettlementStatus` 与 `rewardSettlementStatus`，避免混用“结算”。
- [ ] 查询并展示微信侧发货/确认收货状态；按账号实际能力接入确认收货组件、`notify_confirm_receive` 或系统自动确认流程。
- [ ] 按普通商品支付后 48 小时内发货要求，在 24/36 小时提前预警；上传物流后 24 小时仍无首条揽件信息时告警。
- [ ] 单元测试覆盖成功、微信错误、超时、重复调用和重试；E2E 使用 mock 平台服务。

**Verification:**

```powershell
npm --prefix .\src\server run migration:show
npm --prefix .\src\server run migration:run
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\admin run build
npm --prefix .\src\miniprogram run build
```

**Manual acceptance:** 体验版真实支付测试单能够上传物流、在微信侧查询到发货状态；分别核对微信资金结算状态和本系统返点售后观察期/结算状态，不把两者视为同一状态。

**Done when:** 内部“已发货”必然对应微信平台已接收发货信息，失败订单可见、可重试、不会提前结算返点。

---

## Task 7：微信退款、售后状态与返点冲销

**Goal:** 至少形成“用户联系客服 → 管理后台发起退款 → 微信退款结果 → 订单状态 → 返点冲销”的可追溯闭环。

**Files:**

- Modify: `src/server/src/orders/entities/refund-record.entity.ts`
- Create or Modify: refund service/controller/DTO
- Modify: `src/server/src/payments/wx-pay.service.ts`
- Modify: `src/server/src/payments/wx.controller.ts`
- Modify: `src/server/src/orders/orders.service.ts`
- Modify: `src/server/src/rewards/rewards.service.ts`
- Create: `src/server/src/migrations/*-AddRefundLifecycle.ts`
- Modify: `src/admin/src/views/Orders.vue`
- Modify: buyer order/result pages
- Modify/Test: payments、orders、rewards 单元与 E2E

**Steps:**

- [ ] 为退款记录增加商户退款单号、微信退款单号、状态、请求金额、成功时间、失败原因和幂等约束。
- [ ] 复用微信支付 APIv3 客户端发起退款，金额以服务端订单为准，不接受客户端任意金额。
- [ ] 接入退款结果回调或主动查单，执行验签、解密、金额校验和幂等更新。
- [ ] 仅在微信确认退款成功后把订单置为 `refunded`。
- [ ] 将未处理返点置为 `reversed/void`；已处理返点生成明确冲销记录，不直接覆盖历史。
- [ ] 管理后台显示退款进度与失败原因，用户端显示退款状态和客服入口。
- [ ] 编写人工退款 SOP，覆盖平台不可用、重复通知、部分退款和人工对账。
- [ ] 为退款成功、失败、重复回调、金额不符和返点冲销补测试。

**Verification:**

```powershell
npm --prefix .\src\server run migration:show
npm --prefix .\src\server run migration:run
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\admin run build
npm --prefix .\src\miniprogram run build
```

**Manual acceptance:** 对一笔真实测试支付发起退款，确认微信商户平台、订单、退款记录和返点状态一致。

**Done when:** 退款不是手工改订单状态，且任何退款均可通过微信单号、订单和返点记录追溯。

---

## Task 8：正式商品、物流、客服与返点参数

**Goal:** 删除会进入生产的占位业务值，避免空数据库自动上架 0.01 元商品或产生 0.5 分小数金额。

**Files:**

- Modify: `src/server/src/products/products.service.ts`
- Modify: `src/server/src/rewards/rewards.service.ts`
- Modify: reward rule DTO/entity only if Task 1 决策需要
- Create: migration only if reward rule schema changes
- Modify: `src/server/.env.example`
- Modify: management UI validation where needed
- Modify/Test: products、rewards 单元与 E2E

**Steps:**

- [ ] 生产环境不自动创建并上架 0.01 元默认商品；测试种子仅在 test/development 显式启用。
- [ ] 通过管理后台配置正式名称、价格、图片、介绍、售后天数和入群二维码，并复核数据库值。
- [ ] 金额全部保持整数分，移除硬编码 `0.5` 分推荐奖励。
- [ ] 正式推荐奖励在合规确认前关闭；获准后改成明确规则和整数分计算，不再写死在 service。
- [ ] 配置企业直营销售方和默认 `seller_code`，供普通入口使用。
- [ ] 配置快递公司编码、发货承诺、客服说明和退款 SOP。
- [ ] E2E 证明生产模式没有占位商品/奖励回退，测试模式仍可创建受控 fixture。

**Done when:** 生产数据库和页面不含测试价格、占位奖励、无效二维码或未确认的售后承诺。

---

## Task 9：固化可复现的发布候选版本

**Goal:** 确保后端、管理后台、小程序体验版和 Git 记录对应同一个发布候选。

**Files:**

- Modify: `.gitignore`（按仓库约定纳入 `src/miniprogram/**/*.js`，继续排除 `node_modules`）
- Generated: `src/miniprogram/**/*.js`
- Modify: `ROADMAP.md`
- Optional Create: release checklist/evidence under `docs/`

**Steps:**

- [ ] 清点并归类当前 `feat/ui-redesign` 的已提交、未提交和未跟踪文件，排除 `.ui-preview`、临时图片等非发布内容。
- [ ] 确认小程序 `.ts` 与同名 `.js` 的版本管理策略符合仓库规范；任何 `.ts` 修改后重新编译并检查对应 `.js`。
- [ ] 在本地测试数据库运行全部迁移，确认 `migration:show` 无未执行项。
- [ ] 执行三端全量验证，保存 commit、时间、命令和结果。
- [ ] 确认工作树只包含预期发布内容，再形成发布候选 commit。
- [ ] push、云托管部署和生产迁移前向用户说明变更、影响和回滚方式并等待确认。
- [ ] 后端部署和小程序上传必须使用同一发布候选，不从另一个脏工作区临时上传。

**Full verification:**

```powershell
npm --prefix .\src\server run build
npm --prefix .\src\server run test -- --runInBand
npm --prefix .\src\server run test:e2e -- --runInBand
npm --prefix .\src\admin run build
npm --prefix .\src\miniprogram run build
```

E2E 前确保本地 XAMPP MySQL 和 `book_sales` 可用。`npm run lint` 当前带 `--fix`，执行后必须检查 diff，不把它当作只读验证命令。

**Done when:** 有唯一发布 commit、完整验证记录和明确回滚点，体验版与后端均能追溯到该 commit。

---

## Task 10：体验版真机全链路验收

**Goal:** 用真实微信环境证明发布候选不是“代码完成”，而是可运营闭环。

**Test matrix:**

- [ ] 普通入口：无 `scene` 打开默认商品并归因直营销售方。
- [ ] 销售入口：至少两个 trial 小程序码分别正确归因。
- [ ] 隐私：首次同意、首次拒绝、再次授权、剪贴板拒绝均有合理结果。
- [ ] 登录：真实 `wx.login` 换 openid，日志无 code、session_key、token。
- [ ] 支付：真实 JSAPI 下单、`wx.requestPayment`、有效回调验签解密、金额校验和 `payment_events` 落库。
- [ ] 对账：模拟回调延迟，`pay-sync` 可兜底；不得把未支付订单同步为 paid。
- [ ] 地址：只允许订单本人填写和查看，两个微信账号互不可见。
- [ ] 发货：微信平台接收真实物流信息，失败可重试，状态可查询。
- [ ] 售后：确认收货、观察期和返点结算顺序正确。
- [ ] 退款：真实测试退款成功，订单、退款记录和返点冲销一致。
- [ ] 管理后台：默认账号不可登录，订单/地址权限正常，日志已脱敏。
- [ ] 兼容性：至少 iOS 和 Android 各一台，关闭调试和域名豁免后通过。

**Evidence:** 每项记录测试时间、体验版版本号、订单号、微信支付/退款单号后四位、后台状态和必要截图；不得记录完整 openid、手机号、地址、密钥或 token。

**Done when:** 所有 P0 用例通过；失败项修复后重新跑关联链路，不以单次支付弹窗成功替代闭环验收。

---

## Task 11：提交审核、发布与首单观察

**Goal:** 在受控确认点完成微信审核和正式发布，并验证正式环境首单。

**External/manual steps:**

- [ ] 小程序备案最终显示成功。
- [ ] 若尚处于工信部短信核验，收到 `12381` 短信后在 24 小时内完成核验；进入通管局审核后按官方 1～20 个工作日区间跟踪，不提前标记完成。
- [ ] 核对名称、图标、简介、服务类目、出版物经营许可证和隐私指引。
- [ ] 上传发布候选并设置体验版；提交审核时按后台当前表单如实填写功能页面、测试说明及其要求的测试账号/辅助材料，并在测试说明中覆盖普通入口与销售码入口。
- [ ] 提交审核前确认页面无“测试、演示、mock、占位”文案或不可用功能。
- [ ] 提交微信审核；按审核反馈修复后重新执行关联自动测试和真机验收。
- [ ] 审核通过后执行本项目内部确认 Gate：向用户说明版本、风险和回滚点，等待正式发布确认。
- [ ] 正式发布后重新生成 `release` 销售码，旧 trial 码停止分发。
- [ ] 按已确认的正式商品价格完成普通入口、销售码、登录、下单和首单冒烟。
- [ ] 观察支付回调、发货提醒、错误率、数据库连接和日志至少覆盖首个真实订单周期。
- [ ] 完成公安联网备案复核，设置 2026-11-01 HTTPS 证书续期提醒。

**Rollback:** 小程序使用微信版本回退；后端回滚到发布前镜像。涉及数据库迁移时，实施前必须设计兼容回滚或前滚修复，不以破坏性 schema 回滚作为默认方案。

**Done when:** 正式版可访问、首单闭环通过、监控无 P0 异常，并在 `ROADMAP.md` 记录发布版本与验证证据。

---

## 5. P1/P2 非首发阻塞项

在不影响 P0 闭环的前提下延后：

- 完整销售方端：销售方微信身份绑定、专属码、个人销售数据和权限隔离。
- 用户自助退款申请、完整订单搜索和更丰富的物流轨迹。
- 返点台账更多汇总维度、发货独立 sheet。
- 更细粒度管理员 RBAC、登录限流和安全告警。
- access token/二维码迁移到 Redis 或对象存储，以支持更大规模和多实例。
- 抖店订单接入本系统台账与返点。

## 6. 官方依据

- [微信小程序备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record/record_guidelines.html)
- [网络与服务器域名配置](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- [小程序隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)
- [小程序用户隐私保护指引内容介绍](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro.html)
- [获取不限制的小程序码](https://developers.weixin.qq.com/miniprogram/dev/server/API/qrcode-link/qr-code/api_getunlimitedqrcode)
- [小程序发货信息管理服务](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/order-shipping/order-shipping.html)
- [发货信息录入 API](https://developers.weixin.qq.com/miniprogram/dev/server/API/order_shipping/api_uploadshippinginfo)
- [交易类小程序运营规范](https://developers.weixin.qq.com/miniprogram/product/jiaoyilei/yunyingguifan.html)
- [微信小程序平台运营规范](https://developers.weixin.qq.com/miniprogram/product/)
- [小程序协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)

## 7. ROADMAP 同步规则

- 开始任务时，只在 `ROADMAP.md` 标为“进行中”，不提前标完成。
- 完成代码但未跑自动测试，继续保持未完成。
- 自动测试通过但尚需微信后台/真机验证时，记录“代码完成，平台验收待办”。
- 数据库迁移、环境变量、部署、提审和发布分别记录确认人与日期。
- 只有本任务的自动验证、人工验收和证据都齐全，才能移动到“已完成”。
