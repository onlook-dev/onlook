#!/bin/bash

if [[ ! -f ./ssl/onlook-internal.key || ! -f ./ssl/onlook-internal.crt ]]; then
  echo "Either key or cert is missing — running command..."
  ./bin/genkeys.sh
fi

docker compose up -d
