import { Component, createSignal, Show, For, onMount } from 'solid-js'
import { v4 as uuidv4 } from 'uuid'
import { GameMode, AIModel, PlayerType, PlayerColor, PlayerConfig, GameConfig } from './game-types'
import styles from './PlayerSelection.module.css'

// For debugging
console.log('PlayerSelection module loaded')

const PlayerSelection: Component = () => {
  console.log('PlayerSelection component rendering')
  const [gameMode, setGameMode] = createSignal<GameMode>(GameMode.HUMAN_VS_AI)
  const [redPlayerModel, setRedPlayerModel] = createSignal<AIModel>(AIModel.CLAUDE)
  const [bluePlayerModel, setBluePlayerModel] = createSignal<AIModel>(AIModel.GPT_4)

  onMount(() => {
    console.log('PlayerSelection component mounted')
  })

  // Available AI models
  const aiModels = [AIModel.GPT_4, AIModel.GPT_3_5, AIModel.CLAUDE, AIModel.GEMINI]

  const startGame = () => {
    // In a real application, you would save the game configuration to a state store
    // or send it to a backend service

    // Generate a unique game ID
    const gameId = uuidv4()

    console.log('Starting game with ID:', gameId)

    // Navigate to the game route with the game ID
    // Use the navigate function we added to window in SimpleRoute
    window.navigate(`/connect4/game/${gameId}`)
  }

  return (
    <div class={styles.container}>
      <h1>Connect Four</h1>

      <div class={styles.selectionCard}>
        <h2>Game Setup</h2>

        <div class={styles.modeSelection}>
          <h3>Choose Game Mode</h3>
          <div class={styles.modeButtons}>
            <button
              class={gameMode() === GameMode.HUMAN_VS_AI ? styles.selectedMode : ''}
              onClick={() => setGameMode(GameMode.HUMAN_VS_AI)}
            >
              Human vs AI
            </button>
            <button
              class={gameMode() === GameMode.AI_VS_AI ? styles.selectedMode : ''}
              onClick={() => setGameMode(GameMode.AI_VS_AI)}
            >
              AI vs AI
            </button>
          </div>
        </div>

        <div class={styles.playerSelection}>
          <Show when={gameMode() === GameMode.AI_VS_AI}>
            <div class={styles.playerConfig}>
              <h3>Red Player (AI)</h3>
              <select value={redPlayerModel()} onChange={(e) => setRedPlayerModel(e.target.value as AIModel)}>
                <For each={aiModels}>{(model) => <option value={model}>{model}</option>}</For>
              </select>
            </div>
          </Show>

          <Show when={gameMode() === GameMode.HUMAN_VS_AI}>
            <div class={styles.playerConfig}>
              <h3>Red Player (You)</h3>
              <p>Human Player</p>
            </div>
          </Show>

          <div class={styles.playerConfig}>
            <h3>Blue Player (AI)</h3>
            <select value={bluePlayerModel()} onChange={(e) => setBluePlayerModel(e.target.value as AIModel)}>
              <For each={aiModels}>{(model) => <option value={model}>{model}</option>}</For>
            </select>
          </div>
        </div>

        <button class={styles.startButton} onClick={startGame}>
          Start Game
        </button>
      </div>
    </div>
  )
}

export default PlayerSelection
