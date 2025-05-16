from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

import asyncpg
import fastapi
import logfire

from .game import Column, GameState, Move

# hack to get around asyncpg's poor typing support
if TYPE_CHECKING:
    DbConn = asyncpg.Connection[asyncpg.Record]
    Pool = asyncpg.Pool[asyncpg.Record]
else:
    DbConn = asyncpg.Connection
    Pool = asyncpg.Pool


@dataclass
class DB:
    _pool: Pool

    @asynccontextmanager
    @staticmethod
    async def connect() -> AsyncIterator[DB]:
        dsn = os.getenv('DATABASE_URL') or 'postgresql://postgres@localhost:5432'
        with logfire.span('db connect', dsn=dsn):
            pool = await asyncpg.create_pool(dsn)
            schema_path = Path(__file__).parent / 'schema.sql'
            async with pool.acquire() as conn:
                await conn.execute(schema_path.read_text())

        try:
            yield DB(pool)
        finally:
            with logfire.span('db close', dsn=dsn):
                await pool.close()

    @staticmethod
    async def get_dep(request: fastapi.Request) -> DB:
        return request.app.state.db

    async def create_game(self, orange_ai: str, pink_ai: str | None = None) -> UUID:
        # TODO use pool
        return await self._pool.fetchval(
            'insert into games (orange_ai, pink_ai) values ($1, $2) returning id;', orange_ai, pink_ai
        )

    @logfire.instrument
    async def get_game(self, game_id: UUID) -> GameState | None:
        row = await self._pool.fetchrow(
            """
            select
                pink_ai,
                orange_ai,
                status,
                coalesce(
                array_agg(json_build_object('player', player, 'column', column_index))
                filter (where moves.id is not null),
                '{}'
                ) as moves
            from games
            left join moves on games.id = moves.game_id
            where games.id=$1
            group by pink_ai, orange_ai, status
            """,
            game_id,
        )
        if not row:
            return None

        pink_ai, orange_ai, status, moves = row
        return GameState(
            pink_ai=pink_ai,
            orange_ai=orange_ai,
            status=status,
            moves=[Move.model_validate_json(m) for m in moves],
        )

    async def get_move_count(self, game_id: UUID) -> int:
        return await self._pool.fetchval('select count(*) from moves where game_id=$1', game_id)

    async def handle_move(self, game_id: UUID, game_state: GameState, column: Column):
        new_move = game_state.handle_move(column)
        async with AsyncExitStack() as stack:
            conn = await stack.enter_async_context(self._pool.acquire())
            await stack.enter_async_context(conn.transaction())
            await conn.execute('update games set status=$1 where id=$2', game_state.status, game_id)
            await conn.execute(
                'insert into moves (game_id, player, column_index) values ($1, $2, $3)',
                game_id,
                new_move.player,
                new_move.column,
            )
