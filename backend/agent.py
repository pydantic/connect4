from dataclasses import dataclass
from textwrap import dedent

from pydantic_ai import Agent, ModelRetry, RunContext, ToolOutput

from backend.game import FIRST_PLAYER, Column, GameState, Player


@dataclass
class Connect4Deps:
    game_state: GameState


connect4_agent = Agent[Connect4Deps, Column](
    deps_type=Connect4Deps,
    retries=7,  # can try all columns lol
    output_type=ToolOutput(type_=Column, name='move'),  # pyright: ignore[reportArgumentType]
)


@connect4_agent.output_validator
def validate_move(ctx: RunContext[Connect4Deps], column: Column) -> Column:
    """Validate the move made by the agent."""
    try:
        ctx.deps.game_state.validate_move(column)
    except Exception as e:
        raise ModelRetry(str(e)) from e
    return column


@connect4_agent.instructions
def build_connect4_instructions(ctx: RunContext[Connect4Deps]) -> str:
    player_name = ctx.deps.game_state.get_next_player()
    opponent_name: Player = 'X' if player_name == 'O' else 'O'
    strategy_header = dedent(
        f"""\
        You are an expert Connect 4 strategist playing as **{player_name}** 
        (opponent is **{opponent_name}**; {FIRST_PLAYER} is the first player).

        Apply these principles to choose the optimal move for the next turn:
        • Control the center columns to maximize future connections. 
        • Take any immediate win, or block the opponent's immediate win.
        • Set up double‑threat "forks" (two winning lines at once) whenever possible. 
        • Plan vertical, horizontal, and diagonal wins; track odd/even‑row parity 
          (first player prefers odd‑row wins, second player even‑row wins). 
        • Never play a move that lets the opponent win on their next turn. 

        Analyze the board and use the `move` tool to respond with the column number (1‑7) of your best move.
        If you are a thinking model, don't think for too long — we want to play fast!
        
        Board state:
        """
    )

    board_state = ctx.deps.game_state.render_board()
    return strategy_header + board_state
