# Two images from one file:
# - "dev" (docker-compose.yml): Vite dev server with hot reload.
# - the last stage (CI and EC2): the built files behind Caddy, which also gets the HTTPS
#   certificate and passes /api/* to the backend (SCRUM-20).
FROM node:24-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dev AS build
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
