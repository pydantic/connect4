import { Component } from 'solid-js'
import {Router,  Route } from '@solidjs/router'
import styles from './App.module.css'
import HomePage from './HomePage'
import PlayerSelection from './PlayerSelection'
import HumanAIPlay from './HumanAIPlay'
import AiVsAiPlay from './AivsAiPlay'
import { createSignal } from 'solid-js'
import { GameConfig, GameMode, PlayerType, PlayerColor, AIModel } from './game-types'

const App: Component = () => {
  console.log('App component rendering')

  // Create a default game config
  const createDefaultConfig = (): GameConfig => ({
    mode: GameMode.HUMAN_VS_AI,
    pinkPlayer: {
      type: PlayerType.HUMAN,
      color: PlayerColor.PINK,
    },
    orangePlayer: {
      type: PlayerType.AI,
      color: PlayerColor.ORANGE,
      model: AIModel.CLAUDE,
    },
  })

  const [gameConfig] = createSignal<GameConfig>(createDefaultConfig())

  return (
    <div class={styles.App}>
      <Router>
        <Route path="/" component={HomePage} />
        <Route path="/connect4" component={PlayerSelection} />
        <Route path="/connect4/human-vs-ai/*" component={() => <HumanAIPlay gameConfig={gameConfig()} />} />
        <Route path="/connect4/ai-vs-ai/*" component={() => <AiVsAiPlay gameConfig={gameConfig()} />} />
        <Route path="/connect4/game/*" component={() => <HumanAIPlay gameConfig={gameConfig()} />} />
      </Router>      
    </div>
  )
}

export default App
