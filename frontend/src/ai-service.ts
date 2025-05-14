import { Board, PlayerColor, GameMode } from './game-types'

// Interface for the start game response
interface StartGameResponse {
  gameID: string
}

export async function initializeGame(orangeAI: string, pinkAI: string | null): Promise<string> {
  let url = `/api/games/start?orange_ai=${orangeAI}`
  if (pinkAI) {
    url += `&pink_ai=${pinkAI}`
  }
  // Make the API request
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response
  const data: StartGameResponse = await response.json()
  return data.gameID
}

interface Move {
  player: 'pink' | 'orange'
  column: number // 1-7 representing columns
}

// Interface for game state response
export interface GameState {
  moves: Move[]
  pinkAI: string | null
  orangeAI: string
  status: 'playing' | 'pink-win' | 'orange-win' | 'draw'
}

export async function getGameState(gameId: string): Promise<GameState> {
  // Make the API request
  const response = await fetch(`/api/games/${gameId}/state`)

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response
  const data: GameState = await response.json()
  return data
}

// Interface for the response from the API
interface AIResponse {
  column: number
}

export async function makeMove(gameId: string, columnIndex?: number): Promise<GameState> {
  let url = `/api/games/${gameId}/move`
  if (columnIndex !== undefined) {
    // Convert column index (0-6) to column number (1-7)
    url += `?column=${columnIndex + 1}`
  }

  // Make the API request
  const response = await fetch(url, { method: 'POST' })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response (which has the same format as getGameState)
  const data: GameState = await response.json()
  return data
}
