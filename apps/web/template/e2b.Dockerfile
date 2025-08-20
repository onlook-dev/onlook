# You can use most Debian-based base images
FROM ubuntu:22.04

# Install dependencies and customize sandbox
WORKDIR /code

ENV NODE_VERSION=24
ENV NVM_DIR=/root/.nvm

RUN apt-get update && apt-get install -y curl unzip
RUN curl -fsSL https://bun.com/install | bash
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION

COPY . .
RUN /root/.bun/bin/bun install

EXPOSE 3000

# CMD ["/root/.bun/bin/bun", "run", "dev"]
