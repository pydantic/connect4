# connect4

Demo of what PydanticAI and Logfire can do!

## Dev

In development, run the frontend with

```bash
npm run dev
```

And the backend with

```bash
make backend-dev
```

## Production

The FastAPI app is setup to serve the frontend, we'll need a docker container to build the frontend
and and copy it into place to for the fastapi app to serve.
