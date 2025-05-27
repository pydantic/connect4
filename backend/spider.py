import os
from asyncio import sleep
from random import random

import httpx

from backend.api import StartGame
from backend.game import AIModel, GameState


async def main():
    await sleep(2)
    app_base_url = os.environ['APP_BASE_URL']
    async with httpx.AsyncClient() as client:
        while True:
            delay = 15 + random() * 45
            print(f'Waiting {delay:.0f}s to start game...', flush=True)
            await sleep(delay)
            await play(client, app_base_url)


async def play(client: httpx.AsyncClient, app_base_url: str):
    params: dict[str, AIModel] = {'orange_ai': 'local:c4', 'pink_ai': 'local:c4'}
    url = f'{app_base_url}/api/games/start'
    print(f'starting game POST {url}...', flush=True)
    r = await client.get(url, params=params)
    r.raise_for_status()
    game = StartGame.model_validate_json(r.content)
    while True:
        await sleep(1 + random() * 4)
        r = await client.post(f'{app_base_url}/api/games/{game.game_id}/move')
        r.raise_for_status()
        state = GameState.model_validate_json(r.content)
        print(f'Game {game.game_id} {len(state.moves)} moves, {state.status}', flush=True)
        if state.status != 'playing':
            break


if __name__ == '__main__':
    import asyncio

    asyncio.run(main())
