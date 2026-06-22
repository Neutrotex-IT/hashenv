# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install all dependencies (including dev) for compilation
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Compile TypeScript
FROM deps AS builder
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

# Production image
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 hashenv \
  && adduser --system --uid 1001 --ingroup hashenv hashenv

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER hashenv
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
