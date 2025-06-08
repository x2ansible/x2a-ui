FROM registry.access.redhat.com/ubi9/nodejs-20

WORKDIR /app

# Fix permissions first
USER 0
RUN chown -R 1001:0 /app && chmod -R g+rw /app

# Copy package files and install dependencies
COPY x2ansible-ui/package*.json ./
RUN npm install --legacy-peer-deps --no-audit

# Copy source code and config
COPY x2ansible-ui/ ./
COPY config.yaml ./config.yaml

# Accept build arguments for both contexts
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ARG BACKEND_URL=http://localhost:8000

# Set environment variables
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV BACKEND_URL=${BACKEND_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Debug: Print environment
RUN echo "🔧 Build-time environment:" && \
    echo "NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL" && \
    echo "BACKEND_URL=$BACKEND_URL"

# Try building with timeout (no verbose flag)
RUN echo " Starting Next.js build..." && \
    timeout 600 npm run build && \
    echo " Build completed successfully!"

# Switch to non-root user
USER 1001

EXPOSE 3000
CMD ["npm", "start"]