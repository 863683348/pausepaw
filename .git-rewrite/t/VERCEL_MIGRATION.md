# pause-paw Vercel 迁移方案

> 从 Railway 迁移到 Vercel (dafeixiang 团队)，保留后端 API (serverless + Turso)

## 现状分析

### 当前架构
- **平台**: Railway (Docker, node:22-alpine)
- **入口**: `server.js` (51KB, Node22 `node:http` + `node:sqlite`)
- **数据库**: SQLite (`data/app.db`, 当前 0 行)
- **运行时占位符**: `%%SITE_URL%%` (205处) / `%%ANALYTICS%%` (21) / `%%ADSENSE%%` (20)

### API 路由清单
| 路由 | 方法 | 功能 | 是否依赖 DB |
|------|------|------|------------|
| `/api/auth/register` | POST | 用户注册 | 是 |
| `/api/auth/login` | POST | 用户登录 | 是 |
| `/api/config` | GET | 设备配置 (token) | 是 |
| `/api/events` | POST | 记录休息事件 | 是 |
| `/api/auth/google` | GET | Google OAuth 发起 | 否 |
| `/api/auth/google/callback` | GET | Google OAuth 回调 | 是 |
| `/api/billing/config` | GET | 订阅配置 | 否 |
| `/api/characters` | GET | 角色列表 | 是 |
| `/api/characters/activate` | POST | 激活角色 | 是 |
| `/api/billing/subscribe` | POST | PayPal 订阅 | 否 |
| `/api/billing/success` | GET | 订阅成功回调 | 是 |
| `/api/billing/cancel` | GET/POST | 取消订阅 | 是 |
| `/api/billing/webhook` | POST | PayPal webhook | 是 |
| `/api/stats` | GET | 统计数据 | 是 |
| `/api/me` | GET | 当前用户 | 是 |
| `/api/mascot` | POST | 吉祥物设置 | 否 |
| `/api/locale` | POST | 语言设置 | 是 |
| `/api/rules` | GET/POST | 休息规则 | 是 |
| `/sitemap.xml` | GET | 动态生成 | 否 |
| `/robots.txt` | GET | 静态返回 | 否 |

### Chrome 扩展依赖
- `/api/events` - 记录屏幕时间事件
- `/api/me` - 获取当前用户信息
- `/api/config?token=` - 拉取设备配置
- `/api/auth/google?ext=1` - 扩展登录

## 迁移方案

### 方案: Vercel Serverless + Turso

#### 1. 前端静态化
- **框架**: 纯静态 (no framework)
- **输出目录**: `public/`
- **构建脚本**: `scripts/build-vercel.cjs`
  - 替换 `%%SITE_URL%%` → `${SITE_URL}` (Vercel env)
  - 替换 `%%ANALYTICS%%` → GA4/Clarity 代码 (从 env 读取)
  - 替换 `%%ADSENSE%%` → 广告代码 (从 env 读取)
  - 生成静态 `sitemap.xml`
  - 生成静态 `robots.txt`

#### 2. 后端 API (Vercel Serverless Functions)
- **位置**: `api/` 目录
- **数据库**: Turso (libSQL, serverless SQLite)
- **认证**: JWT (与现有逻辑兼容)
- **环境变量**: 全部从 Vercel env 读取

##### API 函数映射
```
api/auth/register/route.js     → POST /api/auth/register
api/auth/login/route.js        → POST /api/auth/login
api/auth/google/route.js       → GET /api/auth/google
api/auth/google/callback/route.js → GET /api/auth/google/callback
api/config/route.js            → GET /api/config
api/events/route.js            → POST /api/events
api/billing/config/route.js    → GET /api/billing/config
api/characters/route.js        → GET /api/characters
api/characters/activate/route.js → POST /api/characters/activate
api/billing/subscribe/route.js → POST /api/billing/subscribe
api/billing/success/route.js   → GET /api/billing/success
api/billing/cancel/route.js    → GET/POST /api/billing/cancel
api/billing/webhook/route.js   → POST /api/billing/webhook
api/stats/route.js             → GET /api/stats
api/me/route.js                → GET /api/me
api/mascot/route.js            → POST /api/mascot
api/locale/route.js            → POST /api/locale
api/rules/route.js             → GET/POST /api/rules
```

