import { Component, createSignal, Show, For, onMount } from 'solid-js'
import { GameMode, AIModel, PlayerType, PlayerColor, PlayerConfig, GameConfig } from './game-types'
import { initializeGame } from './ai-service'
import styles from './PlayerSelection.module.css'
import { useNavigate } from '@solidjs/router'

// For debugging
console.log('PlayerSelection module loaded')

const PlayerSelection: Component = () => {
  console.log('PlayerSelection component rendering')
  const [gameMode, setGameMode] = createSignal<GameMode>(GameMode.HUMAN_VS_AI)
  const [pinkPlayerModel, setPinkPlayerModel] = createSignal<AIModel>(AIModel.CLAUDE)
  const [orangePlayerModel, setOrangePlayerModel] = createSignal<AIModel>(AIModel.GPT_4)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isStartingGame, setIsStartingGame] = createSignal<boolean>(false)
  const navigate = useNavigate()

  onMount(() => {
    console.log('PlayerSelection component mounted')
  })

  // Available AI models
  const aiModels = [AIModel.GPT_4, AIModel.GPT_3_5, AIModel.CLAUDE, AIModel.GEMINI]

  const startGame = async () => {
    setErrorMessage(null)
    setIsStartingGame(true)

    try {
      // Get the backend mode string format
      const backendModeParam = gameMode() === GameMode.HUMAN_VS_AI ? 'human-vs-ai' : 'ai-vs-ai'
      console.log(`Starting game with mode: ${backendModeParam}`)

      // Get a game ID from the server
      const gameId = await initializeGame(gameMode())
      console.log('Got game ID from server:', gameId)

      // Use the same mode string format for routing
      const route = `/connect4/${backendModeParam}/${gameId}`
      console.log(`Navigating to route: ${route}`)
      navigate(route)
    } catch (error) {
      console.error('Failed to start game:', error)
      setErrorMessage(`Failed to start the game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsStartingGame(false)
    }
  }

  const handleStartGame = (mode: GameMode) => {
    const route = mode === GameMode.HUMAN_VS_AI ? '/connect4/human-vs-ai' : '/connect4/ai-vs-ai'
    navigate(route)
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
              class={gameMode() === GameMode.HUMAN_VS_AI ? styles.activeTab : styles.tab}
              onClick={() => handleStartGame(GameMode.HUMAN_VS_AI)}
              disabled={isStartingGame()}
            >
              Human vs AI
            </button>
            <button
              class={gameMode() === GameMode.AI_VS_AI ? styles.activeTab : styles.tab}
              onClick={() => handleStartGame(GameMode.AI_VS_AI)}
              disabled={isStartingGame()}
            >
              AI vs AI
            </button>
          </div>
        </div>

        <div class={styles.playerSelection}>
          <Show when={gameMode() === GameMode.AI_VS_AI}>
            <div class={styles.playerConfig}>
              <h3>Pink Player (AI)</h3>
              <select
                value={pinkPlayerModel()}
                onChange={(e) => setPinkPlayerModel(e.target.value as AIModel)}
                disabled={isStartingGame()}
              >
                <For each={aiModels}>{(model) => <option value={model}>{model}</option>}</For>
              </select>
            </div>
          </Show>

          <Show when={gameMode() === GameMode.HUMAN_VS_AI}>
            <div class={styles.playerConfig}>
              <h3>Pink Player (You)</h3>
              <p>Human Player</p>
            </div>
          </Show>

          <div class={styles.playerConfig}>
            <h3>Orange Player (AI)</h3>
            <select
              value={orangePlayerModel()}
              onChange={(e) => setOrangePlayerModel(e.target.value as AIModel)}
              disabled={isStartingGame()}
            >
              <For each={aiModels}>{(model) => <option value={model}>{model}</option>}</For>
            </select>
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
