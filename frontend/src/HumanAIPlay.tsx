import { Component, createSignal, createEffect, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { PlayerColor, Board, createEmptyBoard } from './game-types'
import GameBoard, { GameBoardControls, isColumnAvailable } from './GameBoard'
import { A, useParams } from '@solidjs/router'

const HumanAIPlay: Component = () => {
  const { gameId } = useParams()
  console.log('HumanAIPlay, gameId:', gameId)

  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.PINK)
  const [isAIThinking, setIsAIThinking] = createSignal<boolean>(false)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [gameStatus, setGameStatus] = createSignal<'playing' | 'pink-win' | 'orange-win' | 'draw'>('playing')
  const [OrangeAI, setOrangeAI] = createSignal<string>('')

  // Load game state from server
  const loadGameState = async () => {
    setIsLoading(true)
    setErrorMessage(null) // Clear any previous errors
    try {
      console.log('Loading game state for gameId:', gameId)
      const gameState = await getGameState(gameId)
      console.log('Received game state:', gameState)

      if (gameState.pinkAI != null) {
        // Wrong game mode - this shouldn't happen but let's handle it
        console.error('Error: Game mode is not human-vs-ai')
        setErrorMessage(`Wrong game mode, expected: human-vs-ai`)
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
    let lastPlayer = PlayerColor.ORANGE // Start with ORANGE so first move will be PINK

    // Update the game status
    setGameStatus(gameState.status)
    setOrangeAI(gameState.orangeAIDisplay)

    // Apply moves in order
    for (const move of gameState.moves) {
      // Convert column number (1-7) to index (0-6)
      const columnIndex = move.column - 1

      // Convert player string to enum
      const playerColor = move.player === 'pink' ? PlayerColor.PINK : PlayerColor.ORANGE

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
    const nextPlayer = lastPlayer === PlayerColor.PINK ? PlayerColor.ORANGE : PlayerColor.PINK
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
      console.log(`Making move in column ${columnIndex} for game ${gameId}`)
      // Call the API to make the move and get updated game state (including AI's response move)
      const gameState = await makeMove(gameId, columnIndex)
      console.log('Received updated game state after move:', gameState)

      // Apply the server-returned game state (overwrites our local changes)
      applyGameState(gameState)

      return true // Move was successful
    } catch (error) {
      console.error('Error making move:', error)
      loadGameState()

      setErrorMessage(`Failed to make move: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    } else if (isAIThinking()) {
      return `Orange (${OrangeAI()}) is thinking...`
    }

    const status = gameStatus()

    if (status === 'pink-win') {
      return 'You win! (Pink) 🎉'
    } else if (status === 'orange-win') {
      return `Orange AI wins! (${OrangeAI()}) 🎉`
    } else if (status === 'draw') {
      return 'Game ended in a draw!'
    } else {
      return 'Your turn (Pink player)'
    }
  }

  // Get the status message CSS class
  const getStatusClass = () => {
    const status = gameStatus()

    if (status === 'pink-win') {
      return styles.winnerMessagePink
    }

    if (status === 'orange-win') {
      return styles.winnerMessageOrange
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

    // Check if the column is full
    return isColumnAvailable(board(), columnIndex)
  }

  return (
    <div class={styles.gameContainer}>
      <h1>Connect Four &mdash; Human vs AI</h1>

      <div class={`${styles.status} ${getStatusClass()}`}>
        <p class={isAIThinking() ? styles.orangeThinking : ''}>{renderGameStatus()}</p>
      </div>

      <Show when={isLoading()}>
        <div class={styles.loadingMessage}>Loading game...</div>
      </Show>

      <GameBoardControls onColumnClick={placeToken} isValidMove={isValidMove} />

      <GameBoard board={board()} />

      <section class={styles.playerInfo}>
        <section class={styles.player}>
          <div classList={{ [styles.gamePiece]: true, [styles.player1]: true }} />
          <p>You</p>
        </section>
        <section class={styles.player}>
          <div classList={{ [styles.gamePiece]: true, [styles.player2]: true }} />
          <p>{OrangeAI()}</p>
        </section>
      </section>

      <div class={styles.gameControls}>
        <A href="/" class={styles.resetButton}>
          Return Home
        </A>
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
