from __future__ import annotations as _annotations

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

logfire.configure()


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    async with DB.connect() as db:
        app.state.db = db
        yield


app = fastapi.FastAPI(lifespan=lifespan)
logfire.instrument_fastapi(app)
logfire.instrument_pydantic_ai()

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
