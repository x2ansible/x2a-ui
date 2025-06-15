FROM registry.access.redhat.com/ubi9/nodejs-20

WORKDIR /app

USER 0
RUN chown -R 1001:0 /app && chmod -R g+rw /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit

# Copy all app code (this will include config.yaml, .env.local, etc.)
COPY . .

# (Optional, only if you want to ensure config.yaml is always present)
# COPY config.yaml ./config.yaml

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN timeout 600 npm run build

USER 1001

EXPOSE 3000
CMD ["npm", "start"]
