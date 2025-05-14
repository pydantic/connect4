import { Component, createSignal, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { GameConfig, PlayerType, PlayerColor, Board, createEmptyBoard } from './game-types'
import GameBoard from './GameBoard'

interface AivsAiPlayProps {
  gameConfig: GameConfig
}

// Define delays for AI autoplay
const AI_INTER_MOVE_DELAY = 1500 // ms - Delay between one AI's move and the next
const AI_THINKING_REFRESH_DELAY = 500 // ms - Short delay after requesting a move, before refreshing state

const AivsAiPlay: Component<AivsAiPlayProps> = (props) => {
  // Extract gameId from path - match both legacy and new paths
  const gameIdMatch = window.location.pathname.match(/\/connect4\/(?:ai-vs-ai|game)\/([^\/]+)/)
  const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown-game'
  console.log('AivsAiPlay found gameId:', gameId, 'from path:', window.location.pathname)

  // Game state
  const [gameIdState] = createSignal<string>(gameId)
  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.PINK)
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [gameStatus, setGameStatus] = createSignal<'playing' | 'pink-win' | 'orange-win' | 'draw'>('playing')
  const [lastMoveCount, setLastMoveCount] = createSignal<number>(0) // Track the number of moves applied to the local board

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

      // Apply the initial state
      applyGameState(gameState)

      // If the game is still going, start autoplay
      if (gameState.status === 'playing') {
        setTimeout(() => {
          autoPlayAIvsAI()
        }, 500) // Initial delay before first AI action
      }
    } catch (error) {
      console.error('Error loading game state:', error)
      setErrorMessage(`Failed to load game state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply game state from server response
  // This function now applies all moves in gameState.moves up to its length.
  // It's used for initial load and for applying single new moves during autoplay.
  const applyGameState = (gameState: GameState) => {
    const newBoard = createEmptyBoard()
    let lastPlayerApplied = PlayerColor.ORANGE // Default for calculating next player if no moves

    // Update the game status based on the provided gameState
    setGameStatus(gameState.status as 'playing' | 'pink-win' | 'orange-win' | 'draw')

    // Update our local move counter to reflect how many moves are in this gameState
    setLastMoveCount(gameState.moves.length)

    // Apply moves in order
    for (const move of gameState.moves) {
      const columnIndex = move.column - 1
      const playerColor = move.player === 'pink' ? PlayerColor.PINK : PlayerColor.ORANGE
      let placed = false
      for (let rowIndex = 5; rowIndex >= 0; rowIndex--) {
        if (newBoard[rowIndex][columnIndex] === null) {
          newBoard[rowIndex][columnIndex] = playerColor
          lastPlayerApplied = playerColor
          placed = true
          break
        }
      }
      if (!placed) {
        console.warn(`Couldn't place token in column ${columnIndex} - column is full!`)
      }
    }

    setBoard(newBoard)
    const nextPlayer = lastPlayerApplied === PlayerColor.PINK ? PlayerColor.ORANGE : PlayerColor.PINK
    setCurrentPlayer(nextPlayer)
  }

  // Helper method to check if the game is over
  const isGameOver = () => {
    return gameStatus() !== 'playing'
  }

  // Function to handle AI vs AI autoplay, processing one move at a time
  const autoPlayAIvsAI = async () => {
    if (isGameOver() || isAIThinking()) {
      // If game is over or an AI operation is already in progress (due to setTimeout), do nothing.
      return
    }

    setIsAIThinking(true)
    setErrorMessage(null)

    try {
      // Fetch the latest state from the server
      const serverGameState = await getGameState(gameIdState())
      
      // Update game status immediately from server state. This is important for isGameOver().
      setGameStatus(serverGameState.status as 'playing' | 'pink-win' | 'orange-win' | 'draw')

      if (isGameOver()) {
        // If game ended, apply the final server state and stop.
        applyGameState(serverGameState)
        setIsAIThinking(false)
        return
      }

      const localMovesCount = lastMoveCount()
      const serverMoves = serverGameState.moves

      if (serverMoves.length > localMovesCount) {
        // Server has new moves that we haven't displayed yet.
        // Apply only the *next* new move.
        console.log(`Server has ${serverMoves.length} moves, local has ${localMovesCount}. Applying next move.`);
        const tempGameStateForSingleMove: GameState = {
          ...serverGameState,
          moves: serverMoves.slice(0, localMovesCount + 1), // Moves up to and including the next one
        }
        applyGameState(tempGameStateForSingleMove) // This updates board and lastMoveCount()

        // After applying one move, check status again (as applyGameState updates it)
        if (gameStatus() === 'playing') {
          // Schedule the next action (either processing another pending move or making a new one)
          setTimeout(() => {
            setIsAIThinking(false) // Clear thinking state before next cycle
            autoPlayAIvsAI()
          }, AI_INTER_MOVE_DELAY)
        } else {
          // Game ended after applying this move, ensure full final state is shown
          applyGameState(serverGameState)
          setIsAIThinking(false)
        }
      } else if (serverMoves.length === localMovesCount && gameStatus() === 'playing') {
        // Local state is up-to-date with server, and game is ongoing. Time to make a new move.
        console.log('Local state up-to-date. Making new AI move.')
        await makeMove(gameIdState(), 0) // Request AI to make a move (column 0 is placeholder for AI)
        
        // After makeMove, the server state is updated.
        // We don't use the direct response of makeMove.
        // Instead, we schedule autoPlayAIvsAI to re-fetch state.
        // This ensures that if makeMove resulted in one or more actual moves on the server,
        // they are picked up by the (serverMoves.length > localMovesCount) branch above
        // and processed one by one with delays.
        setTimeout(() => {
          setIsAIThinking(false) // Clear thinking state before next cycle
          autoPlayAIvsAI()
        }, AI_THINKING_REFRESH_DELAY)
      } else {
        // Fallback: localMovesCount might be > serverMoves.length (should not happen often)
        // or game is not 'playing' but wasn't caught by isGameOver earlier.
        console.warn('autoPlayAIvsAI: No action taken or unexpected state.', {
          status: gameStatus(),
          serverMoves: serverMoves.length,
          localMoves: localMovesCount,
        })
        setIsAIThinking(false) // Ensure thinking is cleared
      }
    } catch (error) {
      console.error('Error in AI vs AI autoplay:', error)
      setErrorMessage(`Error in AI autoplay: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

    // Show "AI is thinking" regardless of whose turn, if an operation is in progress
    if (isAIThinking()) {
      return 'AI is thinking'
    }

    // Check the game status from the server
    const status = gameStatus()

    if (status === 'pink-win') {
      const config = props.gameConfig
      const winnerConfig = config.pinkPlayer
      return `Pink (AI - ${winnerConfig.model}) wins!`
    }

    if (status === 'orange-win') {
      const config = props.gameConfig
      const winnerConfig = config.orangePlayer
      return `Orange (AI - ${winnerConfig.model}) wins!`
    }

    if (status === 'draw') {
      return 'Game ended in a draw!'
    }

    // Game is still in progress
    const config = props.gameConfig
    const player = currentPlayer() === PlayerColor.PINK ? config.pinkPlayer : config.orangePlayer
    const colorName = currentPlayer() === PlayerColor.PINK ? 'Pink' : 'Orange'
    return `Current Player: ${colorName} (AI - ${player.model})`
  }

  // Get the status message CSS class
  const getStatusClass = () => {
    const status = gameStatus()

    if (status === 'pink-win' || status === 'orange-win') {
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
        <p class={isAIThinking() ? styles.thinking : ''}>{renderGameStatus()}</p>
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
