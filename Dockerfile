FROM node:24-bookworm-slim AS builder
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    apt-get install -y --no-install-recommends thrift-compiler && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --progress=false

COPY . .

RUN [ -f settings.yml ] || ( [ -f settings-example.yml ] && cp settings-example.yml settings.yml ) || true

RUN npm run gen-thrift && npm run build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/thrift/gen-nodejs ./dist/thrift/gen-nodejs
COPY --from=builder /app/settings.yml ./settings.yml

RUN npm prune --production --no-audit --no-fund || true

EXPOSE 3000
CMD ["node", "dist/main.js"]

# docker build -t bs-parser .
# docker run -p 3000:3000 --name bs-parser `
#    -v "$(pwd)/settings.yml:/app/settings.yml:ro" `
#    bs-parser