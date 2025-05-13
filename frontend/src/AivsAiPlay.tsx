import { Component, createSignal, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { GameConfig, PlayerType, PlayerColor, Board, createEmptyBoard } from './game-types'
import GameBoard from './GameBoard'

interface AivsAiPlayProps {
  gameConfig: GameConfig
}

const AivsAiPlay: Component<AivsAiPlayProps> = (props) => {
  // Extract gameId from path - match both legacy and new paths
  const gameIdMatch = window.location.pathname.match(/\/connect4\/(?:ai-vs-ai|game)\/([^\/]+)/)
  const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown-game'
  console.log('AivsAiPlay found gameId:', gameId, 'from path:', window.location.pathname)
  
  // Game state
  const [gameIdState] = createSignal<string>(gameId)
  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.RED)
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
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
      
      if (gameState.mode !== 'ai-vs-ai') {
        // Wrong game mode - this shouldn't happen but let's handle it
        console.error('Error: Game mode is not ai-vs-ai:', gameState.mode)
        setErrorMessage(`Wrong game mode: ${gameState.mode}. Expected: ai-vs-ai`)
      }
      
      // Apply the state
      applyGameState(gameState)

      // If the game is still going, start autoplay
      if (gameState.status === 'playing') {
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

    // Update the game status
    setGameStatus(gameState.status)

    // Update our move counter
    setLastMoveCount(gameState.moves.length)

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
        // Make a new move - the AI API handles determining the correct column
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
      return `Red (AI - ${winnerConfig.model}) wins!`
    }

    if (status === 'blue-win') {
      const config = props.gameConfig
      const winnerConfig = config.bluePlayer
      return `Blue (AI - ${winnerConfig.model}) wins!`
    }

    if (status === 'draw') {
      return 'Game ended in a draw!'
    }

    // Game is still in progress
    const config = props.gameConfig
    const player = currentPlayer() === PlayerColor.RED ? config.redPlayer : config.bluePlayer
    const colorName = currentPlayer() === PlayerColor.RED ? 'Red' : 'Blue'
    return `Current Player: ${colorName} (AI - ${player.model})`
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

  return (
    <div class={styles.gameContainer}>
      <h1>Connect 4</h1>

      <Show when={isLoading()}>
        <div class={styles.loadingMessage}>Loading game...</div>
      </Show>

      <GameBoard board={board()} />

      <div class={styles.aiVsAiMessage}>Auto-playing AI vs AI game</div>

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

export default AivsAiPlay