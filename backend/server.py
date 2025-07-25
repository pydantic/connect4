from __future__ import annotations as _annotations

import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import fastapi
import httpx
import logfire
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .api import api_router
from .db import DB

THIS_DIR = Path(__file__).parent

code_source = None
opt_commit = os.getenv('RENDER_GIT_COMMIT')
if commit := opt_commit:
    code_source = logfire.CodeSource(
        repository='https://github.com/pydantic/connect4',
        revision=commit,
    )

logfire.configure(
    environment='prod' if 'RENDER' in os.environ else 'dev',
    service_name=os.getenv('RENDER_SERVICE_NAME', 'connect4'),
    service_version=opt_commit,
    code_source=code_source,
    distributed_tracing=True,
)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    async with DB.connect() as db:
        logfire_base_url = os.getenv('LOGFIRE_BASE_URL', 'https://logfire-us.pydantic.dev/')
        headers = {'Authorization': os.environ['LOGFIRE_TOKEN']}
        async with httpx.AsyncClient(base_url=logfire_base_url, headers=headers) as httpx_client:
            app.state.db = db
            app.state.httpx_client = httpx_client
            yield


app = fastapi.FastAPI(lifespan=lifespan)
logfire.instrument_fastapi(app, capture_headers=True, excluded_urls=['client-traces'])
logfire.instrument_pydantic_ai()
logfire.instrument_asyncpg()
logfire.instrument_httpx(capture_all=True)

app.include_router(api_router, prefix='/api')


@app.get('/robots.txt', response_class=PlainTextResponse)
@app.head('/robots.txt', include_in_schema=False)
async def robots_txt() -> str:
    return 'User-agent: *\nDisallow: /\n'


@app.get('/timing', response_class=PlainTextResponse)
@app.head('/timing', include_in_schema=False)
async def timing(x_request_start: Annotated[str | None, fastapi.Header()] = None) -> str:
    now = time.time() * 1000
    if x_request_start is None:
        return 'X-Request-Start not set'
    try:
        start = int(x_request_start) / 1000
    except ValueError:
        return 'X-Request-Start not an int'

    delay = now - start
    logfire.info(
        'request timestamp {x_request_start=!r} {delay=:0.2f}ms',
        x_request_start=x_request_start,
        delay=delay,
    )
    return f'request timestamp {x_request_start=!r} {delay=:0.2f}ms'


# do not register the static file serving if we're in dev mode
if '--reload' not in sys.argv:
    ROOT_DIR = Path(__file__).parent.parent
    STATIC_DIR = ROOT_DIR / 'frontend' / 'dist'
    app.mount('/assets', StaticFiles(directory=STATIC_DIR / 'assets'), name='static')
    STATIC_INDEX = (STATIC_DIR / 'index.html').read_bytes()

    @app.get('/{path:path}')
    @app.head('/{path:path}', include_in_schema=False)
    async def catchall() -> HTMLResponse:
        return HTMLResponse(STATIC_INDEX)
