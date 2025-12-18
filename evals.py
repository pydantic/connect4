import asyncio
from dataclasses import dataclass
from functools import partial

import logfire
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext, LLMJudge

from backend.game import AIModel
from dev import Column, GameState, Move, generate_next_move

logfire.configure(console=False, environment='evals')
logfire.instrument_pydantic_ai()


@dataclass
class ChoiceQuality(Evaluator[list[Move], Column]):
    async def evaluate(self, ctx: EvaluatorContext[list[Move], Column]) -> dict[str, EvaluationReason]:
        match ctx.name:
            case 'first-move':
                return {
                    'score': EvaluationReason(value=1 - abs(4 - ctx.output), reason='middle is best'),
                    'ok': EvaluationReason(value=True, reason='valid'),
                }
            case 'second-move':
                if ctx.output == 4:
                    return {
                        'score': EvaluationReason(value=-2, reason="shouldn't go on top of other user"),
                        'ok': EvaluationReason(value=True, reason='valid'),
                    }
                else:
                    return {
                        'score': EvaluationReason(value=2 - abs(ctx.output - 4), reason='near the middle is best'),
                        'ok': EvaluationReason(value=True, reason='valid'),
                    }
            case 'must-block':
                if ctx.output in (2, 5):
                    return {
                        'score': EvaluationReason(value=5, reason='correctly blocked other player win'),
                        'ok': EvaluationReason(value=True, reason='valid'),
                    }
                else:
                    return {
                        'score': EvaluationReason(value=-10, reason='allow other user to win immediate'),
                        'ok': EvaluationReason(value=False, reason='allow other user to win immediate'),
                    }
            case 'can-win':
                if ctx.output in (2, 5):
                    return {
                        'score': EvaluationReason(value=10, reason='correctly won'),
                        'ok': EvaluationReason(value=True, reason='correctly won the game'),
                    }
                else:
                    return {
                        'score': EvaluationReason(value=-10, reason='missed chance to win immediately'),
                        'ok': EvaluationReason(value=False, reason='missed chance to win immediately'),
                    }
            case _:
                return {
                    'score': EvaluationReason(value=0, reason='unknown state'),
                    'ok': EvaluationReason(value=False, reason='unknown state'),
                }


rubric = """\
Your job is to judge the move of a Connect 4 player playing as "orange", the opponent is "pink".

"orange"'s move is the "output" value.

The board is made up of 7 columns numbered 1 to 7, so 4 is the middle column. "pink" plays first.

You should judge their move and the rationale for their choice to assess how good their move is -
how much it helps them to win and stops the other player from winning.

You should judge the user very harshly if they make a move that allows the other player to win immediately,
or misses the opportunity to win themselves.

If you receive no input about existing moves, it's because you're evaluating the user's first move of the game.
"""


dataset: Dataset[list[Move], Column] = Dataset(
    cases=[
        Case(name='first-move', inputs=[]),
        Case(name='second-move', inputs=[Move(player='pink', column=4)]),
        Case(
            name='must-block',
            inputs=[Move(player='pink', column=4), Move(player='orange', column=4), Move(player='pink', column=3)],
        ),
        Case(
            name='can-win',
            inputs=[
                Move(player='pink', column=1),
                Move(player='orange', column=4),
                Move(player='pink', column=1),
                Move(player='orange', column=3),
                Move(player='pink', column=1),
            ],
        ),
    ],
    evaluators=[
        ChoiceQuality(),
        LLMJudge(rubric=rubric, include_input=True, model='gateway/anthropic:claude-opus-4-5'),
    ],
)


async def generate_next_move_evals(moves: list[Move], model: AIModel) -> Column:
    game_state = GameState(
        pink_ai='gateway/openai:gpt-4.1',
        orange_ai=model,
        moves=moves,
    )
    return await generate_next_move(game_state)


async def run_evals():
    models: list[AIModel] = ['gateway/openai:gpt-5', 'gateway/anthropic:claude-opus-4-5']
    for model in models:
        report = await dataset.evaluate(partial(generate_next_move_evals, model=model), name=f'Connect 4 {model}')
        report.print(include_input=False, include_output=False)


if __name__ == '__main__':
    asyncio.run(run_evals())
