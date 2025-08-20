# Build locally first with: bun run build
# Then copy the built artifacts

FROM oven/bun:slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy monorepo root files for workspace dependencies
COPY package.json bun.lock ./

# Copy all workspace packages
COPY packages ./packages
COPY tooling ./tooling
COPY docs ./docs

# Copy all apps (needed for workspace dependencies)
COPY apps ./apps

# Install all dependencies (needed for monorepo workspaces)
RUN bun install

# Set working directory to the client app
WORKDIR /app/apps/web/client

EXPOSE 3000

CMD ["bun", "run", "start"]