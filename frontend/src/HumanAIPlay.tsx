import { Component, createSignal, createEffect, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { GameConfig, PlayerType, PlayerColor, Board, createEmptyBoard } from './game-types'
import GameBoard, { GameBoardControls, isColumnAvailable } from './GameBoard'

interface HumanAIPlayProps {
  gameConfig: GameConfig
}

const HumanAIPlay: Component<HumanAIPlayProps> = (props) => {
  // Extract gameId from path - match both legacy and new paths
  const gameIdMatch = window.location.pathname.match(/\/connect4\/(?:human-vs-ai|game)\/([^\/]+)/)
  const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown-game'
  console.log('HumanAIPlay found gameId:', gameId, 'from path:', window.location.pathname)

  // Game state
  const [gameIdState] = createSignal<string>(gameId)
  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.RED)
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [gameStatus, setGameStatus] = createSignal<'playing' | 'red-win' | 'blue-win' | 'draw'>('playing')

  // Load game state from server
  const loadGameState = async () => {
    setIsLoading(true)
    setErrorMessage(null) // Clear any previous errors
    try {
      console.log('Loading game state for gameId:', gameIdState())
      const gameState = await getGameState(gameIdState())
      console.log('Received game state:', gameState)

      if (gameState.mode !== 'human-vs-ai') {
        // Wrong game mode - this shouldn't happen but let's handle it
        console.error('Error: Game mode is not human-vs-ai:', gameState.mode)
        setErrorMessage(`Wrong game mode: ${gameState.mode}. Expected: human-vs-ai`)
      }

      applyGameState(gameState)
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

    // Update the game status
    setGameStatus(gameState.status)

    // Apply moves in order
    for (const move of gameState.moves) {
      // Convert column number (1-7) to index (0-6)
      const columnIndex = move.column - 1

      // Convert player string to enum
      const playerColor = move.player === 'red' ? PlayerColor.RED : PlayerColor.BLUE

      // Find the lowest empty cell in the selected column
      let placed = false
      for (let rowIndex = 5; rowIndex >= 0; rowIndex--) {
        if (newBoard[rowIndex][columnIndex] === null) {
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

    // Set the board state
    setBoard(newBoard)

    // Set the current player to the opposite of the last player
    const nextPlayer = lastPlayer === PlayerColor.RED ? PlayerColor.BLUE : PlayerColor.RED
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
    for (let rowIndex = 5; rowIndex >= 0; rowIndex--) {
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

      <div class={`${styles.status} ${getStatusClass()}`}>
        <p>{renderGameStatus()}</p>
      </div>

      <Show when={isLoading()}>
        <div class={styles.loadingMessage}>Loading game...</div>
      </Show>

      <GameBoardControls onColumnClick={placeToken} isValidMove={isValidMove} />

      <GameBoard board={board()} />

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

export default HumanAIPlay
