#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate CA key and certificate (valid for 10 years)
openssl genrsa -out certs/rootCA.key 4096
openssl req -x509 -new -nodes -key certs/rootCA.key -sha256 -days 3650 \
    -out certs/rootCA.pem \
    -subj "/C=US/ST=Local/L=Local/O=Development/CN=Local Development CA"

# Generate server key and CSR
openssl genrsa -out certs/key.pem 2048
openssl req -new -key certs/key.pem \
    -out certs/server.csr \
    -subj "/C=US/ST=Local/L=Local/O=Development/CN=localhost"

# Sign the certificate (valid for 10 years)
openssl x509 -req -in certs/server.csr \
    -CA certs/rootCA.pem \
    -CAkey certs/rootCA.key \
    -CAcreateserial \
    -out certs/cert.pem \
    -days 3650 \
    -sha256 \
    -extfile <(printf "subjectAltName=DNS:localhost,IP:127.0.0.1") 