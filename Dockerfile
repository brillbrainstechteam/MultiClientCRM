# TalkTrack CRM — container image for our own VPS.
#
# Multi-stage so the runtime image carries only the built app: Next's
# "standalone" output plus the Prisma engines. NEXT_PUBLIC_* values are baked
# into the client bundle at build time, so they must be passed as build args.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# package.json's postinstall runs `prisma generate`, so the schema has to be
# present before npm ci — otherwise the install fails looking for it.
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public values are compiled into the browser bundle — they are not secrets.
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_META_CONFIG_ID
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID \
    NEXT_PUBLIC_META_CONFIG_ID=$NEXT_PUBLIC_META_CONFIG_ID \
    NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npx next build

FROM node:22-alpine AS runner
WORKDIR /app
# Fixed uid so the host uploads directory can be chowned to a known owner.
# 10001 deliberately avoids the 1000-1999 range CloudPanel uses for site users
# (uid 1001 on this box is CloudPanel's own "clp" account).
RUN apk add --no-cache openssl && addgroup -S -g 10001 app && adduser -S -u 10001 app -G app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Standalone bundles only the files the server actually needs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Schema + migrations so `prisma migrate deploy` can run from this image.
COPY --from=builder /app/prisma ./prisma
# The Prisma CLI's dependency tree changes between versions (6.19 pulled in
# @prisma/config -> effect, c12, …). Cherry-picking a few packages broke on
# every bump, so copy the full module tree — this overlays the slim standalone
# one and guarantees `npx prisma migrate deploy` has everything it needs.
COPY --from=builder /app/node_modules ./node_modules

USER app
EXPOSE 3000
CMD ["node", "server.js"]
