FROM node:24.1.0-alpine

WORKDIR /app

COPY /package.json .
COPY /package-lock.json .
COPY /main.ts .
COPY /instrumentation.ts .

RUN npm install

CMD ["npm", "start"]
