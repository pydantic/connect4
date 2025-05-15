export type GameMode = 'human-vs-ai' | 'ai-vs-ai'

// should match AIModel in game.py
export const AI_MODELS: string[] = [
  'OpenAI gpt-4o',
  'OpenAI gpt-4o-mini',
  'OpenAI gpt-4.1',
  'OpenAI gpt-4.1-mini',
  'Anthropic claude-3-7-sonnet-latest',
  'Anthropic claude-3-5-haiku-latest',
  'Google-vertex gemini-2.5-pro-preview-03-25',
  'Google-vertex gemini-2.0-flash',
  'Groq llama-3.3-70b-versatile',
  'Groq deepseek-r1-distill-llama-70b',
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
