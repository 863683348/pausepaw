# pause-paw Vercel 迁移状态

## 迁移时间线
- 2026-08-22 15:24 开始迁移到 Vercel

## 当前状态
- 从 Railway 迁移到 Vercel
- 前端：静态文件 (public/)
- 后端：Vercel Serverless Functions (api/)
- 数据库：Turso (libSQL)

## 迁移步骤
1. ✅ 创建 API 目录结构
2. 🔄 提取 API 路由到各 route.js
3. ⏳ 安装 Turso 客户端
4. ⏳ 创建构建脚本
5. ⏳ 创建 vercel.json
6. ⏳ 部署到 Vercel

## 环境变量清单
- SITE_URL
- NODE_ENV
- JWT_SECRET
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- ADSENSE_CLIENT_ID
- GA4_MEASUREMENT_ID
- CLARITY_ID
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_MODE
- PAYPAL_PLAN_PRO
- PAYPAL_PLAN_PRO_YEAR
- PAYPAL_PLAN_FAMILY
