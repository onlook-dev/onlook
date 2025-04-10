# Use the official Bun image
FROM oven/bun:slim

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if they exist)
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Expose port 8083
EXPOSE 8083

# Start the server
CMD ["bun", "server/index.ts"] 