FROM node:22-alpine AS base

ARG HOST_UID=1000
ARG HOST_GID=1000

WORKDIR /app

ENV COREPACK_HOME=/usr/local/share/corepack

RUN corepack enable \
    && corepack prepare pnpm@10.29.3 --activate \
    && chmod -R a+rX ${COREPACK_HOME}

RUN { getent passwd ${HOST_UID} && deluser "$(getent passwd ${HOST_UID} | cut -d: -f1)"; } 2>/dev/null || true \
    && { getent group ${HOST_GID} && delgroup "$(getent group ${HOST_GID} | cut -d: -f1)"; } 2>/dev/null || true \
    && addgroup -S -g ${HOST_GID} rakkoons \
    && adduser -S -u ${HOST_UID} -G rakkoons rakkoons \
    && chown -R rakkoons:rakkoons /app

FROM base AS dependencies

USER rakkoons

COPY --chown=rakkoons:rakkoons package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS dependencies-prod

USER rakkoons

COPY --chown=rakkoons:rakkoons package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --prod

FROM base AS build

USER rakkoons

COPY --from=dependencies --chown=rakkoons:rakkoons /app/node_modules ./node_modules
COPY --chown=rakkoons:rakkoons src/ ./src/
COPY --chown=rakkoons:rakkoons prisma/ ./prisma/
COPY --chown=rakkoons:rakkoons .docker/ ./docker/
COPY --chown=rakkoons:rakkoons package.json ./package.json
COPY --chown=rakkoons:rakkoons prisma.config.ts ./prisma.config.ts
COPY --chown=rakkoons:rakkoons tsconfig.json ./tsconfig.json
COPY --chown=rakkoons:rakkoons tsconfig.build.json ./tsconfig.build.json

RUN pnpm run db:generate
RUN pnpm run build

FROM base AS production

COPY --from=dependencies-prod --chown=rakkoons:rakkoons /app/node_modules ./node_modules
COPY --from=build --chown=rakkoons:rakkoons /app/dist ./dist
COPY --from=build --chown=rakkoons:rakkoons /app/package.json ./package.json  
COPY --from=build --chown=rakkoons:rakkoons /app/docker/ ./docker/

EXPOSE 8080

RUN chmod +x /app/docker/entrypoint.sh

USER rakkoons

ENTRYPOINT ["/app/docker/entrypoint.sh"]

FROM base AS development

COPY --from=dependencies --chown=rakkoons:rakkoons /app/node_modules ./node_modules

EXPOSE 8080

USER rakkoons

CMD ["pnpm", "run", "start:dev"]
