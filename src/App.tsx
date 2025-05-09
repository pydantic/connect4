import { Component, createSignal, For, createMemo } from 'solid-js';
import styles from './App.module.css';

type Player = 1 | 2;
type Cell = Player | null;
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;

const App: Component = () => {
  // Create a 2D array for the board: 6 rows x 7 columns, filled with null
  const createEmptyBoard = (): Board => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  
  const [board, setBoard] = createSignal<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = createSignal<Player>(1);
  
  // Create arrays for rows and columns once
  const rows = Array(ROWS).fill(null);
  const cols = Array(COLS).fill(null);
  
  const placeToken = (columnIndex: number) => {
    // Create a deep copy of the current board
    const newBoard = board().map(row => [...row]);
    
    // Find the lowest empty cell in the selected column
    // Start from the bottom row (row 5) and move up
    for (let rowIndex = ROWS - 1; rowIndex >= 0; rowIndex--) {
      if (newBoard[rowIndex][columnIndex] === null) {
        // Place the token and update the board
        newBoard[rowIndex][columnIndex] = currentPlayer();
        setBoard(newBoard);
        
        // Switch to the other player
        setCurrentPlayer(prev => (prev === 1 ? 2 : 1));
        return;
      }
    }
    // If we get here, the column is full
  };
  
  const getCellValue = (rowIndex: number, colIndex: number) => {
    return board()[rowIndex][colIndex];
  };
  
  return (
    <div class={styles.App}>
      <h1>Connect Four</h1>
      
      <div class={styles.board}>
        {/* Render the game board */}
        {rows.map((_, rowIndex) => (
          <div class={styles.row}>
            {cols.map((_, colIndex) => {
              const cellValue = getCellValue(rowIndex, colIndex);
              return (
                <div class={styles.cell}>
                  {cellValue !== null && (
                    <div 
                      class={`${styles.token} ${cellValue === 1 ? styles.player1 : styles.player2}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Column buttons for placing tokens */}
      <div class={styles.controls}>
        {cols.map((_, colIndex) => (
          <button 
            class={styles.columnButton}
            onClick={() => placeToken(colIndex)}
          >
            ↓
          </button>
        ))}
      </div>
      
      <div class={styles.status}>
        <p>Current Player: {currentPlayer() === 1 ? 'Red' : 'Blue'}</p>
      </div>
    </div>
  );
};

export default App;