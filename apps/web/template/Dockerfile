FROM oven/bun:slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]   