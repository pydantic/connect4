import asyncio

from backend.agent import Connect4Deps, connect4_agent
from backend.game import GameState


async def main():
    pink_ai = 'openai:gpt-4o'
    orange_ai = 'openai:gpt-4o'
    game_state = GameState(pink_ai=pink_ai, orange_ai=orange_ai)
    while game_state.status == 'playing':
        model = pink_ai if game_state.get_next_player() == 'X' else orange_ai
        print(game_state.render())
        print(f'(X={pink_ai} | O={orange_ai})')
        print('---')
        result = await connect4_agent.run(
            'Please generate the move', deps=Connect4Deps(game_state=game_state), model=model
        )
        column = result.output
        try:
            game_state = game_state.handle_move(column)
        except ValueError as e:
            print(f'Invalid move: {e}')
            continue
    print(game_state.render())


if __name__ == '__main__':
    asyncio.run(main())
