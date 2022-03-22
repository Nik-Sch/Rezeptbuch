
# Stage 1 - the build process
FROM node:14.19-alpine3.15 as build-deps
WORKDIR /usr/src/app
# Installs latest Chromium (63) package.
RUN apk update && apk upgrade && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk add --no-cache \
  chromium@edge \
  nss@edge \
  git \
  python3 \
  make \
  g++
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# Stage 2 - the production environment
FROM nginx:alpine
COPY --from=build-deps /usr/src/app/build /var/www/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]