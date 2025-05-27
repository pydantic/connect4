from typing import Annotated

import logfire
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import UUID4, BaseModel, Field

from .agent import generate_next_move
from .db import DB
from .game import AIModel, Column, GameState, model_labels

api_router = APIRouter()


class ModelLabel(BaseModel):
    value: str
    label: str


class ModelsSummary(BaseModel):
    models: list[ModelLabel]
    default_pink: ModelLabel
    default_orange: ModelLabel


@api_router.get('/models')
async def get_models() -> ModelsSummary:
    pink: AIModel = 'anthropic:claude-3-7-sonnet-latest'
    orange: AIModel = 'openai:gpt-4o'
    return ModelsSummary(
        models=[ModelLabel(value=k, label=v) for k, v in model_labels.items()],
        default_pink=ModelLabel(value=pink, label=model_labels[pink]),
        default_orange=ModelLabel(value=orange, label=model_labels[orange]),
    )


class StartGame(BaseModel, validate_by_name=True):
    game_id: UUID4 = Field(serialization_alias='gameID', validation_alias='gameID')


@api_router.get('/games/start')
async def start_game(
    db: Annotated[DB, Depends(DB.get_dep)], orange_ai: AIModel, pink_ai: AIModel | None = None
) -> StartGame:
    game_id = await db.create_game(orange_ai, pink_ai)
    return StartGame(game_id=game_id)


@api_router.get('/games/{game_id:uuid}/state')
async def get_game_state(db: Annotated[DB, Depends(DB.get_dep)], game_id: UUID4) -> GameState:
    if game_state := await db.get_game(game_id):
        return game_state
    else:
        raise HTTPException(status_code=404, detail='game not found')


@api_router.post('/games/{game_id}/move')
async def game_move(db: Annotated[DB, Depends(DB.get_dep)], game_id: UUID4, column: Column | None = None) -> GameState:
    """
    Either:
        Takes a move from a human player, applies it, then makes an AI move
        or, in ai-vs-ai mode, generates a move for the AI player only

    Always returns the updated game state.
    """
    logfire.info(f'Handling move for {game_id=} {column=}')
    game_state = await db.get_game(game_id)
    if not game_state:
        raise HTTPException(status_code=404, detail='game not found')
    elif game_state.pink_ai and column is not None:
        raise HTTPException(status_code=400, detail='column may not be provided for ai-vs-ai')
    elif game_state.pink_ai is None and column is None:
        raise HTTPException(status_code=400, detail='column must be provided for human-vs-ai')

    if column == 7 and len(game_state.moves) == 2:
        raise ValueError("You can't use column 7 on the second move!")

    if column is not None:
        await db.handle_move(game_id, game_state, column)

    logfire.info('Game status: {game_state.status}', game_id=game_id, game_state=game_state)
    if game_state.status == 'playing':
        ai_column = await generate_next_move(game_state)
        # change there's been no more moves before applying this move
        new_move_count = await db.get_move_count(game_id)
        if new_move_count == len(game_state.moves):
            await db.handle_move(game_id, game_state, ai_column)
    return game_state


@api_router.get('/{path:path}')
@api_router.head('/{path:path}', include_in_schema=False)
async def fallback_404(path: str) -> PlainTextResponse:
    return PlainTextResponse(f'page "/{path}" not found', status_code=404)
