"""Custom model to call the c4ai service"""

import os
import random
import re
from typing import Literal

import logfire
from pydantic import BaseModel, TypeAdapter, model_validator
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, SystemPromptPart, ToolCallPart
from pydantic_ai.models import Model, ModelRequestParameters, cached_async_http_client
from pydantic_ai.settings import ModelSettings

from backend.game import Column

__all__ = ('C4Model',)


class Move(BaseModel):
    column: Column
    player: Literal['X', 'O']

    @model_validator(mode='before')
    @classmethod
    def validate_column(cls, value: str | dict[str, str | int]) -> dict[str, str | int]:
        if isinstance(value, str):
            player, column = value.strip().split(',', 1)
            return {'column': column, 'player': player}
        else:
            return value


class C4Move(BaseModel):
    column: int


moves_schema = TypeAdapter(list[Move])
c4ai_url = os.getenv('C4AI_URL') or 'http://localhost:9000'


class C4Model(Model):
    def __init__(self):
        self.client = cached_async_http_client()

    async def request(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> ModelResponse:
        logfire.info('C4Model message count {count_messages}', count_messages=len(messages), messages=messages)
        request = messages[0]
        assert isinstance(request, ModelRequest), 'Expected ModelRequest'
        system_prompt = '\n'.join(p.content for p in request.parts if isinstance(p, SystemPromptPart))
        logfire.info(f'{system_prompt=}')
        moves_match = re.search('^```(.+)```$', system_prompt, flags=re.DOTALL | re.MULTILINE)
        assert moves_match is not None, 'Expected moves data'
        moves = moves_schema.validate_python(moves_match.group(1).strip().splitlines())
        r = await self.client.post(
            c4ai_url, content=moves_schema.dump_json(moves), headers={'Content-Type': 'application/json'}
        )
        r.raise_for_status()
        move = C4Move.model_validate_json(r.content)
        # we should never reply with the same column twice
        used_columns = self._used_columns(messages)
        while move.column in used_columns:
            logfire.info('column {move.column} already used', used_columns=used_columns, move=move)
            move.column = random.randint(1, 7)
        return ModelResponse(parts=[ToolCallPart(tool_name='move', args=move.model_dump())])

    @staticmethod
    def _used_columns(messages: list[ModelMessage]) -> set[int]:
        columns: set[int] = set()
        for message in messages:
            if isinstance(message, ModelResponse):
                for part in message.parts:
                    if isinstance(part, ToolCallPart) and part.tool_name == 'move':
                        columns.add(part.args['column'])  # type: ignore
        return columns

    @property
    def model_name(self) -> str:
        """The model name."""
        return 'c4-minimax'

    @property
    def system(self) -> str:
        """The model name."""
        return 'local'
