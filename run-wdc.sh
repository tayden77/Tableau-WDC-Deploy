#!/bin/bash

echo "🔧 Rebuilding Docker image for renxt-wdc..."
docker build -t renxt-wdc .

if [ $? -eq 0 ]; then
  echo "🚀 Running container on http://localhost:3333"
  docker run --rm --env-file .env -p 3333:3333 renxt-wdc
else
  echo "❌ Build failed. Container not started."
fi
