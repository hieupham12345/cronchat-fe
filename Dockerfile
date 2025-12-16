# ===== STAGE 1: BUILD VITE =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build   # tạo thư mục dist

# ===== STAGE 2: NGINX SERVE =====
FROM nginx:alpine

# xoá default site nếu muốn
RUN rm /etc/nginx/conf.d/default.conf

# copy build ra đúng thư mục nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# copy config SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
