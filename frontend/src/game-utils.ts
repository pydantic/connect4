import { Board, PlayerColor, ROWS, COLS } from './game-types';

/**
 * Check if the current board state has a winner
 * @param board The current board state
 * @returns The winning player or null if no winner
 */
export function checkForWinner(board: Board): PlayerColor | null {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== null &&
        cell === board[row][col + 1] &&
        cell === board[row][col + 2] &&
        cell === board[row][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (
        cell !== null &&
        cell === board[row + 1][col] &&
        cell === board[row + 2][col] &&
        cell === board[row + 3][col]
      ) {
        return cell;
      }
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== null &&
        cell === board[row + 1][col + 1] &&
        cell === board[row + 2][col + 2] &&
        cell === board[row + 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Check diagonal (up-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== null &&
        cell === board[row - 1][col + 1] &&
        cell === board[row - 2][col + 2] &&
        cell === board[row - 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  return null;
}

/**
 * Check if the board is full (draw)
 * @param board The current board state
 * @returns True if the board is full (draw)
 */
export function checkForDraw(board: Board): boolean {
  // If any cell in the top row is empty, the board is not full
  return !board[0].some(cell => cell === null);
}

/**
 * Check if a column is available for a move
 * @param board The current board state
 * @param columnIndex The column to check
 * @returns True if the column has at least one empty cell
 */
export function isColumnAvailable(board: Board, columnIndex: number): boolean {
  return board[0][columnIndex] === null;
}

/**
 * Get all available columns for moves
 * @param board The current board state
 * @returns Array of available column indices
 */
export function getAvailableColumns(board: Board): number[] {
  const availableColumns: number[] = [];
  
  for (let col = 0; col < COLS; col++) {
    if (isColumnAvailable(board, col)) {
      availableColumns.push(col);
    }
  }
  
  return availableColumns;
}