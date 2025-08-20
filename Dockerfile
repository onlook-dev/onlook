# Build locally first with: bun run build
# Then copy the built artifacts

FROM oven/bun:slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

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

# Copy public and .next directories to where the server.js expects them
# The server.js changes directory to its own location and expects public/.next there
RUN cp -r public .next/standalone/apps/web/client/ 2>/dev/null || true
RUN cp -r .next/static .next/standalone/apps/web/client/.next/ 2>/dev/null || true

EXPOSE 3000

CMD ["bun", ".next/standalone/apps/web/client/server.js"]