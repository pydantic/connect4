import { Component, createSignal, onMount, createEffect } from 'solid-js'
import styles from './App.module.css'
import PlayerSelection from './PlayerSelection'
import GameBoard from './GameBoard'
import { GameConfig, GameMode, PlayerType, PlayerColor, AIModel } from './game-types'

// Game route component to handle game configuration
const GameRoute: Component = () => {
  console.log('GameRoute component rendering')
  // Extract gameId from the URL hash
  const getGameIdFromHash = () => {
    const match = window.location.hash.match(/\/game\/([^\/]+)/)
    return match ? match[1] : null
  }

  const gameId = getGameIdFromHash()
  console.log('GameRoute found gameId:', gameId)

  // Create a default game config
  const createDefaultConfig = (): GameConfig => ({
    mode: GameMode.HUMAN_VS_AI,
    redPlayer: {
      type: PlayerType.HUMAN,
      color: PlayerColor.RED,
    },
    bluePlayer: {
      type: PlayerType.AI,
      color: PlayerColor.BLUE,
      model: AIModel.CLAUDE,
    },
  })

  // For a real app, we would store this in a database or state management system
  // Here we're just creating a default config for the demo
  const [gameConfig] = createSignal<GameConfig>(createDefaultConfig())

  return <GameBoard gameConfig={gameConfig()} />
}

// Home component not needed anymore

const App: Component = () => {
  console.log('App component rendering')

  // Use createSignal for reactivity
  const [currentPath, setCurrentPath] = createSignal(window.location.hash)

  // Function to check hash and update state
  const updatePath = () => {
    console.log('Hash changed to:', window.location.hash)
    setCurrentPath(window.location.hash)
  }

  // Set up hash change listener
  onMount(() => {
    console.log('App mounted, hash is:', window.location.hash)
    // Initial check
    updatePath()

    // Listen for hash changes
    window.addEventListener('hashchange', updatePath)
  })

  // Create an effect that runs when path changes
  createEffect(() => {
    console.log('Current path changed to:', currentPath())
  })

  // Determine which view to render based on path
  const isGameRoute = () => {
    const result = currentPath().includes('/game/')
    console.log('isGameRoute() called, path:', currentPath(), 'result:', result)
    return result
  }

  return <div class={styles.App}>{isGameRoute() ? <GameRoute /> : <PlayerSelection />}</div>
}

export default App
