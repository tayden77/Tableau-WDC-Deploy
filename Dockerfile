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

    # Create an unprivileged user (UID/GID 1001) for better security
    RUN addgroup -g 1001 appgroup && \
        adduser -S -G appgroup -u 1001 appuser

    EXPOSE 3333

    # Run the container as the unprivileged user
    USER appuser

    # Configure a health check. It calls /healthz route and fails the container if no 200 response in 5 seconds
    HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries= \
        CMD node -e "require('http').get('http://localhost:3333/healthz', res => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
        
    CMD ["npm","start"]
    