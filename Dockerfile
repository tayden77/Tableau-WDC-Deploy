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
    EXPOSE 3333
    CMD ["npm","start"]
    