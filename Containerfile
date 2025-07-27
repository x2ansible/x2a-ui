FROM registry.access.redhat.com/ubi9/nodejs-20

# Add metadata labels
LABEL maintainer="your-email@example.com"
LABEL version="1.0.0"
LABEL description="X2Ansible UI - Infrastructure as Code conversion tool"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.title="X2Ansible UI"
LABEL org.opencontainers.image.description="Web UI for converting various IaC formats to Ansible"

WORKDIR /app

USER 0
RUN chown -R 1001:0 /app && chmod -R g+rw /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit

# Copy all app code
COPY . .

# Flexible environment variables - can be ANY URL format
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ARG NEXT_PUBLIC_LLAMASTACK_URL=http://localhost:8321
ARG BACKEND_URL=http://localhost:8000
ARG LLAMASTACK_API_URL=http://localhost:8321
ARG NEXT_PUBLIC_CONTEXT_QUERY_API

# Set environment variables
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_LLAMASTACK_URL=${NEXT_PUBLIC_LLAMASTACK_URL}
ENV BACKEND_URL=${BACKEND_URL}
ENV LLAMASTACK_API_URL=${LLAMASTACK_API_URL}
ENV NEXT_PUBLIC_CONTEXT_QUERY_API=${NEXT_PUBLIC_CONTEXT_QUERY_API:-${NEXT_PUBLIC_BACKEND_URL}/api/context/query/stream}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN timeout 600 npm run build

USER 1001

EXPOSE 3000
CMD ["npm", "start"]