import { Component, createSignal, Show, For, onMount } from 'solid-js'
import { GameMode, PlayerType, PlayerColor } from './game-types'
import { initializeGame, getModels } from './ai-service'
import styles from './PlayerSelection.module.css'
import appStyles from './App.module.css'
import { useNavigate } from '@solidjs/router'
import { Select, SelectOption } from './components/select'
import { A } from '@solidjs/router'

const PlayerSelection: Component = () => {
  console.log('PlayerSelection component rendering')
  const [gameMode, setGameMode] = createSignal<GameMode>('human-vs-ai')
  const [pinkAI, setPinkAI] = createSignal<SelectOption>({value: '', label: ''})
  const [orangeAI, setOrangeAI] = createSignal<SelectOption>({value: '', label: ''})
  const [models, setModels] = createSignal<SelectOption[]>([])
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isStartingGame, setIsStartingGame] = createSignal<boolean>(false)
  const navigate = useNavigate()

  const getSetModels = async () => {
    const {models, default_pink, default_orange} = await getModels()
    setModels(models)
    setPinkAI(default_pink)
    setOrangeAI(default_orange)
  }

  onMount(() => {
    getSetModels()
  })

  const startGame = async () => {
    setErrorMessage(null)
    setIsStartingGame(true)

    try {
      // Get a game ID from the server
      const gameId = await initializeGame(orangeAI().value, gameMode() == 'human-vs-ai' ? null : pinkAI().value)
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
    <div class={styles.homeContainer}>
      <h1>Connect Four</h1>
      <div class={styles.selectionCard}>
        <div class={styles.modeSelection}>
          <h2>Choose Game Mode</h2>
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
              <Select value={pinkAI()} onChange={setPinkAI} options={models()} />
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
            <Select value={orangeAI()} onChange={setOrangeAI} options={models()} />
          </div>
        </div>

        <button class={styles.startButton} onClick={startGame} disabled={isStartingGame()}>
          {isStartingGame() ? 'Starting Game...' : 'Start Game'}
        </button>

        <div class={styles.playerConfig}>
          <p>
            Source:{' '}
            <A href="https://github.com/pydantic/connect4" class={appStyles.link} target="_blank">
              github.com/pydantic/connect4
            </A>
          </p>
        </div>

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
