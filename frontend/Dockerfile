FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json postcss.config.js tailwind.config.js vite.config.js ./
RUN npm install
COPY index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
