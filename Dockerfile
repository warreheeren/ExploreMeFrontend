# ExploreMe frontend — statische build achter nginx, met reverse proxy naar de API.
# Bouwen:  docker build -t exploreme-web .
# Draaien: docker run -p 8080:80 -e API_UPSTREAM=http://exploreme-api:8080 exploreme-web
#
# Standaard praat de app met dezelfde origin (/api, /uploads, /hubs worden door nginx doorgestuurd).
# Wil je rechtstreeks naar een andere API-host, bouw dan met --build-arg VITE_API_URL=https://api.example.com

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
# Optionele statistieken (alleen na toestemming van de bezoeker): plausible | umami, plus domein of website-id.
# De CSP-<meta> neemt de origin van het script automatisch op; nginx hoeft daarvoor niets te weten.
ARG VITE_ANALYTICS_PROVIDER=
ARG VITE_ANALYTICS_SRC=
ARG VITE_ANALYTICS_DOMAIN=
ARG VITE_ANALYTICS_WEBSITE_ID=
ENV VITE_ANALYTICS_PROVIDER=${VITE_ANALYTICS_PROVIDER} \
    VITE_ANALYTICS_SRC=${VITE_ANALYTICS_SRC} \
    VITE_ANALYTICS_DOMAIN=${VITE_ANALYTICS_DOMAIN} \
    VITE_ANALYTICS_WEBSITE_ID=${VITE_ANALYTICS_WEBSITE_ID}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ENV API_UPSTREAM=http://api:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
