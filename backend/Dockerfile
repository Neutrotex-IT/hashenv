# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---------------------------------------------------------------------------
# deps: install all dependencies (cached when lockfile unchanged)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------------------------------------------------------------------------
# development: tsx watch (source bind-mounted by compose)
# ---------------------------------------------------------------------------
FROM deps AS development
ENV NODE_ENV=development
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# test: vitest against Docker Mongo (compose sets MONGODB_URI)
# ---------------------------------------------------------------------------
FROM deps AS test
ENV NODE_ENV=test
COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
CMD ["npm", "test"]

# ---------------------------------------------------------------------------
# builder: compile TypeScript for production
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

# ---------------------------------------------------------------------------
# production / runner
# ---------------------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 hashenv \
  && adduser --system --uid 1001 --ingroup hashenv hashenv

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER hashenv
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

# Default target for Coolify / plain `docker build` (production)
FROM production AS runner
