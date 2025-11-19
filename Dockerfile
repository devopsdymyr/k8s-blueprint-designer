# Multi-stage build for K8s Blueprint Designer

# Stage 1: Build backend
FROM golang:1.21-alpine AS backend-builder
WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o k8s-discovery-engine .

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 3: Production image
FROM alpine:latest
RUN apk --no-cache add ca-certificates curl
WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /build/k8s-discovery-engine /app/

# Copy frontend build
COPY --from=frontend-builder /build/build /app/frontend

# Create a simple HTTP server for frontend
RUN echo '#!/bin/sh' > /app/serve-frontend.sh && \
    echo 'cd /app/frontend && python3 -m http.server 3000 2>/dev/null || busybox httpd -f -p 3000 -h /app/frontend' >> /app/serve-frontend.sh && \
    chmod +x /app/serve-frontend.sh

# Expose ports
EXPOSE 8080 3000

# Start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '/app/k8s-discovery-engine -port=8080 -cors=true &' >> /app/start.sh && \
    echo '/app/serve-frontend.sh &' >> /app/start.sh && \
    echo 'wait' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]

