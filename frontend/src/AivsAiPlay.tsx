import { Component, createSignal, Show, onMount } from 'solid-js'
import styles from './App.module.css'
import { getGameState, makeMove, GameState } from './ai-service'
import { PlayerColor, Board, createEmptyBoard } from './game-types'
import GameBoard from './GameBoard'
import { A, useParams } from '@solidjs/router'

const AiVsAiPlay: Component = () => {
  const { gameId } = useParams()
  console.log('HumanAIPlay, gameId:', gameId)

  // Game state
  const [board, setBoard] = createSignal<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = createSignal<PlayerColor>(PlayerColor.PINK)
  const [isLoading, setIsLoading] = createSignal<boolean>(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [gameStatus, setGameStatus] = createSignal<'playing' | 'pink-win' | 'orange-win' | 'draw'>('playing')
  const [PinkAI, setPinkAI] = createSignal<string>('')
  const [OrangeAI, setOrangeAI] = createSignal<string>('')

  // Load game state from server
  const loadGameState = async () => {
    setIsLoading(true)
    setErrorMessage(null) // Clear any previous errors
    try {
      const gameState = await getGameState(gameId)
      console.log('Received game state:', gameState)

      if (gameState.pinkAI === null) {
        // Wrong game mode - this shouldn't happen but let's handle it
        console.error('Error: Game mode is not ai-vs-ai')
        setErrorMessage(`Wrong game mode, expected: ai-vs-ai`)
      } else {
        setPinkAI(gameState.pinkAI)
        setOrangeAI(gameState.orangeAI)
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
    let lastPlayer = PlayerColor.ORANGE // Start with ORANGE so first move will be PINK

    // Update the game status
    setGameStatus(gameState.status)

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

  // Function to handle AI vs AI autoplay
  const autoPlayAIvsAI = async () => {
    setErrorMessage(null)

    try {
      const newState = await makeMove(gameId)
      applyGameState(newState)

      // If the game is still going, schedule the next move
      if (newState.status === 'playing') {
        setTimeout(() => {
          autoPlayAIvsAI()
        }, 1000)
      }
    } catch (error) {
      console.error('Error in AI vs AI autoplay:', error)
      setErrorMessage(`Error in AI autoplay: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

    // Check the game status from the server
    const status = gameStatus()

    if (status === 'pink-win') {
      return `Pink AI wins! (${PinkAI()}) 🎉`
    } else if (status === 'orange-win') {
      return `Orange AI wins! (${OrangeAI()}) 🎉`
    } else if (status === 'draw') {
      return 'Game ended in a draw!'
    } else {
      // Game is still in progress
      const colorName = currentPlayer() === PlayerColor.PINK ? 'Pink' : 'Orange'
      const aiName = currentPlayer() === PlayerColor.PINK ? PinkAI() : OrangeAI()
      return `${colorName} (${aiName}) is thinking...`
    }
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

  const isPinkThinking = () => {
    return currentPlayer() === PlayerColor.PINK && gameStatus() === 'playing'
  }

  const isOrangeThinking = () => {
    return currentPlayer() === PlayerColor.ORANGE && gameStatus() === 'playing'
  }

  return (
    <div class={styles.gameContainer}>
      <h1>
        Connect Four &mdash; AI vs AI <span class={styles.autoplayBadge}>Autoplay</span>
      </h1>

      <Show when={isLoading()}>
        <div class={styles.loadingMessage}>Loading game...</div>
      </Show>

      <div class={`${styles.status} ${getStatusClass()}`}>
        <p class={isPinkThinking() ? styles.pinkThinking : isOrangeThinking() ? styles.orangeThinking : ''}>
          {renderGameStatus()}
        </p>
      </div>

      <GameBoard board={board()} />
      <section class={styles.playerInfo}>
        <section class={styles.player}>
          <div classList={{ [styles.gamePiece]: true, [styles.player1]: true }} />
          <p>{PinkAI()}</p>
        </section>
        <section class={styles.player}>
          <div classList={{ [styles.gamePiece]: true, [styles.player2]: true }} />
          <p>{OrangeAI()}</p>
        </section>
      </section>
      <div class={styles.gameControls}>
        <A href="/" class={styles.resetButton}>
          Return to Home
        </A>
      </div>

      <Show when={errorMessage() !== null}>
        <div class={styles.errorMessage}>
          <p>{errorMessage()}</p>
        </div>
      </Show>
    </div>
  )
}

export default AiVsAiPlay
