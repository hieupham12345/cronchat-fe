# ===== STAGE 1: BUILD VITE =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# API calls go to a same-origin /api path; nginx proxies it to the backend.
# WS base is intentionally left unset so the app falls back to the page origin.
ARG VITE_API_BASE_URL=/api
RUN echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" > .env.production
RUN npm run build   # tạo thư mục dist

# ===== STAGE 2: NGINX SERVE =====
FROM nginx:alpine

# copy build ra đúng thư mục nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx renders this template at startup, substituting ${BACKEND_ORIGIN}.
# Override at run time: -e BACKEND_ORIGIN=http://127.0.0.1:5555
ENV BACKEND_ORIGIN=http://56.10.41.218:5555
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
