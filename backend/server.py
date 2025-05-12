from __future__ import annotations as _annotations

from pathlib import Path

import fastapi
import logfire
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .api import api_router

THIS_DIR = Path(__file__).parent

logfire.configure(send_to_logfire='if-token-present')

app = fastapi.FastAPI()
logfire.instrument_fastapi(app)

app.include_router(api_router, prefix='/api')


ROOT_DIR = Path(__file__).parent.parent
STATIC_DIST = ROOT_DIR / 'frontend' / 'dist'
app.mount('/assets', StaticFiles(directory=STATIC_DIST / 'assets'), name='static')
STATIC_INDEX = (STATIC_DIST / 'index.html').read_bytes()


@app.get('/robots.txt', response_class=PlainTextResponse)
@app.head('/robots.txt', include_in_schema=False)
async def robots_txt() -> str:
    return 'User-agent: *\nDisallow: /\n'


@app.get('/{path:path}')
@app.head('/{path:path}', include_in_schema=False)
async def catchall() -> HTMLResponse:
    return HTMLResponse(STATIC_INDEX)
