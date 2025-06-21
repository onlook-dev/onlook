#!/bin/sh

# This script starts the local deployment using Docker Compose.

# Ensure the .env file exists for the client app
if [ ! -f ./apps/web/client/.env ]; then
  echo ".env file not found in ./apps/web/client/. Please create it from .env.example."
  exit 1
fi

docker network create deployment-onlook_network || true
# Start the services using the docker-compose file in the nginx directory
echo "Starting Client Service..."
docker rm -f client || true
docker build -f apps/web/client/Dockerfile -t client .
docker run --name client --network deployment-onlook_network client