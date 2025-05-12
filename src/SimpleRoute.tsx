import { Component, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import PlayerSelection from './PlayerSelection';
import GameBoard from './GameBoard';
import { GameConfig, GameMode, PlayerType, PlayerColor, AIModel } from './game-types';

const SimpleRoute: Component = () => {
  console.log("SimpleRoute component rendering");
  
  // Create state for current route
  const [route, setRoute] = createSignal(window.location.hash);
  
  // Handler for hash changes
  const handleHashChange = () => {
    console.log("Hash changed to:", window.location.hash);
    setRoute(window.location.hash);
  };
  
  // Setup and cleanup listener
  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
  });
  
  onCleanup(() => {
    window.removeEventListener('hashchange', handleHashChange);
  });
  
  // Log route changes
  createEffect(() => {
    console.log("Route changed to:", route());
  });
  
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
    }
  });
  
  // Determine what to render based on the route
  const isGameRoute = () => {
    const result = route().includes('/game/');
    console.log("isGameRoute() evaluation:", route(), "result:", result);
    return result;
  };
  const [gameConfig] = createSignal<GameConfig>(createDefaultConfig());
  
  const renderContent = () => {
    if (isGameRoute()) {
      console.log("Rendering GameBoard");
      return <GameBoard gameConfig={gameConfig()} />;
    } else {
      console.log("Rendering PlayerSelection");
      return <PlayerSelection />;
    }
  };
  
  // Force reevaluation on any route change
  const hashValue = route();
  console.log("Rendering with hash:", hashValue);
  
  return (
    <div style={{ "min-height": "100vh" }}>
      {renderContent()}
    </div>
  );
};

export default SimpleRoute;