FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /tmp/terabox-downloads && \
    chown -R appuser:appgroup /app /tmp/terabox-downloads

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV DOWNLOAD_DIRECTORY=/tmp/terabox-downloads
ENV PORT=7860

USER appuser

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7860/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "src/index.js"]
