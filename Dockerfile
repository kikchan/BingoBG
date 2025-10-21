## Multi-stage Dockerfile for building and serving the BingoBG Vite app
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src
COPY index.html ./
RUN npm ci --silent
RUN npm run build

FROM nginx:stable-alpine AS runtime
# copy built output to nginx
COPY --from=build /app/build /usr/share/nginx/html
# copy public folder if there are any static files not bundled
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 80
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'" ]
