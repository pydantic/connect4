import asyncio
from random import randrange
from typing import Annotated, Literal
from uuid import uuid4

import logfire
from annotated_types import Ge, Le
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import UUID4, BaseModel, Field

api_router = APIRouter()


class StartGame(BaseModel):
    game_id: UUID4 = Field(default_factory=uuid4, serialization_alias='gameID')


type Mode = Literal['human-vs-ai', 'ai-vs-ai']


@api_router.get('/games/start')
def game_start(mode: Mode) -> StartGame:
    g = StartGame()
    games[g.game_id] = GameState(moves=[], mode=mode)
    return g


type Column = Annotated[int, Ge(1), Le(7)]


class Move(BaseModel):
    player: Literal['red', 'blue']
    column: Column


class GameState(BaseModel):
    moves: list[Move]
    mode: Mode
    status: Literal['playing', 'red-win', 'blue-win', 'draw'] = 'playing'


# until we have a db
games: dict[UUID4, GameState] = {}


@api_router.get('/games/{game_id:uuid}/state')
def game_state(game_id: UUID4) -> GameState:
    try:
        return games[game_id]
    except KeyError as e:
        raise HTTPException(status_code=404, detail='game not found') from e


@api_router.post('/games/{game_id}/move')
async def game_move(game_id: UUID4, column: Column) -> GameState:
    logfire.info(f'Handling move for {game_id=} {column=}')
    await asyncio.sleep(3)
    try:
        game_state = games[game_id]
    except KeyError as e:
        raise HTTPException(status_code=404, detail='game not found') from e

    if not game_state.moves or game_state.moves[-1].player == 'blue':
        game_state.moves.append(Move(player='red', column=column))
    game_state.moves.append(Move(player='blue', column=randrange(1, 7)))
    return game_state


@api_router.get('/{path:path}')
@api_router.head('/{path:path}', include_in_schema=False)
async def fallback_404(path: str) -> PlainTextResponse:
    return PlainTextResponse(f'page "/{path}" not found', status_code=404)
