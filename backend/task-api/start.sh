#!/bin/bash

cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the server
echo "Starting Task API server on port ${TASK_API_PORT:-3100}..."
exec npm start
