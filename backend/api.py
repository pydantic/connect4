from random import randrange
from typing import Annotated, Literal
from uuid import uuid4

import logfire
from annotated_types import Ge, Le
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import UUID4, BaseModel, Field

api_router = APIRouter()


class StartGame(BaseModel):
    game_id: UUID4 = Field(default_factory=uuid4, serialization_alias='gameID')


@api_router.get('/games/start')
def game_start(mode: Literal['human-vs-ai', 'ai-vs-ai']) -> StartGame:
    print('mode:', mode)
    return StartGame()


type Column = Annotated[int, Ge(1), Le(7)]


class Move(BaseModel):
    player: Literal['red', 'blue']
    column: Column


class GameState(BaseModel):
    moves: list[Move]


@api_router.get('/games/{game_id:uuid}/state')
def game_state(game_id: UUID4) -> GameState:
    print('game_id:', game_id)
    return GameState(moves=[Move(player='red', column=2), Move(player='blue', column=2)])


@api_router.post('/games/{game_id}/move')
async def game_move(game_id: str, column: Column) -> GameState:
    logfire.info(f'Handling move for {game_id=} {column=}')
    moves = [Move(player='red', column=2), Move(player='blue', column=2)]
    moves.append(Move(player='red', column=column))
    moves.append(Move(player='blue', column=randrange(1, 7)))
    return GameState(moves=moves)


@api_router.get('/{path:path}')
@api_router.head('/{path:path}', include_in_schema=False)
async def fallback_404(path: str) -> PlainTextResponse:
    return PlainTextResponse(f'page "/{path}" not found', status_code=404)
