from dataclasses import dataclass
from textwrap import dedent
from typing import Literal

from pydantic_ai import Agent, ModelRetry, RunContext, ToolOutput

from backend.game import GameState, Player


@dataclass
class Connect4Deps:
    game_state: GameState


type GameColumn = Literal[0, 1, 2, 3, 4, 5, 6]


@dataclass
class Move:
    """The move you want to make."""

    column: GameColumn


connect4_agent = Agent(
    # 'anthropic:claude-3-7-sonnet-latest',
    # 'openai:gpt-4o',
    deps_type=Connect4Deps,
    retries=7,  # can try all columns lol
    output_type=ToolOutput(type_=Move, name='move'),
)


@connect4_agent.output_validator
def validate_move(ctx: RunContext[Connect4Deps], move: Move) -> Move:
    """Validate the move made by the agent."""
    column = move.column
    try:
        ctx.deps.game_state.board.validate_move(column)
    except Exception as e:
        raise ModelRetry(str(e)) from e
    return move


@connect4_agent.instructions
def build_connect4_instructions(ctx: RunContext[Connect4Deps]) -> str:
    current_player = ctx.deps.game_state.current_player
    player_name = current_player.value
    opponent_name = current_player.opponent.value
    goes_first = Player.first_player().value
    strategy_header = dedent(
        f"""\
        You are an expert Connect 4 strategist playing as **{player_name}** 
        (opponent is **{opponent_name}**; {goes_first} is the first player).

        Apply these principles to choose the optimal move for the next turn:
        • Control the center columns to maximize future connections. 
        • Take any immediate win, or block the opponent's immediate win.
        • Set up double‑threat "forks" (two winning lines at once) whenever possible. 
        • Plan vertical, horizontal, and diagonal wins; track odd/even‑row parity 
          (first player prefers odd‑row wins, second player even‑row wins). 
        • Never play a move that lets the opponent win on their next turn. 

        Analyze the board and use the `final_result` tool to respond with the column number (0‑6) of your best move.
        
        Board state:
        """
    )

    board_state = ctx.deps.game_state.board.render()
    return strategy_header + board_state
