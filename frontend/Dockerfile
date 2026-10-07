# Development image: Vite dev server with hot reload.
# The production image (static files behind Caddy) comes with SCRUM-20.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
