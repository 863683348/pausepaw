# PausePaw · 可部署 MVP（出海版防沉迷 SaaS + 插件）

按 PRD（`PRD_防沉迷SaaS_出海版.md`）实现的**真实可部署、可上线使用**的 MVP：
- **后端**：Node 内置 `http` + `sqlite` + `crypto`，**零外部依赖、无需 `npm install`、无原生编译**。
- **前端**：账号体系（邮箱注册/登录、JWT）、领养伙伴、云端规则、真实看板统计。
- **插件**：登录后在网站「扩展」页拿到**设备 Token**，粘贴进插件即**云端同步规则 + 上报真实拦截数据**到看板。
- **部署**：`node server.js` 即可跑；或 `docker build` + `docker run` 一键容器化。

对应 PRD：F-AC / F-ON / F-RU / **F-SYNC（云端同步，提前实现以支持“真可用”）** / F-DA / F-I18N。

---

## 1. 本地运行

```bash
cd mvp
node server.js
# 打开 http://localhost:3000
```

依赖：Node ≥ 22.5（用到内置 `node:sqlite`）。数据库在 `mvp/data/app.db` 自动创建。

> 部署到公网时设置 `SITE_URL`（如 `https://pausepaw.com`），用于 SEO 的 canonical / sitemap / og 链接正确生成；缺省为 `http://localhost:${PORT}`。

## 2. Docker 部署

```bash
cd mvp
docker build -t pausepaw .
docker run -d --name pausepaw \
  -e PORT=3000 \
  -e JWT_SECRET=你的随机长字符串 \
  -e SITE_URL=https://pausepaw.com \
  -v $(pwd)/data:/app/data \
  -p 3000:3000 pausepaw
```

部署到云（如 Vercel / Railway / 任意 VPS）时，把 `mvp/` 作为服务根目录、`npm start` 启动即可；记得：
- 设置强随机 `JWT_SECRET`
- 设置 `SITE_URL` 为你的真实域名
- 用卷/对象存储持久化 `DB_PATH`
- 如需真实上架，补隐私政策、Cookie 同意、GDPR/CCPA（见 PRD 非功能需求）

## 2.1 安全响应头与 SEO（已内置，上线前已就绪）

- **安全响应头**（所有响应自动带）：`Content-Security-Policy`（默认 self + 必要 inline）、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Strict-Transport-Security`、`Permissions-Policy`（禁用定位/相机/麦克风）。
- **SEO 端点**：`/robots.txt`（允许抓取并指向 sitemap）、`/sitemap.xml`（首页+控制台，含 zh/en/x-default hreflang 互换）。
- **页面元数据**：`index.html` / `app.html` 已含 title/description/keywords/canonical/hreflang/OpenGraph + JSON-LD（`SoftwareApplication`）。其中域名占位 `%%SITE_URL%%` 由后端按 `SITE_URL` 注入。
- 提交 Search Console 时填入 `https://你的域名/sitemap.xml` 即可。

## 2.2 分析监控（GA4 + 热力，项 7 已完成）

- **GA4（漏斗）**：注册 `sign_up`、登录 `login`、保存规则 `save_rules`、看板 `view_dashboard`、插件连接 `extension_connected`（GA4 标准事件 + 自定义事件，在 `public/app.js` / `i18n.js` 的 `trackEvent()` 中埋点）。
- **Microsoft Clarity（免费热力图 + 回放）**：自动捕获点击/滚动/会话，无需额外埋点。
- **仅生产加载**：设置 `GA4_MEASUREMENT_ID` 和/或 `CLARITY_ID` 且 `NODE_ENV=production`（或 `SITE_URL` 为真实域名）时，后端才向 `index.html` / `app.html` 注入脚本；localhost 不注入，避免污染真实数据。
- **CSP 自适应**：启用分析时，安全响应头自动放开 `googletagmanager.com` / `google-analytics.com` / `clarity.ms` 等域名；未启用时保持严格 `self`。
- **合规提醒**：面向欧盟用户时，GA4/Clarity 属 Cookie/分析追踪，需配合 Cookie 同意横幅与隐私政策（见 PRD 非功能需求），本 MVP 暂未内置同意层。

## 2.3 谷歌登录（项 5 已完成）

- 采用 **Google OAuth2 authorization code 流程，零新增 SDK 依赖**（纯 `fetch` 调 Google REST）。邮箱密码登录与 Google 登录并存，共用同一套自签 JWT。
- 启用：在 Google Cloud Console 创建 **OAuth 客户端（Web 应用）**，把 `{SITE_URL}/api/auth/google/callback` 加入「已获授权的重定向 URI」；然后在环境变量填入 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`（见 `.env.example`）。留空则前端按钮自动隐藏。
- 安全细节：`state` 参数防 CSRF（存 HttpOnly cookie，回调校验）；生产环境（`IS_PROD`）下 cookie 自动加 `Secure`；回调换 token 与拉 userinfo 均走服务端，前端只拿到最终 JWT（落在 URL 片段 `#token=`，读取后即清痕）。
- 用户体验：登录页出现「使用 Google 登录」按钮 → 跳 Google 同意屏 → 回跳即自动登录进控制台。

