FROM node:16 AS build-env
WORKDIR /app

COPY package.json .
COPY yarn.lock ./
COPY tsconfig.json ./
RUN yarn install

COPY . .
RUN yarn build

FROM node:16 AS runtime-env
WORKDIR /app

COPY --from=build-env /app/dist/ .
COPY --from=build-env /app/node_modules ./node_modules

LABEL org.opencontainers.image.source https://github.com/bddvlpr/bad-vrc-osc
EXPOSE 8888
CMD ["node", "index.js"]