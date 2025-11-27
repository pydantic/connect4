from __future__ import annotations

from typing import Annotated, Literal

from annotated_types import Ge, Le
from fastapi import HTTPException
from pydantic import BaseModel, Field, computed_field

type GameStatus = Literal['playing', 'pink-win', 'orange-win', 'draw']
type Player = Literal['pink', 'orange']
type AIModel = Literal[
    'gateway/openai:gpt-4.1',
    'gateway/openai:gpt-4.1-mini',
    'gateway/openai:gpt-5',
    'gateway/openai:gpt-5-mini',
    'gateway/anthropic:claude-opus-4-5',
    'gateway/anthropic:claude-4-5-sonnet-latest',
    'gateway/anthropic:claude-4-5-haiku-latest',
    'gateway/google-vertex:gemini-3-pro-preview',
    'gateway/google-vertex:gemini-2.5-flash',
    'gateway/groq:llama-3.3-70b-versatile',
    'gateway/groq:openai/gpt-oss-120b',
    'local:c4',
]

model_labels: dict[AIModel, str] = {
    'gateway/openai:gpt-4.1': 'OpenAI GPT-4.1',
    'gateway/openai:gpt-4.1-mini': 'OpenAI GPT-4.1-mini',
    'gateway/openai:gpt-5': 'OpenAI GPT-5',
    'gateway/openai:gpt-5-mini': 'OpenAI GPT-5-mini',
    'gateway/anthropic:claude-opus-4-5': 'Anthropic Claude Opus 4.5',
    'gateway/anthropic:claude-4-5-sonnet-latest': 'Anthropic Claude 4.5 Sonnet',
    'gateway/anthropic:claude-4-5-haiku-latest': 'Anthropic Claude 4.5 Haiku',
    'gateway/google-vertex:gemini-3-pro-preview': 'Google Gemini 3 pro',
    'gateway/google-vertex:gemini-2.5-flash': 'Google Gemini 2.5 flash',
    'gateway/groq:llama-3.3-70b-versatile': 'Groq Llama 3.3 70b',
    'gateway/groq:openai/gpt-oss-120b': 'Groq GPT OSS 120b',
    'local:c4': 'Local Minimax',
}


def get_player_icon(player: Player) -> str:
    return 'X' if player == 'pink' else 'O'


FIRST_PLAYER: Player = 'pink'
N_ROWS = 6
N_COLUMNS = 7

Column = Annotated[int, Ge(1), Le(N_COLUMNS)]


class Move(BaseModel):
    player: Player
    column: Column


class GameState(BaseModel, validate_by_name=True):
    pink_ai: AIModel | None = Field(serialization_alias='pinkAI', validation_alias='pinkAI')
    orange_ai: AIModel = Field(serialization_alias='orangeAI', validation_alias='orangeAI')
    status: GameStatus = 'playing'
    moves: list[Move] = Field(default_factory=list[Move])

    @computed_field(alias='pinkAIDisplay')
    def pink_ai_display(self) -> str | None:
        if self.pink_ai:
            return model_labels[self.pink_ai]

    @computed_field(alias='orangeAIDisplay')
    def orange_ai_display(self) -> str | None:
        if self.orange_ai:
            return model_labels[self.orange_ai]

    def validate_move(self, column: Column) -> None:
        """
        Validate that the provided move is not trying to place a piece in a full column.
        """
        n_pieces_in_column = len([m for m in self.moves if m.column == column])
        if n_pieces_in_column >= N_ROWS:
            raise HTTPException(status_code=400, detail=f'Column {column} is full')

    def handle_move(self, column: Column) -> Move:
        new_move = Move(player=self.get_next_player(), column=column)
        self.moves.append(new_move)
        self.status = _get_status(self.moves)
        return new_move

    def get_next_player(self) -> Player:
        return _get_next_player(self.moves)

    def render(self) -> str:
        """Render the current game state as a string."""
        board = self.render_board()
        if self.status == 'playing':
            next_player = _get_next_player(self.moves)
            return f'{board}\nNext player: {get_player_icon(next_player)}'
        else:
            if self.status == 'pink-win':
                status_message = 'X wins'
            elif self.status == 'orange-win':
                status_message = 'O wins'
            else:
                status_message = 'draw'
            return f'{board}\nResult: {status_message}'

    def render_board(self) -> str:
        # -------- header line with column indices -------------------------
        header = ' '.join(str(idx) for idx in range(1, N_COLUMNS + 1))
        return header + '\n' + self.board

    @computed_field
    @property
    def board(self) -> str:
        columns: list[list[Player]] = [[] for _ in range(N_COLUMNS)]
        for move in self.moves:
            columns[move.column - 1].append(move.player)

        rows: list[list[str]] = []
        for r in range(N_ROWS):
            cells: list[str] = []
            for c in range(N_COLUMNS):
                column = columns[c]
                player = get_player_icon(column[r]) if r < len(column) else '.'
                cells.append(player)
            rows.append(cells)

        return '\n'.join(' '.join(row) for row in rows[::-1])


def _get_status(moves: list[Move]) -> GameStatus:
    # Only check from the last move position for efficiency
    columns: list[list[Player | None]] = [[] for _ in range(N_COLUMNS)]
    last_row_index: int | None = None
    last_col_index: int | None = None
    last_player: Player | None = None
    for move in moves:
        last_player = move.player
        last_col_index = move.column - 1
        last_col = columns[last_col_index]
        last_row_index = len(last_col)
        last_col.append(move.player)
    if last_row_index is None or last_col_index is None or last_player is None:
        # No moves have happened yet
        return 'playing'

    def _player_at_location(row: int, column: int) -> Player | None:
        if column < 0 or column >= N_COLUMNS:
            return None
        if row < 0 or row >= len(columns[column]):
            return None
        return columns[column][row]

    directions = [
        [(0, 1), (0, -1)],  # Horizontal
        [(1, 0), (-1, 0)],  # Vertical
        [(1, 1), (-1, -1)],  # Diagonal /
        [(1, -1), (-1, 1)],  # Diagonal \
    ]

    for direction_pair in directions:
        count = 1  # Count the piece at the current position

        # Check in both directions
        for dr, dc in direction_pair:
            r, c = last_row_index, last_col_index

            # Count consecutive pieces in this direction
            for _ in range(3):  # Need 3 more to make 4 in a row
                r, c = r + dr, c + dc
                if _player_at_location(r, c) == last_player:
                    count += 1
                else:
                    break

        if count >= 4:
            if last_player == 'pink':
                return 'pink-win'
            else:
                return 'orange-win'
    if len(moves) == N_ROWS * N_COLUMNS:
        return 'draw'

    return 'playing'  # game is not finished yet


def _get_next_player(moves: list[Move]) -> Player:
    if not moves:
        return FIRST_PLAYER
    last_move = moves[-1]
    return 'orange' if last_move.player == 'pink' else 'pink'
