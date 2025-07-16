# connect4

Demo of what PydanticAI and Logfire can do!

Live at <https://logfire.run>.

## Development

In development, start the db with:

```bash
docker compose up -d db
```

Then, start the backend services in dev mode with

```bash
export LOGFIRE_TOKEN=<your-token>; export LOGFIRE_BASE_URL=https://logfire-eu.pydantic.dev/ # or https://logfire-us.pydantic.dev/
make backend-dev
```

Finally, run the frontend with

```bash
npm run dev
```
