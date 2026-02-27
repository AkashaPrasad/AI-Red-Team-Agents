# ==============================================================================
# Frontend Dockerfile — Multi-stage build
# Stages: deps → development | build → production
# ==============================================================================

# --------------------------------------------------------------------------
# Stage 1: Dependencies
# --------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# --------------------------------------------------------------------------
# Stage 2: Development — Vite dev server with HMR
# --------------------------------------------------------------------------
FROM deps AS development

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --------------------------------------------------------------------------
# Stage 3: Build — compile TypeScript, bundle with Vite
# --------------------------------------------------------------------------
FROM deps AS build

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build

# --------------------------------------------------------------------------
# Stage 4: Production — serve static files with nginx
# --------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# SPA config: all routes → index.html
COPY --from=build /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
    try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
    expires 30d; \
    add_header Cache-Control "public, immutable"; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
