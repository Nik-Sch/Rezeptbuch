
# Stage 1 - the build process
FROM node:16.14-alpine3.15 as build-deps
WORKDIR /usr/src/app
# Installs latest Chromium (63) package.
RUN apk update && apk upgrade && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk add --no-cache \
  chromium@edge=~108.0.5359.125 \
  nss@edge \
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