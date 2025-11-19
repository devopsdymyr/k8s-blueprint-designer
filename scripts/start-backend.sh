#!/bin/bash

# Start the Kubernetes Discovery Engine backend

cd "$(dirname "$0")/../backend"

echo "Starting Kubernetes Discovery Engine..."
echo "Make sure you have kubeconfig configured"
echo ""

go run main.go "$@"

