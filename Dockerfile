# PausePaw 部署镜像（零依赖，仅需 Node 22）
FROM node:22-bookworm-slim

WORKDIR /app

# 仅复制必要文件（数据目录运行时生成）
COPY package.json server.js ./
COPY public ./public

ENV PORT=3000
ENV JWT_SECRET=change-me-in-prod
ENV DB_PATH=/app/data/app.db

# 持久化数据库
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.js"]
