from dataclasses import dataclass

import logfire
from pydantic_ai import Agent, ModelRetry, RunContext, ToolOutput
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.providers.google_vertex import GoogleVertexProvider

from backend.c4model import C4Model
from backend.game import FIRST_PLAYER, Column, GameState, get_player_icon


@dataclass
class Connect4Deps:
    game_state: GameState


@dataclass(kw_only=True)
class AIMove:
    reasoning: str = 'unset'
    """Explain the reasoning behind the move."""
    column: Column


connect4_agent = Agent[Connect4Deps, AIMove](
    deps_type=Connect4Deps,
    retries=7,  # can try all columns lol
    output_type=ToolOutput(type_=AIMove, name='move'),
)


@connect4_agent.output_validator
def validate_move(ctx: RunContext[Connect4Deps], move: AIMove) -> AIMove:
    """Validate the move made by the agent."""
    try:
        ctx.deps.game_state.validate_move(move.column)
    except Exception as e:
        raise ModelRetry(str(e)) from e
    return move


@connect4_agent.system_prompt
def build_connect4_instructions(ctx: RunContext[Connect4Deps]) -> str:
    player = ctx.deps.game_state.get_next_player()

    player_icon = get_player_icon(player)
    opponent_icon = get_player_icon('pink' if player == 'orange' else 'orange')
    first_player_icon = get_player_icon(FIRST_PLAYER)
    moves = '\n'.join(f'{get_player_icon(m.player)},{m.column}' for m in ctx.deps.game_state.moves)

    return f"""\
You are an expert Connect Four strategist playing as **{player_icon}**
(opponent is **{opponent_icon}**; {first_player_icon} is the first player).

Apply these principles to choose the optimal move for the next turn:

- Control the center columns to maximize future connections.
- Take any immediate win, or block the opponent's immediate win.
- Set up double‑threat "forks" (two winning lines at once) whenever possible.
- Plan vertical, horizontal, and diagonal wins; track odd/even‑row parity
    (first player prefers odd‑row wins, second player even‑row wins).
- Never play a move that lets the opponent win on their next turn.

Analyze the board and use the `move` tool to respond with the column number (1‑7) of your best move.
If you are a thinking model, don't think for too long — we want to play fast!

moves (as player,column pairs):

```
{moves}
```
"""


async def generate_next_move(game_state: GameState) -> Column:
    player = game_state.get_next_player()
    if player == 'orange':
        model = game_state.orange_ai
    else:
        assert game_state.pink_ai is not None, 'Pink AI is not set'
        model = game_state.pink_ai

    if model.startswith('google-vertex:'):
        model = GeminiModel(
            model[len('google-vertex:') :],
            provider=GoogleVertexProvider(service_account_file='/etc/secrets/pai-service-account.json'),
        )
    elif model == 'local:c4':
        model = C4Model()

    logfire.info('playing', board=game_state.render_board())
    result = await connect4_agent.run(
        'Please generate the next move', deps=Connect4Deps(game_state=game_state), model=model
    )
    return result.output.column
