from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, cast
from uuid import UUID

import asyncpg
import fastapi
import logfire

from .game import Column, GameState

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

    @asynccontextmanager
    async def get_game(self, game_id: UUID) -> AsyncIterator[GameUpdate | None]:
        async with AsyncExitStack() as retrieve_game_span_stack, AsyncExitStack() as db_stack:
            retrieve_game_span = retrieve_game_span_stack.enter_context(
                logfire.span('Retrieving game from db ({game_id=})', game_id=game_id)
            )

            conn = await db_stack.enter_async_context(self._pool.acquire())
            await db_stack.enter_async_context(conn.transaction())

            r = await conn.fetchrow('select pink_ai, orange_ai, status from games where id=$1 for update', game_id)
            if not r:
                yield None
            else:
                pink_ai, orange_ai, status = r
                moves = await conn.fetch(
                    'select player, column_index as column from moves where game_id=$1 order by id', game_id
                )
                # Exit the retrieve_game_span context manager before yielding
                retrieve_game_span_stack.pop_all()
                retrieve_game_span.__exit__(None, None, None)

                yield GameUpdate(
                    cast(DbConn, conn),
                    game_id,
                    GameState(
                        pink_ai=pink_ai,
                        orange_ai=orange_ai,
                        status=status,
                        moves=[dict(m) for m in moves],  # type: ignore
                    ),
                )


@dataclass
class GameUpdate:
    _conn: DbConn
    game_id: UUID
    game_state: GameState

    async def handle_move(self, column: Column):
        with logfire.span(
            'Updating game for move {player=} {column=}',
            player=self.game_state.get_next_player(),
            column=column,
            game_id=self.game_id,
            game_state=self.game_state,
        ):
            self.game_state.validate_move(column)
            new_move = self.game_state.handle_move(column)
            await self._conn.execute('update games set status=$1 where id=$2', self.game_state.status, self.game_id)
            await self._conn.execute(
                'insert into moves (game_id, player, column_index) values ($1, $2, $3)',
                self.game_id,
                new_move.player,
                new_move.column,
            )
