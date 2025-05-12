import { Component } from 'solid-js'
import styles from './App.module.css'
import { Board, PlayerColor, ROWS, COLS } from './game-types'

interface GameBoardProps {
  board: Board
  onColumnClick?: (columnIndex: number) => void
  isValidMove?: (columnIndex: number) => boolean
  showControls?: boolean
}

/**
 * GameBoard component that only handles rendering the game board
 */
const GameBoard: Component<GameBoardProps> = (props) => {
  return (
    <div class={styles.board}>
      {/* Render the game board */}
      {Array(ROWS)
        .fill(null)
        .map((_, rowIndex) => (
          <div class={styles.row}>
            {Array(COLS)
              .fill(null)
              .map((_, colIndex) => {
                const cellValue = props.board[rowIndex][colIndex]
                return (
                  <div class={styles.cell}>
                    {cellValue !== null && (
                      <div
                        class={`${styles.token} ${cellValue === PlayerColor.RED ? styles.player1 : styles.player2}`}
                      />
                    )}
                  </div>
                )
              })}
          </div>
        ))}
    </div>
  )
}

/* Show column buttons if controls are enabled */
export const GameBoardControls: Component<{
  onColumnClick: (columnIndex: number) => void
  isValidMove: (columnIndex: number) => boolean
}> = (props) => {
  return (
    <div class={styles.controls}>
      {Array(COLS)
        .fill(null)
        .map((_, colIndex) => (
          <button
            class={styles.columnButton}
            onClick={() => props.onColumnClick(colIndex)}
            disabled={!props.isValidMove(colIndex)}
          >
            ↓
          </button>
        ))}
    </div>
  )
}

/**
 * Check if a column is available for a move
 * @param board The current board state
 * @param columnIndex The column to check
 * @returns True if the column has at least one empty cell
 */
export function isColumnAvailable(board: Board, columnIndex: number): boolean {
  return board[0][columnIndex] === null
}

export default GameBoard