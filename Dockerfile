# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production

# Unprivileged user
RUN addgroup -g 1001 appgroup && \
    adduser -S -G appgroup -u 1001 appuser

EXPOSE 3333

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3333/healthz', res => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["npm","start"]
