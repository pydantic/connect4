import asyncio

import logfire

from backend.agent import generate_next_move
from backend.game import GameState

logfire.configure()
logfire.instrument_pydantic_ai()


async def main():
    pink_ai = 'gateway/openai:gpt-4.1'
    orange_ai = 'gateway/openai:gpt-4.1'
    game_state = GameState(pink_ai=pink_ai, orange_ai=orange_ai)
    while game_state.status == 'playing':
        print(game_state.render())
        print(f'(X={pink_ai} | O={orange_ai})')
        print('---')
        column = await generate_next_move(game_state)
        try:
            game_state.handle_move(column)
        except ValueError as e:
            print(f'Invalid move: {e}')
            continue
    print(game_state.render())


if __name__ == '__main__':
    asyncio.run(main())
