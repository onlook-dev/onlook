FROM oven/bun:slim

WORKDIR /app

COPY package.json bun.lock ./ 
RUN bun install

COPY . .

EXPOSE 8081

CMD ["bun", "run", "dev"] 