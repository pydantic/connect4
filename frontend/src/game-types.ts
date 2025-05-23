export type GameMode = 'human-vs-ai' | 'ai-vs-ai'

// Player types
export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI',
}

// Player colors
export enum PlayerColor {
  PINK = 1,
  ORANGE = 2,
}

// Board and game state types
export type Cell = PlayerColor | null
export type Board = Cell[][]

export const ROWS = 6
export const COLS = 7

// Create an empty game board
export const createEmptyBoard = (): Board =>
  Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null))
