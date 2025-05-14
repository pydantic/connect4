import { Component, createSignal, Show, For, onMount } from 'solid-js'
import { GameMode, AI_MODELS, PlayerType, PlayerColor } from './game-types'
import { initializeGame } from './ai-service'
import styles from './PlayerSelection.module.css'
import { useNavigate } from '@solidjs/router'
import { Select } from './components/select'

const PlayerSelection: Component = () => {
  console.log('PlayerSelection component rendering')
  const [gameMode, setGameMode] = createSignal<GameMode>('human-vs-ai')
  const [pinkAI, setPinkAI] = createSignal('anthropic:claude-3-7-sonnet-latest')
  const [orangeAI, setOrangeAI] = createSignal('openai:gpt-4o')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isStartingGame, setIsStartingGame] = createSignal<boolean>(false)
  const navigate = useNavigate()

  onMount(() => {
    console.log('PlayerSelection component mounted')
  })

  const startGame = async () => {
    setErrorMessage(null)
    setIsStartingGame(true)

    try {
      // Get a game ID from the server
      const gameId = await initializeGame(orangeAI(), gameMode() == 'human-vs-ai' ? null : pinkAI())
      console.log('Got game ID from server:', gameId)

      // Use the same mode string format for routing
      const route = `/connect4/${gameMode()}/${gameId}`
      console.log(`Navigating to route: ${route}`)
      navigate(route)
    } catch (error) {
      console.error('Failed to start game:', error)
      setErrorMessage(`Failed to start the game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsStartingGame(false)
    }
  }

  return (
    <div class={styles.container}>
      <h1>Connect Four</h1>

      <div class={styles.selectionCard}>
        <h2>Game Setup</h2>

        <div class={styles.modeSelection}>
          <h3>Choose Game Mode</h3>
          <div class={styles.tabs}>
            <button
              class={gameMode() === 'human-vs-ai' ? styles.activeTab : styles.tab}
              onClick={() => setGameMode('human-vs-ai')}
              disabled={isStartingGame()}
            >
              Human vs AI
            </button>
            <button
              class={gameMode() === 'ai-vs-ai' ? styles.activeTab : styles.tab}
              onClick={() => setGameMode('ai-vs-ai')}
              disabled={isStartingGame()}
            >
              AI vs AI
            </button>
          </div>
        </div>

        <div class={styles.playerSelection}>
          <Show when={gameMode() === 'ai-vs-ai'}>
            <div class={styles.playerConfig}>
              <div class={`${styles.gamePiece} ${styles.pinkPiece}`}></div>
              <h3>Pink Player (AI)</h3>
              <Select value={pinkAI()} onChange={setPinkAI} options={AI_MODELS} />
            </div>
          </Show>

          <Show when={gameMode() === 'human-vs-ai'}>
            <div class={styles.playerConfig}>
              <div class={`${styles.gamePiece} ${styles.pinkPiece}`}></div>
              <h3>Pink Player (You)</h3>
              <p class={styles.humanPlayer}>Human Player</p>
            </div>
          </Show>

          <div class={styles.playerConfig}>
            <div class={`${styles.gamePiece} ${styles.orangePiece}`}></div>
            <h3>Orange Player (AI)</h3>
            <Select value={orangeAI()} onChange={setOrangeAI} options={AI_MODELS} />
          </div>
        </div>

        <button class={styles.startButton} onClick={startGame} disabled={isStartingGame()}>
          {isStartingGame() ? 'Starting Game...' : 'Start Game'}
        </button>

        {/* Error message display */}
        <Show when={errorMessage() !== null}>
          <div class={styles.errorMessage}>
            <p>{errorMessage()}</p>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default PlayerSelection
