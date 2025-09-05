#!/bin/bash

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./ssl/onlook-internal.key -out ./ssl/onlook-internal.crt -config ./ssl/openssl.cnf

# Add the certificate to the keychain – works on Mac
if command -v security &> /dev/null; then
  security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db ./ssl/onlook-internal.crt
else
  echo "Warning: security is not installed"
fi
