#!/bin/bash

# Start the React Frontend

cd "$(dirname "$0")/../frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting React development server..."
npm start

