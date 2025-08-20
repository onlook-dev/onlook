FROM oven/bun:slim AS base
WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install

# Build the application
WORKDIR /app/apps/web/client
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"

RUN bun run build

# Start the production server
CMD ["bun", "run", "start"]