## 2.4 PayPal 支付（项 6 已完成）

- 采用 **PayPal Subscriptions（订阅）模式**，零新增 SDK 依赖（纯 `fetch` 调 PayPal REST）。
- 会员档位：`Pro`（$4.99/月）、`Family`（$9.99/月），对应 PRD 的会员/家庭版变现。免费版核心防沉迷永久可用。
- 启用步骤（在 `.env` 注入，Node 不会自动读取，请写在启动命令里）：
  1. 在 [PayPal Developer](https://developer.paypal.com) 创建 App，拿到 **Client ID / Secret** → 填入 `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`。
  2. 在 PayPal 后台创建 **Product + Plan**（月付），把两个 Plan ID 分别填入 `PAYPAL_PLAN_PRO` / `PAYPAL_PLAN_FAMILY`。
  3. 在 App 的 Webhooks 里把 `{SITE_URL}/api/billing/webhook` 加为事件接收地址，拿到 **Webhook ID** 填入 `PAYPAL_WEBHOOK_ID`（生产建议配置以校验签名；本地测试可留空）。
  4. `PAYPAL_MODE` 默认 `sandbox`（测试），真实收款改 `live`。
- 流程：控制台「会员」页选档位 → `POST /api/billing/subscribe` 创建订阅并跳 PayPal 同意屏 → 用户授权后回跳 `/api/billing/success` → 后端校验订阅状态并开通权益（`users.plan` / `plan_expires`）。PayPal 的 `BILLING.SUBSCRIPTION.ACTIVATED` / `CANCELLED` 等事件经 Webhook 同步撤销/续期。
- 凭据留空时，前端「会员」页显示「支付功能尚未启用」，不暴露订阅入口。

## 3. 体验完整闭环（真·可用）

1. 浏览器打开 `http://localhost:3000` → 注册账号 → 登录
2. 「领养伙伴」起名；「休息规则」填域名（如 `youtube.com`）、阈值选**秒**设 `10`、休息 `5` 秒 → **保存规则**（已落云端）
3. 打开「扩展」页，**复制设备 Token**
4. 插件：`chrome://extensions` → 开发者模式 → 加载已解压的 `mvp/extension` → 弹窗里填**后端地址**（本地即 `http://localhost:3000`）+ 粘贴 Token → 「连接云端」
5. 打开 `https://www.youtube.com`，保持页面可见且有焦点约 10 秒 → 全屏遮罩出现，倒计时 5 秒，无关闭键
6. 倒计时结束自动淡出；回网站「看板」页 → **今日拦截 / 累计省下 / 连续守规**已真实更新（数据来自云端）
7. 改规则保存后，插件每 30 秒自动拉取最新配置（云端同步）

> 插件「后端地址」在生产环境改成你的域名（如 `https://pausepaw.com`），插件即连生产后端。

---

## 4. API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 否 | 邮箱+密码注册，返回 JWT + 用户（含 `device_token`） |
| POST | `/api/auth/login` | 否 | 登录，返回 JWT |
| GET | `/api/me` | JWT | 当前用户 |
| POST | `/api/mascot` | JWT | 领养/改名 |
| POST | `/api/locale` | JWT | 界面语言 |
| GET/POST | `/api/rules` | JWT | 读取/保存规则 |
| GET | `/api/config?token=` | 设备 Token | 插件拉配置（跨域） |
| POST | `/api/events` | 设备 Token | 插件上报拦截事件 |
| GET | `/api/stats` | JWT | 看板统计 |
| GET | `/api/billing/config` | 可选 JWT | 支付是否启用、可购计划、当前会员 |
| POST | `/api/billing/subscribe` | JWT | 发起 PayPal 订阅，返回 `approve_url` |
| GET | `/api/billing/success` | 否（PayPal 回跳） | 订阅成功页，开通权益 |
| GET | `/api/billing/cancel` | 否（PayPal 回跳） | 订阅取消页 |
| POST | `/api/billing/webhook` | 否（PayPal 事件） | Webhook 同步订阅状态 |

## 5. 目录结构

```
mvp/
├─ server.js            # 零依赖后端（http+sqlite+crypto）
├─ package.json         # type:module, start 脚本
├─ Dockerfile           # 容器化部署
├─ .env.example         # 环境变量示例
├─ public/              # 前端（调 API 的真实站点）
│  ├─ index.html  app.html  app.js  i18n.js  styles.css  mascot.svg
└─ extension/           # Chrome MV3 插件（云端同步版）
   ├─ manifest.json  popup.html  popup.js  content.js
```

## 6. 与“演示版”的区别 & 下一步（P2+）

- 演示版（`mvp/website/`，旧）：localStorage 占位、粘贴 JSON、无后端。本版已取代它，为真后端 + 云端同步。
- 下一步：多吉祥物/皮肤图鉴、端侧 LLM 陪聊、欧盟数据落 `eu-west-1`、隐私政策与合规、Cookie 同意横幅（配合 GA4/Clarity）、Apple OAuth 登录。
