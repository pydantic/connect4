from __future__ import annotations as _annotations

from pathlib import Path

import fastapi
import logfire

from connect4.game import GameState

THIS_DIR = Path(__file__).parent

logfire.configure(send_to_logfire='if-token-present')

app = fastapi.FastAPI()
logfire.instrument_fastapi(app)


@app.post('/connect4/{session_id}')
async def move(session_id: str, game: GameState, column: int) -> GameState:
    logfire.info(f'Handling move for {session_id=}')
    try:
        return game.handle_move(column)
    except ValueError as e:
        raise fastapi.HTTPException(status_code=400, detail=str(e))


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'connect4.server:app',
        reload=True,
        reload_dirs=[str(THIS_DIR)],
    )
