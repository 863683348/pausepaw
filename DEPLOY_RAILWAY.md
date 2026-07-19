# PausePaw 部署指南（Railway）

本指南面向 **Railway**（https://railway.app）。选型原因：本 MVP 是常驻 `node server.js` + 本地 SQLite 文件库，Railway 能原样运行，**零代码改动**。Vercel 只支持无服务函数 + 只读临时盘，跑不了这个后端，故不选。

> 前置条件：代码已 push 到 GitHub 仓库 `https://github.com/863683348/pausepaw`（仓库已建好，本机执行 `git push -u origin main` 即可）。

---

## 1. 三步创建部署

1. 打开 https://railway.app → 用 GitHub 登录 → **New Project** → **Deploy from GitHub repo** → 选 `pausepaw`。
2. Railway 自动按仓库里的 `railway.json` 用 Nixpacks 构建，启动命令 `node server.js`，健康检查 `/`。
3. 首次部署会失败/告警（缺 `JWT_SECRET`）——正常，进 **Variables** 补完变量后重部署即可。

---

## 2. 环境变量（Variables）

### 必填（不填登录会炸）
| 变量 | 示例值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | `openssl rand -hex 32` 生成的随机串 | 签发登录 JWT 的密钥，**务必随机且保密** |
| `SITE_URL` | `https://pausepaw.up.railway.app` | 部署后拿到的域名填这里（含 https://），SEO/分析/Cookie 依赖它 |
| `NODE_ENV` | `production` | 启用安全头强化、Secure Cookie、生产分析注入 |

### 数据库持久化（强烈建议）
| 变量 | 示例值 | 说明 |
|------|--------|------|
| `DB_PATH` | `/data/app.db` | 仅在挂了 Volume 时填；见下方「持久化」 |

Railway 默认文件系统**重启即清空**，不挂 Volume 用户数据会丢。请务必挂一个 Volume：
- Project → **Storage / Volumes** → New Volume → Mount Path 填 `/data` → 保存。
- 然后把 `DB_PATH` 设为 `/data/app.db`。

### 可选（按功能启用）
| 变量 | 说明 | 关联功能 |
|------|------|----------|
| `GA4_MEASUREMENT_ID` | `G-XXXX`（analytics.google.com 建） | 流量漏斗分析 |
| `CLARITY_ID` | `XXXX`（clarity.microsoft.com 建，免费） | 热力图/回放 |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Web 客户端 | 谷歌登录（项 5）；留空则按钮隐藏 |
| `GOOGLE_REDIRECT_URI` | 默认 `SITE_URL+/api/auth/google/callback` | 一般不用改 |
| `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` | PayPal Developer App | 订阅支付（项 6） |
| `PAYPAL_MODE` | `sandbox` 或 `live` | 默认 sandbox |
| `PAYPAL_PLAN_PRO` / `PAYPAL_PLAN_FAMILY` | PayPal 后台建的 Plan ID | Pro $4.99 / Family $9.99 |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID | 订阅状态同步 |

> 变量改完点 **Redeploy** 才会生效。

---

## 3. 拿到正式域名

- 部署变绿后 → **Settings → Domains** → Railway 会分配 `https://pausepaw.up.railway.app`（前缀可改）。
- 想用品牌域名（如 `pausepaw.com`）：自己在域名商购买 → DNS 解析到 Railway → 在 Domains 里 **Add Custom Domain** 并验证。
- 拿到域名后，把 `SITE_URL` 更新为该域名，**再 Redeploy 一次**，让 SEO/分析/Cookie 指向正确地址。

---

## 4. 接 Chrome 插件

插件（`extension/`）的服务端地址**不写死**，走弹窗里的「服务端地址」输入框（默认 `localhost:3000`）。上线后：
1. 打开插件弹窗 → 把地址改成你的 Railway 域名（如 `https://pausepaw.up.railway.app`）。
2. 控制台拿 `device_token` → 粘贴到插件 → 规则云端同步生效。
**无需改任何代码。**

---

## 5. 上线后验证清单

- [ ] 根路径 `/` 返回落地页（健康检查通过）
- [ ] `/app.html` 能注册、登录，拿到 `device_token`
- [ ] 设规则 → 插件拉到配置 → 访问受限站触发全屏遮罩 → 看板有事件
- [ ] `/robots.txt`、`/sitemap.xml` 可访问（SEO）
- [ ] 控制台「会员」Tab 在填了 `PAYPAL_*` 后出现定价卡

---

## 6. 已知边界（非阻塞）

- **SQLite 并发**：Railway 单实例足够 MVP；如未来高并发，再换 Postgres。
- **欧盟合规**：GA4/Clarity 属追踪，面向欧盟用户需补 Cookie 同意横幅 + 隐私政策（PRD 非功能需求，本 MVP 未内置）。
- **PayPal 回跳/Webhook** 必须公网 HTTPS，Railway 域名天然满足。
- `SITE_URL` 含 `localhost` 时 `IS_PROD` 为假，分析脚本不注入；正式部署务必设为真实域名 + `NODE_ENV=production`。

---

## 7. 回滚与重部署

- 改坏配置：Variables 改回 → Redeploy。
- 代码回滚：GitHub 上 revert commit → Railway 自动重新部署（若开启 auto-deploy）。
- 本地服务（`localhost:3000`）仍可测试，与线上互不干扰。
