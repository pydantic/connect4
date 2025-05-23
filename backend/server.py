from __future__ import annotations as _annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import fastapi
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
)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    async with DB.connect() as db:
        app.state.db = db
        yield


app = fastapi.FastAPI(lifespan=lifespan)
logfire.instrument_fastapi(app, capture_headers=True)
logfire.instrument_pydantic_ai()
logfire.instrument_asyncpg()
logfire.instrument_httpx(capture_all=True)

app.include_router(api_router, prefix='/api')


@app.get('/robots.txt', response_class=PlainTextResponse)
@app.head('/robots.txt', include_in_schema=False)
async def robots_txt() -> str:
    return 'User-agent: *\nDisallow: /\n'


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
