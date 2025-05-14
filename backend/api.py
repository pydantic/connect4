from typing import Literal
from uuid import uuid4

import logfire
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import UUID4, BaseModel, Field

from backend.agent import generate_next_move
from backend.game import Column, GameState

api_router = APIRouter()


class StartGame(BaseModel):
    game_id: UUID4 = Field(default_factory=uuid4, serialization_alias='gameID')


@api_router.get('/games/start')
def start_game(mode: Literal['ai-vs-ai', 'human-vs-ai']) -> StartGame:
    g = StartGame()
    games[g.game_id] = GameState(pink_ai=None if mode == 'human-vs-ai' else 'gpt-4o', orange_ai='gpt-4o', moves=[])
    return g


# until we have a db
games: dict[UUID4, GameState] = {}


@api_router.get('/games/{game_id:uuid}/state')
def get_game_state(game_id: UUID4) -> GameState:
    try:
        return games[game_id]
    except KeyError as e:
        raise HTTPException(status_code=404, detail='game not found') from e


@api_router.post('/games/{game_id}/move')
async def game_move(game_id: UUID4, column: Column | None = None) -> GameState:
    """
    Either:
        Takes a move from a human player, applies it, then makes an AI move
        or, in ai-vs-ai mode, generates a move for the AI player only

    Always returns the updated game state.
    """
    logfire.info(f'Handling human move for {game_id=} {column=}')
    try:
        game_state = games[game_id]
    except KeyError as e:
        raise HTTPException(status_code=404, detail='game not found') from e

    if column is not None:
        game_state = game_state.handle_move(column)
    if game_state.status == 'playing':
        opponent_column = await generate_next_move(game_state)
        game_state = game_state.handle_move(opponent_column)
    games[game_id] = game_state
    return game_state


@api_router.get('/{path:path}')
@api_router.head('/{path:path}', include_in_schema=False)
async def fallback_404(path: str) -> PlainTextResponse:
    return PlainTextResponse(f'page "/{path}" not found', status_code=404)
