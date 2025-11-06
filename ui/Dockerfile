
# Stage 1 - the build process
FROM node:24-alpine3.21 AS build-deps
WORKDIR /usr/src/app
# Installs latest Chromium (63) package.
RUN apk update && apk upgrade && \
  apk add --no-cache \
  chromium \
  nss \
  git \
  python3 \
  make \
  g++
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
RUN npm run build

# Stage 2 - the production environment
FROM node:24-alpine3.21
WORKDIR /usr/src/app
COPY server/package.json server/package-lock.json ./
RUN npm ci --production
COPY server ./
RUN npm run build
COPY --from=build-deps /usr/src/app/dist /usr/src/app/static
CMD ["npm", "run", "start"]