FROM alpine:3.17 as build

ENV APP_ROOT "/big-sister-parser"

RUN apk add --update tzdata \
  nodejs=18.20.1-r0 npm \
  ca-certificates

RUN npm i -g npm@10.9.2
RUN pkg-fetch -n node18 -p alpine

RUN mkdir -p $APP_ROOT
COPY .npmrc package*.json $APP_ROOT

WORKDIR $APP_ROOT

RUN npm i

ADD . .

RUN npm run build

RUN ncc build ./dist/main.js
RUN pkg -c ./package.json ./dist/index.js -t node18-alpine --output exe

RUN ncc build ./dist/cli.js
RUN pkg -c ./package.json ./dist/index.js -t node18-alpine --output cli

RUN find /root/.pkg-cache/v3.5/ -type f | wc -l | awk '$1!=1 {exit 1}'

FROM alpine:3.17.5 as exe

ENV APP_ROOT "/big-sister-parser"

RUN apk add --update --no-cache tzdata ca-certificates

ENV NODE_ENV=production
ENV TZ=Europe/Moscow

RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN mkdir -p $APP_ROOT
WORKDIR $APP_ROOT

COPY --from=build /big-sister-parser/exe $APP_ROOT
COPY --from=build /big-sister-parser/package.json $APP_ROOT
COPY --from=build /big-sister-parser/cli $APP_ROOT

EXPOSE 3000

CMD ["/big-sister-parser/exe"]
