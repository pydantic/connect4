from __future__ import annotations

from enum import StrEnum
from typing import Self

from pydantic import BaseModel, Field, model_validator


class Player(StrEnum):
    red = 'red'
    yellow = 'yellow'

    def short_value(self):
        return 'X' if self == Player.red else 'O'


class GameStatus(StrEnum):
    in_progress = 'in_progress'
    red_won = 'red_won'
    yellow_won = 'yellow_won'
    draw = 'draw'


class Board(BaseModel):
    """Represents the Connect4 game board."""

    n_columns: int = 7
    n_rows: int = 6
    grid: list[list[Player]] = Field(default_factory=lambda: [[] for _ in range(7)])
    """
    The pieces of the board.
    
    This is a list of columns, where the first item in each column represents the bottom row, the second is the row
    above that, etc. 
    """

    @model_validator(mode='after')
    def _check_board_dimensions(self) -> Self:
        if len(self.grid) != self.n_columns:
            raise ValueError(f'Expected {self.n_columns} columns in the grid, got {len(self.grid)}')
        return self

    def handle_move(self, player: Player, column: int) -> tuple[int, GameStatus]:
        """Handle a move by a player.

        This method is called when a player makes a move. It updates the board and checks for a win or draw.
        """
        row = self._perform_move(player, column)
        if self._check_win(player, row, column):
            return (
                row,
                GameStatus.red_won if player == Player.red else GameStatus.yellow_won,
            )
        elif self._is_full():
            return row, GameStatus.draw
        return row, GameStatus.in_progress

    def render_grid(self) -> str:
        """Render the grid as a string."""
        grid_str = ''
        for row in range(self.n_rows - 1, -1, -1):
            grid_str += '|'
            for column in range(self.n_columns):
                piece = self._piece_at_location(row, column)
                grid_str += f' {piece.short_value() if piece else " "} |'
            grid_str += '\n'
        return grid_str

    def _is_full(self) -> bool:
        """Check if the board is full."""
        return all(len(column) >= self.n_rows for column in self.grid)

    def _perform_move(self, player: Player, column: int) -> int:
        """Attempt to drop a piece in the specified column.

        Returns the row index where the piece was placed.
        """
        if not 0 <= column < len(self.grid):
            raise ValueError(f'Invalid column: must be between 0 and {self.n_columns - 1}')
        grid_column = self.grid[column]
        if len(grid_column) >= self.n_rows:
            raise ValueError(f'Column {column} is full')
        grid_column.append(player)
        return len(grid_column) - 1

    def _check_win(self, player: Player, last_move_row: int, last_move_column: int) -> bool:
        """Check if the player has won after placing a piece at the specified position."""
        # Only check from the last move position for efficiency
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
                r, c = last_move_row, last_move_column

                # Count consecutive pieces in this direction
                for _ in range(3):  # Need 3 more to make 4 in a row
                    r, c = r + dr, c + dc
                    if self._piece_at_location(r, c) == player:
                        count += 1
                    else:
                        break

            if count >= 4:
                print(count, direction_pair, last_move_row, last_move_column)
                return True

        return False

    def _piece_at_location(self, row: int, column: int) -> Player | None:
        """Get the piece at the specified row and column."""
        if column < 0 or column >= self.n_columns:
            return None  # Invalid column, but returning None makes the _check_win code cleaner.
        grid_column = self.grid[column]
        if row < 0 or row >= len(grid_column):
            return None
        return grid_column[row]


class GameState(BaseModel):
    """Represents the current state of the Connect4 game."""

    board: Board = Field(default_factory=Board)
    current_player: Player = Field(default=Player.red)
    status: GameStatus = Field(default=GameStatus.in_progress)
    last_move: tuple[int, int] | None = Field(default=None)

    def handle_move(self, column: int) -> GameState:
        """Handle a move by the current player.

        This method updates the game state and checks for a win or draw.
        """
        row, status = self.board.handle_move(self.current_player, column)
        self.current_player = Player.yellow if self.current_player == Player.red else Player.red
        self.last_move = (row, column)
        self.status = status
        return self
