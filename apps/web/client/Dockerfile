FROM oven/bun:alpine
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
WORKDIR /app/apps/web/client
EXPOSE 3000
CMD ["bun", "run", "dev"] 