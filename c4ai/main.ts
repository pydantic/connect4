import { BoardBase, BoardPiece, PlayerAi } from '@kenrick95/c4'
import { z } from 'zod'
import * as logfire from 'logfire'

logfire.configure()

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
    if (move.player === 'X') {
      board.applyPlayerAction(player1, move.column)
    } else if (move.player === 'O') {
      board.applyPlayerAction(player2, move.column)
    }
  }
  const nextPlayer = nextPlayerColor === 'X' ? player1 : player2
  return await nextPlayer.getAction(board)
}

const port = parseInt(Deno.env.get('PORT') || '9000')

Deno.serve({ port }, async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const parseSpan = logfire.startSpan('parsing request')
  // get the request json and validate it
  let json: string
  try {
    json = await req.json()
  } catch (error) {
    logfire.warning('Invalid request JSON', logfireAddSchema({ error }))
    return new Response('Invalid request JSON', { status: 400 })
  }
  const { success, error, data } = movesSchema.safeParse(json)
  if (!success) {
    logfire.warning('Invalid request data', logfireAddSchema({ error }))
    return new Response(`Invalid request data: ${error}`, { status: 422 })
  }
  const moves = data
  parseSpan.end()
  let next_player: Player
  if (moves.length === 0) {
    next_player = 'X'
  } else {
    next_player = moves[moves.length - 1].player === 'X' ? 'O' : 'X'
  }

  const playSpan = logfire.startSpan('calculating next move for {next_player}', { next_player, moves })
  const column = await play(moves, next_player)
  playSpan.setAttribute('column', column)
  playSpan.end()

  const responseData: Response = { column }
  return new Response(JSON.stringify(responseData))
})

function logfireAddSchema(attributes: Record<string, unknown>): Record<string, string | number | boolean> {
  const properties: Record<string, unknown> = {}
  const newAttrs: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      newAttrs[key] = value
    } else {
      newAttrs[key] = JSON.stringify(value)
      properties[key] = { type: typeof value }
    }
  }
  if (Object.keys(properties).length > 0) {
    newAttrs['logfire.json_schema'] = JSON.stringify({ type: 'object', properties })
  }
  return newAttrs
}
