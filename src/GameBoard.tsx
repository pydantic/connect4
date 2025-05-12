import { Component, createSignal, createEffect, Show } from 'solid-js';
import styles from './App.module.css';
import { getAIMove } from './ai-service';
import { checkForWinner, checkForDraw, isColumnAvailable } from './game-utils';
import {
  GameMode,
  PlayerType,
  PlayerColor,
  GameConfig,
  Board,
  ROWS,
  COLS,
  createEmptyBoard
} from './game-types';

interface GameBoardProps {
  gameConfig: GameConfig;
}

const GameBoard: Component<GameBoardProps> = (props) => {
  console.log("GameBoard component rendering with path:", window.location.pathname);
  // Extract gameId from path
  const gameIdMatch = window.location.pathname.match(/\/connect4\/game\/([^\/]+)/);
  const gameId = gameIdMatch ? gameIdMatch[1] : "unknown-game";
  console.log("Extracted gameId:", gameId);
  
  // Game state
  const [gameIdState] = createSignal<string>(gameId);
  const [board, setBoard] = createSignal<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.RED);
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false);
  const [winner, setWinner] = createSignal<PlayerColor | null>(null);
  const [isDraw, setIsDraw] = createSignal<boolean>(false);
  
  // Check for game end conditions
  const checkGameEnd = (currentBoard: Board) => {
    // Check for winner
    const winningPlayer = checkForWinner(currentBoard);
    if (winningPlayer) {
      setWinner(winningPlayer);
      return true;
    }
    
    // Check for draw
    if (checkForDraw(currentBoard)) {
      setIsDraw(true);
      return true;
    }
    
    return false;
  };
  
  // Place a token in the selected column
  const placeToken = (columnIndex: number) => {
    if (isAIThinking() || winner() !== null || isDraw()) return false; // Don't allow moves after game end
    
    // Clone the current board
    const newBoard = board().map(row => [...row]);
    
    // Find the lowest empty cell in the selected column
    // Start from the bottom row (row 5) and move up
    for (let rowIndex = ROWS - 1; rowIndex >= 0; rowIndex--) {
      if (newBoard[rowIndex][columnIndex] === null) {
        // Place the token and update the board
        newBoard[rowIndex][columnIndex] = currentPlayer();
        setBoard(newBoard);
        
        // Check if the game has ended
        if (checkGameEnd(newBoard)) {
          return true;
        }
        
        // Switch to the other player
        setCurrentPlayer(prev => prev === PlayerColor.RED ? PlayerColor.BLUE : PlayerColor.RED);
        return true; // Move was successful
      }
    }
    
    return false; // Column is full
  };
  
  // Make a move for the AI player
  const makeAIMove = async () => {
    const config = props.gameConfig;
    if (winner() !== null || isDraw()) return;
    
    setIsAIThinking(true);
    
    try {
      // Get the current player's configuration
      const playerConfig = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer;
      
      // Check if the current player is AI
      if (playerConfig.type === PlayerType.AI && playerConfig.model) {
        // Wait a minimum time to make the AI "think" (better UX)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the AI's move
        const column = await getAIMove(
          gameIdState(),
          playerConfig.model,
          currentPlayer(),
          board()
        );
        
        // Make the move
        placeToken(column);
      }
    } catch (error) {
      console.error('Error in AI move:', error);
    } finally {
      setIsAIThinking(false);
    }
  };
  
  // Effect to handle AI turns
  createEffect(() => {
    // If it's an AI's turn, make a move
    if (!winner() && !isDraw()) {
      const config = props.gameConfig;
      const playerConfig = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer;
      
      if (playerConfig.type === PlayerType.AI) {
        makeAIMove();
      }
    }
  });
  
  // Render the current player status or game result
  const renderGameStatus = () => {
    if (isAIThinking()) {
      return 'AI is thinking...';
    }
    
    if (winner()) {
      const config = props.gameConfig;
      
      const winnerConfig = winner() === PlayerColor.RED ? config.redPlayer : config.bluePlayer;
      const colorName = winner() === PlayerColor.RED ? 'Red' : 'Blue';
      
      if (winnerConfig.type === PlayerType.HUMAN) {
        return `${colorName} (You) wins!`;
      } else {
        return `${colorName} (AI - ${winnerConfig.model}) wins!`;
      }
    }
    
    if (isDraw()) {
      return 'Game ended in a draw!';
    }
    
    const config = props.gameConfig;
    
    const player = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer;
    const colorName = currentPlayer() === PlayerColor.RED ? 'Red' : 'Blue';
    
    if (player.type === PlayerType.HUMAN) {
      return `Current Player: ${colorName} (You)`;
    } else {
      return `Current Player: ${colorName} (AI - ${player.model})`;
    }
  };
  
  // Get the status message CSS class
  const getStatusClass = () => {
    if (winner()) {
      return styles.winnerMessage;
    }
    
    if (isDraw()) {
      return styles.drawMessage;
    }
    
    return '';
  };
  
  // Check if a column is valid for the current player to move
  const isValidMove = (columnIndex: number) => {
    // If game is over or it's an AI's turn, don't allow human moves
    if (winner() !== null || isDraw() || isAIThinking()) return false;
    
    const config = props.gameConfig;
    
    const player = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer;
    if (player.type === PlayerType.AI) return false;
    
    // Check if the column is full
    return isColumnAvailable(board(), columnIndex);
  };
  
  return (
    <div class={styles.gameContainer}>
      <h1>Connect Four</h1>
      
      <div class={styles.board}>
        {/* Render the game board */}
        {Array(ROWS).fill(null).map((_, rowIndex) => (
          <div class={styles.row}>
            {Array(COLS).fill(null).map((_, colIndex) => {
              const cellValue = board()[rowIndex][colIndex];
              return (
                <div class={styles.cell}>
                  {cellValue !== null && (
                    <div 
                      class={`${styles.token} ${cellValue === PlayerColor.RED ? styles.player1 : styles.player2}`}
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
        {Array(COLS).fill(null).map((_, colIndex) => (
          <button 
            class={styles.columnButton}
            onClick={() => placeToken(colIndex)}
            disabled={!isValidMove(colIndex)}
          >
            ↓
          </button>
        ))}
      </div>
      
      <div class={`${styles.status} ${getStatusClass()}`}>
        <p>{renderGameStatus()}</p>
      </div>
      
      <div class={styles.gameControls}>
        <a href="/" onClick={(e) => { e.preventDefault(); window.navigate('/'); }} class={styles.resetButton}>Return to Home</a>
      </div>
    </div>
  );
};

export default GameBoard;