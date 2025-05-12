import asyncio
from dataclasses import dataclass
from typing import Literal

from pydantic_ai import Agent


@dataclass
class Turn:
    col: Literal['a', 'b', 'c', 'd', 'e', 'f', 'g']
    row: Literal[1, 2, 3, 4, 5, 6]


@dataclass
class PlayerTurn(Turn):
    player: Literal['blue', 'red']

    def __str__(self) -> str:
        return f'{self.player} {self.col.upper()}{self.row}'


def ascii_grid(turns: list[PlayerTurn]) -> str:
    # Initialize empty grid, by x (col), y (row)
    grid: list[list[Literal[' ', 'B', 'R']]] = [[' ' for _ in range(7)] for _ in range(6)]

    for turn in turns:
        grid[6 - turn.row][ord(turn.col) - ord('a')] = 'B' if turn.player == 'blue' else 'R'

    # Convert grid to string
    grid_str = '\n'.join(f'{6 - index} {" ".join(row)}' for index, row in enumerate(grid))
    grid_str += '\n  A B C D E F G'

    return grid_str


player_agent = Agent(
    'anthropic:claude-3-7-sonnet-latest',
    system_prompt="""
    Your job is to play the game "Connect Four", by saying which move you want to play next in response
    to the current state of the game.

    Each disc must be placed in a column, and can only be placed in the lowest available row in that column.

    A player wins when they achieve 4 coins in a row, column, or diagonal. You should try to win by achieving
    4 coins in a row, but also try to block your opponent from winning.

    You play as the Blue team.

    The grid is six slots high and seven slots wide.

    The holes in the grid are referenced by letter for the column (A-G, left to right)
    and number for the row (1-6, bottom to top).

    So the bottom left hole is A1, the bottom right hole is G1, the top left hole is A6, and the top right hole is G6.

    Reply with just the letter and number for the hole you want to play in, nothing else.
    """,
    output_type=Turn,
)

extract_agent = Agent('anthropic:claude-3-5-haiku-latest', output_type=Turn)


async def play():
    turns: list[PlayerTurn] = []
    print(f'Empty board:\n{ascii_grid(turns)}')
    while True:
        r = await extract_agent.run(input('Red: What move do you want to play next? '))
        turn = PlayerTurn(col=r.output.col, row=r.output.row, player='red')
        turns.append(turn)
        print(f'turn {turn}, state:\n{ascii_grid(turns)}')
        r = await player_agent.run(f"""turns: {' '.join(map(str, turns))}""")
        turn = PlayerTurn(col=r.output.col, row=r.output.row, player='blue')
        turns.append(turn)
        print(f'turn {turn}, state:\n{ascii_grid(turns)}')


if __name__ == '__main__':
    asyncio.run(play())
