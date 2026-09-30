# TalkTrack CRM — container image for our own VPS.
#
# Multi-stage so the runtime image carries only the built app: Next's
# "standalone" output plus the Prisma engines. NEXT_PUBLIC_* values are baked
# into the client bundle at build time, so they must be passed as build args.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public values are compiled into the browser bundle — they are not secrets.
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_META_CONFIG_ID
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID \
    NEXT_PUBLIC_META_CONFIG_ID=$NEXT_PUBLIC_META_CONFIG_ID \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
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
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# .bin is where npx finds the prisma CLI — without it "npx prisma migrate
# deploy" inside this container tries to download Prisma from npm instead.
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

USER app
EXPOSE 3000
CMD ["node", "server.js"]
