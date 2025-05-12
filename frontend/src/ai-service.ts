import { AIModel, Board, PlayerColor, GameMode } from './game-types'

// Interface for the start game response
interface StartGameResponse {
  gameID: string
}

/**
 * Initialize a new game with the specified game mode
 *
 * @param mode The game mode (HUMAN_VS_AI or AI_VS_AI)
 * @returns A Promise that resolves to the new game ID from the server
 */
export async function initializeGame(mode: GameMode): Promise<string> {
  // Convert the game mode to a format suitable for the API
  const gameModeParam = mode === GameMode.HUMAN_VS_AI ? 'human-vs-ai' : 'ai-vs-ai'

  // Make the API request
  const response = await fetch(`/api/games/start?mode=${gameModeParam}`)

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response
  const data: StartGameResponse = await response.json()
  return data.gameID
}

interface Move {
  player: 'red' | 'blue'
  column: number // 1-7 representing columns
}

// Interface for game state response
export interface GameStateResponse {
  moves: Move[]
}

/**
 * Get the current state of a game
 *
 * @param gameId The unique identifier for the game
 * @returns A Promise that resolves to the game state from the server
 */
export async function getGameState(gameId: string): Promise<GameStateResponse> {
  // Make the API request
  const response = await fetch(`/api/games/${gameId}/state`)

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response
  const data: GameStateResponse = await response.json()
  return data
}

// Interface for the response from the API
interface AIResponse {
  column: number
}

/**
 * Make a move in the game and get updated game state
 *
 * @param gameId The unique identifier for the game
 * @param columnIndex The column index (0-6) where the player wants to place their token
 * @returns A Promise that resolves to the updated game state from the server
 */
export async function makeMove(gameId: string, columnIndex: number): Promise<GameStateResponse> {
  // Convert column index (0-6) to column number (1-7)
  const columnNumber = columnIndex + 1

  // Make the API request
  const response = await fetch(`/api/games/${gameId}/move?column=${columnNumber}`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  // Parse the response (which has the same format as getGameState)
  const data: GameStateResponse = await response.json()
  return data
}
