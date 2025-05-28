import os
import random
import re
from asyncio import sleep

import httpx

from backend.api import StartGame
from backend.game import AIModel, GameState


async def main():
    await sleep(2)
    app_base_url = os.environ['APP_BASE_URL']
    async with httpx.AsyncClient() as client:
        while True:
            delay = 15 + random.random() * 45
            print(f'Waiting {delay:.0f}s...', flush=True)
            await sleep(delay)
            task = random.choice(['status'] * 2 + ['load_page'] * 3 + ['play'])
            if task == 'status':
                await status(client, app_base_url)
            elif task == 'load_page':
                await load_page(client, app_base_url)
            else:
                assert task == 'play', f'Unknown task: {task}'
                await play(client, app_base_url)


async def status(client: httpx.AsyncClient, app_base_url: str):
    print(f'checking status HEAD {app_base_url}...', flush=True)
    r = await client.head(app_base_url)
    r.raise_for_status()
    print(f'HEAD {app_base_url} -> {status}', flush=True)


async def load_page(client: httpx.AsyncClient, app_base_url: str):
    print(f'loading page GET {app_base_url}...', flush=True)
    r = await client.get(app_base_url)
    r.raise_for_status()
    print(f'GET {app_base_url} -> {r.status_code}', flush=True)
    for match in re.finditer(r'href="([^"]+)"', r.text):
        url = match.group(1)
        if url.startswith('/'):
            url = f'{app_base_url}{url}'
        print(f'Getting: {url}...')
        r = await client.get(url)
        print(f'GET {match.group(1)} -> {r.status_code}', flush=True)


async def play(client: httpx.AsyncClient, app_base_url: str):
    url = f'{app_base_url}/api/games/start'
    print(f'starting game POST {url}...', flush=True)
    params: dict[str, AIModel] = {'orange_ai': 'local:c4', 'pink_ai': 'local:c4'}
    r = await client.get(url, params=params)
    r.raise_for_status()
    game = StartGame.model_validate_json(r.content)
    while True:
        await sleep(1 + random.random() * 4)
        r = await client.post(f'{app_base_url}/api/games/{game.game_id}/move')
        r.raise_for_status()
        state = GameState.model_validate_json(r.content)
        print(f'Game {game.game_id} {len(state.moves)} moves, {state.status}', flush=True)
        if state.status != 'playing':
            break


if __name__ == '__main__':
    import asyncio

    asyncio.run(main())
