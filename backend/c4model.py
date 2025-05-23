"""Custom model to call the c4ai service"""

import os
import re
from typing import Literal

from pydantic import BaseModel, TypeAdapter
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, SystemPromptPart, ToolCallPart
from pydantic_ai.models import Model, ModelRequestParameters, cached_async_http_client
from pydantic_ai.settings import ModelSettings

from backend.game import Column

__all__ = ('C4Model',)


class Move(BaseModel):
    column: Column
    player: Literal['X', 'O']


class C4Move(BaseModel):
    column: Column


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
        request = messages[-1]
        assert isinstance(request, ModelRequest), 'Expected ModelRequest'
        system_prompt = '\n'.join(p.content for p in request.parts if isinstance(p, SystemPromptPart))
        moves_json = re.search('```json(.*?)```', system_prompt, flags=re.DOTALL)
        assert moves_json is not None, 'Expected moves JSON'
        moves = moves_schema.validate_json(moves_json.group(1))
        r = await self.client.post(
            c4ai_url, content=moves_schema.dump_json(moves), headers={'Content-Type': 'application/json'}
        )
        r.raise_for_status()
        move = C4Move.model_validate_json(r.content)
        return ModelResponse(parts=[ToolCallPart(tool_name='move', args=move.model_dump())])

    @property
    def model_name(self) -> str:
        """The model name."""
        return 'c4-minimax'

    @property
    def system(self) -> str:
        """The model name."""
        return 'local'
