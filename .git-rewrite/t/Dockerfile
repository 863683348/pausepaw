FROM node:22-alpine

WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache python3 make g++

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 运行构建脚本
RUN node scripts/build-vercel.cjs

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
