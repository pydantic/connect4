import { Component, createSignal, onMount, onCleanup, createEffect } from 'solid-js'
import PlayerSelection from './PlayerSelection'
import HomePage from './HomePage'
import HumanAIPlay from './HumanAIPlay'
import AivsAiPlay from './AivsAiPlay'
import { GameConfig, GameMode, PlayerType, PlayerColor, AIModel } from './game-types'

const SimpleRoute: Component = () => {
  console.log('SimpleRoute component rendering')

  // Create state for current route
  const [route, setRoute] = createSignal(window.location.pathname)

  // Navigate to a new route
  const navigate = (path: string) => {
    // Update the browser history
    window.history.pushState(null, '', path)
    // Update our route state
    setRoute(path)
  }

  // Handler for path changes (back/forward buttons)
  const handlePopState = () => {
    console.log('Path changed to:', window.location.pathname)
    setRoute(window.location.pathname)
  }

  // Setup and cleanup listener
  onMount(() => {
    // Add to window for other components to use
    window.navigate = navigate

    // Set up listener for browser back/forward buttons
    window.addEventListener('popstate', handlePopState)

    // Initial route check
    const currentPath = window.location.pathname
    // If not at a known route, redirect to home
    if (currentPath !== '/' && currentPath !== '/connect4' && 
        !currentPath.startsWith('/connect4/game/') && 
        !currentPath.startsWith('/connect4/ai-vs-ai/') &&
        !currentPath.startsWith('/connect4/human-vs-ai/')) {
      // Reset to home
      navigate('/')
    }
  })

  onCleanup(() => {
    window.removeEventListener('popstate', handlePopState)
  })

  // Log route changes
  createEffect(() => {
    console.log('Route changed to:', route())
  })

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

  const [gameConfig] = createSignal<GameConfig>(createDefaultConfig())

  // Determine what to render based on the route
  const renderContent = () => {
    const currentRoute = route()

    // New specific routes for game modes
    if (currentRoute.startsWith('/connect4/human-vs-ai/')) {
      console.log('Rendering HumanAIPlay')
      return <HumanAIPlay gameConfig={gameConfig()} />
    } 
    else if (currentRoute.startsWith('/connect4/ai-vs-ai/')) {
      console.log('Rendering AivsAiPlay')
      return <AivsAiPlay gameConfig={gameConfig()} />
    }
    // Legacy route support
    else if (currentRoute.startsWith('/connect4/game/')) {
      // Detect mode from URL and render appropriate component
      // We'll assume human-vs-ai for legacy routes
      console.log('Rendering legacy game route as HumanAIPlay')
      return <HumanAIPlay gameConfig={gameConfig()} />
    } 
    else if (currentRoute === '/connect4') {
      console.log('Rendering PlayerSelection')
      return <PlayerSelection />
    } 
    else {
      console.log('Rendering HomePage')
      return <HomePage />
    }
  }

  // Force reevaluation on any route change
  const pathValue = route()
  console.log('Rendering with path:', pathValue)

  return <div style={{ 'min-height': '100vh' }}>{renderContent()}</div>
}

// Extend window object with navigate function
declare global {
  interface Window {
    navigate: (path: string) => void
  }
}

export default SimpleRoute