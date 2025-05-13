import asyncio

from backend.agent import Connect4Deps, connect4_agent
from backend.game import GameState, GameStatus, Player


async def main():
    x_model = 'openai:gpt-4o'
    o_model = 'openai:o4-mini'
    game_state = GameState()
    while game_state.status == GameStatus.in_progress:
        model = x_model if game_state.current_player == Player.x else o_model
        print(game_state.render())
        print(f'(X={x_model} | O={o_model})')
        print('---')
        result = await connect4_agent.run(
            'Please generate the move', deps=Connect4Deps(game_state=game_state), model=model
        )
        move = result.output
        try:
            game_state.handle_move(move.column)
        except ValueError as e:
            print(f'Invalid move: {e}')
            continue
    print(game_state.render())


if __name__ == '__main__':
    asyncio.run(main())
