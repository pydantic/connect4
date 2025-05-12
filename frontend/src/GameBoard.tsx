import { Component, createSignal, createEffect, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { GameMode, PlayerType, PlayerColor, GameConfig, Board, ROWS, COLS, createEmptyBoard } from './game-types'

interface GameBoardProps {
  gameConfig: GameConfig
}

const GameBoard: Component<GameBoardProps> = (props) => {
  console.log('GameBoard component rendering with path:', window.location.pathname)
  // Extract gameId from path
  // Use a more flexible pattern that matches both /connect4/game/ID and /game/ID
  const gameIdMatch = window.location.pathname.match(/\/(?:connect4\/)?game\/([^\/]+)/)
  const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown-game'
  console.log('Extracted gameId:', gameId)

  // Game state
  const [gameIdState] = createSignal<string>(gameId)
  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.RED)
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [gameMode, setGameMode] = createSignal<'human-vs-ai' | 'ai-vs-ai'>('human-vs-ai')
  const [gameStatus, setGameStatus] = createSignal<'playing' | 'red-win' | 'blue-win' | 'draw'>('playing')
  const [lastMoveCount, setLastMoveCount] = createSignal<number>(0) // Track the last number of moves

  // Load game state from server
  const loadGameState = async () => {
    setIsLoading(true)
    setErrorMessage(null) // Clear any previous errors
    try {
      console.log('Loading game state for gameId:', gameIdState())
      const gameState = await getGameState(gameIdState())
      console.log('Received game state:', gameState)

      // Save the original mode before applying state
      const isAIvsAI = gameState.mode === 'ai-vs-ai'

      // Apply the state
      applyGameState(gameState)

      // If this is an AI vs AI game and the game is not over, start autoplay
      if (isAIvsAI && gameState.status === 'playing') {
        // Use a small delay to let the UI update first
        setTimeout(() => {
          autoPlayAIvsAI()
        }, 500)
      }
    } catch (error) {
      console.error('Error loading game state:', error)
      setErrorMessage(`Failed to load game state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply game state from server response
  const applyGameState = (gameState: GameState) => {
    const newBoard = createEmptyBoard()
    let lastPlayer = PlayerColor.BLUE // Start with BLUE so first move will be RED

    console.log('Applying game state with moves:', gameState.moves)
    console.log('Game mode:', gameState.mode)
    console.log('Game status:', gameState.status)

    // Update the game mode and status
    setGameMode(gameState.mode)
    setGameStatus(gameState.status)

    // Update our move counter
    setLastMoveCount(gameState.moves.length)

    // Apply moves in order
    for (const move of gameState.moves) {
      // Convert column number (1-7) to index (0-6)
      const columnIndex = move.column - 1
      console.log(`Processing move: player=${move.player}, column=${move.column}, columnIndex=${columnIndex}`)

      // Convert player string to enum
      const playerColor = move.player === 'red' ? PlayerColor.RED : PlayerColor.BLUE

      // Find the lowest empty cell in the selected column
      let placed = false
      for (let rowIndex = ROWS - 1; rowIndex >= 0; rowIndex--) {
        if (newBoard[rowIndex][columnIndex] === null) {
          console.log(`Placing token at row=${rowIndex}, col=${columnIndex} for player=${playerColor}`)
          newBoard[rowIndex][columnIndex] = playerColor
          lastPlayer = playerColor
          placed = true
          break
        }
      }

      if (!placed) {
        console.warn(`Couldn't place token in column ${columnIndex} - column is full!`)
      }
    }

    console.log('Final board state:', JSON.stringify(newBoard))

    // Set the board state
    setBoard(newBoard)

    // Set the current player to the opposite of the last player
    const nextPlayer = lastPlayer === PlayerColor.RED ? PlayerColor.BLUE : PlayerColor.RED
    console.log(`Setting current player to ${nextPlayer === PlayerColor.RED ? 'RED' : 'BLUE'}`)
    setCurrentPlayer(nextPlayer)
  }

  // Helper method to check if the game is over
  const isGameOver = () => {
    return gameStatus() !== 'playing'
  }

  // Place a token in the selected column
  const placeToken = async (columnIndex: number) => {
    if (isAIThinking() || isGameOver()) return false // Don't allow moves after game end

    // Check if the column is full
    if (!isColumnAvailable(board(), columnIndex)) {
      setErrorMessage('This column is full. Please choose another one.')
      return false
    }

    // Immediately update the board with the user's move
    const newBoard = board().map((row) => [...row]) // Clone the board

    // Find the lowest empty cell in the selected column
    let placed = false
    for (let rowIndex = ROWS - 1; rowIndex >= 0; rowIndex--) {
      if (newBoard[rowIndex][columnIndex] === null) {
        // Place the token
        newBoard[rowIndex][columnIndex] = currentPlayer()
        placed = true
        // Update the board state immediately
        setBoard(newBoard)
        break
      }
    }

    if (!placed) {
      console.error("Couldn't place token - column is full")
      return false
    }

    setIsAIThinking(true) // Show loading state while making the API move
    setErrorMessage(null) // Clear any previous errors

    try {
      console.log(`Making move in column ${columnIndex} for game ${gameIdState()}`)
      // Call the API to make the move and get updated game state (including AI's response move)
      const gameState = await makeMove(gameIdState(), columnIndex)
      console.log('Received updated game state after move:', gameState)

      // Apply the server-returned game state (overwrites our local changes)
      applyGameState(gameState)

      return true // Move was successful
    } catch (error) {
      console.error('Error making move:', error)
      setErrorMessage(`Failed to make move: ${error instanceof Error ? error.message : 'Unknown error'}`)

      // If the API call failed, we need to revert our local change
      loadGameState()
      return false
    } finally {
      setIsAIThinking(false)
    }
  }

  // Function to handle AI vs AI autoplay
  const autoPlayAIvsAI = async () => {
    // If the game is over or already processing, don't do anything
    if (isGameOver() || isAIThinking()) {
      return
    }

    setIsAIThinking(true)
    setErrorMessage(null)

    try {
      // First, check if we need to make a new move or just refresh state
      const currentState = await getGameState(gameIdState())

      if (currentState.moves.length > lastMoveCount() && lastMoveCount() > 0) {
        // We already have a new move from the server but haven't displayed it yet
        // Just apply the state to display it
        console.log("Displaying existing move from server")
        applyGameState(currentState)
      } else if (currentState.status === 'playing') {
        // Make a new move
        console.log("Making new AI move")
        const newState = await makeMove(gameIdState(), 0)
        applyGameState(newState)
      }

      // If the game is still going, schedule the next move
      if (gameStatus() === 'playing') {
        setTimeout(() => {
          autoPlayAIvsAI()
        }, 1000)
      }
    } catch (error) {
      console.error('Error in AI vs AI autoplay:', error)
      setErrorMessage(`Error in AI autoplay: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsAIThinking(false)
    }
  }

  // Load game state on mount
  onMount(() => {
    loadGameState()
  })

  // Render the current player status or game result
  const renderGameStatus = () => {
    if (isLoading()) {
      return 'Loading game state...'
    }

    if (isAIThinking()) {
      return 'AI is thinking...'
    }

    // Check the game status from the server
    const status = gameStatus()

    if (status === 'red-win') {
      const config = props.gameConfig
      const winnerConfig = config.redPlayer

      if (winnerConfig.type === PlayerType.HUMAN) {
        return 'Red (You) wins!'
      } else {
        return `Red (AI - ${winnerConfig.model}) wins!`
      }
    }

    if (status === 'blue-win') {
      const config = props.gameConfig
      const winnerConfig = config.bluePlayer

      if (winnerConfig.type === PlayerType.HUMAN) {
        return 'Blue (You) wins!'
      } else {
        return `Blue (AI - ${winnerConfig.model}) wins!`
      }
    }

    if (status === 'draw') {
      return 'Game ended in a draw!'
    }

    // Game is still in progress
    const config = props.gameConfig
    const player = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer
    const colorName = currentPlayer() === PlayerColor.RED ? 'Red' : 'Blue'

    if (player.type === PlayerType.HUMAN) {
      return `Current Player: ${colorName} (You)`
    } else {
      return `Current Player: ${colorName} (AI - ${player.model})`
    }
  }

  // Get the status message CSS class
  const getStatusClass = () => {
    const status = gameStatus()

    if (status === 'red-win' || status === 'blue-win') {
      return styles.winnerMessage
    }

    if (status === 'draw') {
      return styles.drawMessage
    }

    return ''
  }

  // Check if a column is valid for the current player to move
  const isValidMove = (columnIndex: number) => {
    // If game is loading, over, or it's an AI's turn, don't allow human moves
    if (isLoading() || isGameOver() || isAIThinking()) return false

    const config = props.gameConfig

    const player = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer
    if (player.type === PlayerType.AI) return false

    // Check if the column is full
    return isColumnAvailable(board(), columnIndex)
  }

  return (
    <div class={styles.gameContainer}>
      <h1>Connect Four</h1>

      <Show when={isLoading()}>
        <div class={styles.loadingMessage}>Loading game...</div>
      </Show>

      <div class={styles.board}>
        {/* Render the game board */}
        {Array(ROWS)
          .fill(null)
          .map((_, rowIndex) => (
            <div class={styles.row}>
              {Array(COLS)
                .fill(null)
                .map((_, colIndex) => {
                  const cellValue = board()[rowIndex][colIndex]
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

      {/* Column buttons for placing tokens - only show in human-vs-ai mode */}
      <Show when={gameMode() === 'human-vs-ai'}>
        <div class={styles.controls}>
          {Array(COLS)
            .fill(null)
            .map((_, colIndex) => (
              <button
                class={styles.columnButton}
                onClick={() => placeToken(colIndex)}
                disabled={!isValidMove(colIndex)}
              >
                ↓
              </button>
            ))}
        </div>
      </Show>

      {/* Message for AI vs AI mode */}
      <Show when={gameMode() === 'ai-vs-ai'}>
        <div class={styles.aiVsAiMessage}>Auto-playing AI vs AI game</div>
      </Show>

      <div class={`${styles.status} ${getStatusClass()}`}>
        <p>{renderGameStatus()}</p>
      </div>

      <div class={styles.gameControls}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            window.navigate('/')
          }}
          class={styles.resetButton}
        >
          Return to Home
        </a>
        <button onClick={() => loadGameState()} class={styles.resetButton} style={{ 'margin-left': '10px' }}>
          Refresh Game
        </button>
      </div>

      {/* Error message display */}
      <Show when={errorMessage() !== null}>
        <div class={styles.errorMessage}>
          <p>{errorMessage()}</p>
        </div>
      </Show>
    </div>
  )
}

export default GameBoard

/**
 * Check if a column is available for a move
 * @param board The current board state
 * @param columnIndex The column to check
 * @returns True if the column has at least one empty cell
 */
export function isColumnAvailable(board: Board, columnIndex: number): boolean {
  return board[0][columnIndex] === null
}
