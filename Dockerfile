FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建原生依赖所需工具（如 ssh2 的可选依赖 cpu-features）
RUN apk add --no-cache python3 make g++

# 启用 corepack 以使用 pnpm（根据 pnpm-lock.yaml 安装依赖）
RUN corepack enable

# 仅复制依赖清单以利用 Docker 缓存
COPY package.json pnpm-lock.yaml ./

# 安装依赖并执行 nuxt 准备脚本
RUN pnpm install --frozen-lockfile

# 复制剩余项目文件
COPY . .

# 为 Node 服务环境构建 Nuxt（Nitro preset 为 node-server）
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
RUN pnpm build

# 只保留生产依赖，减小最终镜像体积
RUN pnpm prune --prod

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV PORT=3000

# 从构建阶段复制产物与生产依赖
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# 直接启动 Nitro 生产服务器
CMD ["node", ".output/server/index.mjs"]

