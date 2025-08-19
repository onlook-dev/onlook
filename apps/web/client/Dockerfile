FROM oven/bun:slim AS base
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN bun run build

# Expose port 3000
EXPOSE 3000

# Start the production server
CMD ["bun", "run", "start"]