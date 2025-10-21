# syntax=docker/dockerfile:1

# --- Build stage: compile React app ---
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- Run stage: serve with nginx ---
FROM nginx:1.27-alpine AS runtime

# Copy built static files
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]