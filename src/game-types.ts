// Game modes
export enum GameMode {
  HUMAN_VS_AI = 'HUMAN_VS_AI',
  AI_VS_AI = 'AI_VS_AI',
}

// AI model options
export enum AIModel {
  GPT_4 = 'OpenAI GPT 4o',
  GPT_3_5 = 'OpenAI o1',
  CLAUDE = 'Anthropic 3.7 Claude',
  GEMINI = 'Gemini 2.5 PRO',
}

// Player types
export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI',
}

// Player colors
export enum PlayerColor {
  RED = 1,
  BLUE = 2,
}

// Player configuration
export interface PlayerConfig {
  type: PlayerType;
  color: PlayerColor;
  model?: AIModel; // Only needed for AI players
}

// Game configuration
export interface GameConfig {
  mode: GameMode;
  redPlayer: PlayerConfig;
  bluePlayer: PlayerConfig;
}

// Board and game state types
export type Cell = PlayerColor | null;
export type Board = Cell[][];

export const ROWS = 6;
export const COLS = 7;

// Create an empty game board
export const createEmptyBoard = (): Board => 
  Array(ROWS).fill(null).map(() => Array(COLS).fill(null));