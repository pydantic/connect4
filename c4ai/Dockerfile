FROM denoland/deno:latest

WORKDIR /app

COPY /deno.json .
COPY /deno.lock .
COPY /main.ts .

RUN deno cache --allow-scripts main.ts
COPY /run.sh .

CMD ["./run.sh"]
