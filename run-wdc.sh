#!/bin/bash

echo "Building Docker image..."
docker build -t renxt-wdc .

echo "Running container..."
docker run --rm --env-file .env -p 3333:3333 renxt-wdc