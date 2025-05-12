import { AIModel, Board, PlayerColor } from './game-types'

// Interface for the response from the API
interface AIResponse {
  column: number
}

/**
 * Get the next move from the AI for the current board state
 *
 * @param gameId A unique identifier for the current game
 * @param model The AI model to use
 * @param player The player color (RED or BLUE)
 * @param board The current board state
 * @returns A Promise that resolves to the column index where the AI wants to place its token
 */
export async function getAIMove(gameId: string, model: AIModel, player: PlayerColor, board: Board): Promise<number> {
  try {
    // Convert the model name to a format suitable for the API
    const modelSlug = model.replace(/\s+/g, '-').toLowerCase()

    // Convert the player value (1 or 2) to "red" or "blue"
    const playerColor = player === PlayerColor.RED ? 'red' : 'blue'

    // Prepare the API URL
    const url = `/api/play/${gameId}/${playerColor}`

    // Prepare the request body
    const requestBody = {
      model: modelSlug,
      board: board,
    }

    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    // Parse the response
    const data: AIResponse = await response.json()

    return data.column
  } catch (error) {
    console.error('Error getting AI move:', error)

    // In case of error, return a random valid column
    // This is a fallback to prevent the game from breaking
    return Math.floor(Math.random() * 7)
  }
}
