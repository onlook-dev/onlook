FROM oven/bun:slim AS base
WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install --frozen-lockfile

# Build the application
WORKDIR /app/apps/web/client
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# Expose port 3000
EXPOSE 3000

# Start the production server
CMD ["bun", "run", "start"]