import { BoardBase, BoardPiece, PlayerAi } from '@kenrick95/c4'

import express from 'express'
import * as logfire from 'logfire'

import { z } from 'zod'

const playerSchema = z.enum(['X', 'O'])
type Player = z.infer<typeof playerSchema>
const move = z.object({
  player: playerSchema,
  column: z.number().min(1).max(7),
})

const movesSchema = z.array(move)
type Moves = z.infer<typeof movesSchema>

interface Response {
  column: number
}

async function play(moves: Moves, nextPlayerColor: Player): Promise<number> {
  const player1 = new PlayerAi(BoardPiece.PLAYER_1, 'X')
  const player2 = new PlayerAi(BoardPiece.PLAYER_2, 'O')
  const board = new BoardBase()
  for (const move of moves) {
    const player = move.player === 'X' ? player1 : player2
    board.applyPlayerAction(player, move.column)
  }
  const nextPlayer = nextPlayerColor === 'X' ? player1 : player2
  return await nextPlayer.getAction(board)
}

const app = express()

// Middleware for parsing JSON
app.use(express.json())

// Health check endpoint
app.head('/', (_req, res) => {
  res.status(200).end()
})

// Main endpoint
app.post('/', async (req, res) => {
  try {
    const { success, error, data } = logfire.span(
      'parsing request',
      {},
      {},
      (span) => {
        const result = movesSchema.safeParse(req.body)
        span.end()
        return result
      }
    )

    if (!success) {
      logfire.warning('Invalid request data', { error })
      res.status(422).type('text/plain').send(`Invalid request data: ${error}`)
      return
    }

    const moves = data ?? []

    let next_player: Player
    if (moves.length === 0) {
      next_player = 'X'
    } else {
      next_player = moves[moves.length - 1].player === 'X' ? 'O' : 'X'
    }

    const column = await logfire.span(
      'calculating next move for {next_player}',
      { next_player, moves },
      {},
      async (playSpan) => {
        const result = await play(moves, next_player)
        playSpan.setAttribute('column', result)
        playSpan.end()
        return result
      }
    )

    const responseData: Response = { column }
    res.json(responseData)
  } catch (error) {
    logfire.warning('Invalid request JSON', { error })
    res.status(400).type('text/plain').send('Invalid request JSON')
  }
})

// Handle 404 for other routes
app.all('{*splat}', (_req, res) => {
  res.status(404).end()
})

const SERVER_PORT = Number.parseInt(process.env.PORT || '9000')

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}`)
})
