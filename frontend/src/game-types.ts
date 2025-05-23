export type GameMode = 'human-vs-ai' | 'ai-vs-ai'

// should match AIModel in game.py
export const AI_MODELS: string[] = [
  'openai:gpt-4o',
  'openai:gpt-4o-mini',
  'openai:gpt-4.1',
  'openai:gpt-4.1-mini',
  'anthropic:claude-3-7-sonnet-latest',
  'anthropic:claude-3-5-haiku-latest',
  'google-vertex:gemini-2.5-pro-preview-03-25',
  'google-vertex:gemini-2.0-flash',
  'groq:llama-3.3-70b-versatile',
  'groq:deepseek-r1-distill-llama-70b',
]

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
