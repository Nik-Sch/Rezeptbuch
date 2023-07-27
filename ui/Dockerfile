
# Stage 1 - the build process
FROM node:16.14-alpine3.15 as build-deps
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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
RUN npm run build

# Stage 2 - the production environment
FROM node:16.14-alpine3.15
WORKDIR /usr/src/app
COPY --from=build-deps /usr/src/app/build /usr/src/app/static
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server ./
RUN npm run build
CMD ["npm", "run", "start"]