#### 3. 数据库迁移
- **源**: SQLite (`data/app.db`)
- **目标**: Turso (libSQL)
- **表结构**: 从现有 DB 导出 schema + 数据
- **当前状态**: 0 行，无需迁移数据

##### Turso 初始化
```bash
turso db create pausepaw --org 863683348
turso db show pausepaw
# 获取 database_url 和 token，注入 Vercel env
```

#### 4. Vercel 配置
```json
{
  "framework": null,
  "buildCommand": "node scripts/build-vercel.cjs",
  "outputDirectory": "public",
  "devCommand": "node server.js",
  "env": {
    "SITE_URL": "https://pause-paw.shop",
    "NODE_ENV": "production",
    "JWT_SECRET": "***",
    "TURSO_DATABASE_URL": "***",
    "TURSO_AUTH_TOKEN": "***",
    "ADSENSE_CLIENT_ID": "ca-pub-9043592188127461",
    "GA4_MEASUREMENT_ID": "***",
    "GOOGLE_CLIENT_ID": "***",
    "GOOGLE_CLIENT_SECRET": "***",
    "PAYPAL_CLIENT_ID": "***",
    "PAYPAL_CLIENT_SECRET": "***",
    "PAYPAL_MODE": "sandbox"
  }
}
```

#### 5. 部署流程
1. 创建 Vercel 项目 (dafeixiang 团队)
2. Git 关联 GitHub `863683348/pausepaw`
3. 注入环境变量 (明文)
4. 创建 Turso 数据库
5. 首次部署 → 触发构建
6. 验证 API 端点
7. 挂自定义域名 `pause-paw.shop`
8. 修改 DNS 解析 (指向 Vercel)
9. 停用 Railway

## 实施步骤

### Phase 1: 准备 (1-2 小时)
1. 创建 `api/` 目录结构
2. 从 `server.js` 提取 API 路由逻辑到各 `route.js`
3. 安装 `@libsql/client` 替代 `node:sqlite`
4. 编写 `scripts/build-vercel.cjs`
5. 创建 `vercel.json`

### Phase 2: 本地测试 (1 小时)
1. `vercel dev` 测试所有 API
2. 验证 Chrome 扩展连接
3. 验证 SEO 功能 (sitemap, robots.txt)

### Phase 3: Vercel 部署 (30 分钟)
1. 创建项目
2. 注入 env
3. 首次部署
4. 验证生产环境

### Phase 4: 域名切换 (15 分钟)
1. 获取 Vercel DNS 记录
2. 修改 DNS 解析
3. 验证 HTTPS
4. 停用 Railway

### Phase 5: 清理 (30 分钟)
1. 删除 Railway 服务
2. 更新文档
3. 监控日志

## 成本估算
- **Vercel Hobby**: 免费 (100GB 带宽/月)
- **Turso**: 免费 (1GB 存储, 100万次读/月)
- **总计**: $0/月 (当前 Railway 约 $5-10/月)

## 风险与缓解
| 风险 | 缓解措施 |
|------|---------|
| Serverless 冷启动 | Vercel 自动预热，免费额度足够 |
| Turso 连接限制 | libSQL 连接池，免费额度 10万请求/月 |
| 域名切换中断 | 提前降低 TTL，双栈运行 24h |
| Chrome 扩展兼容性 | 本地测试验证所有 API |

## 后续优化
1. 添加 API 缓存 (Redis/Upstash)
2. 启用 Vercel Analytics
3. 配置 Turso 自动备份
4. 添加 API 限流
