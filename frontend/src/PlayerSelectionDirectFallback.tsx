import { Component } from 'solid-js'

const PlayerSelectionDirectFallback: Component = () => {
  // This is a simplified version without hooks for extreme fallback cases
  console.log('Rendering fallback selection component')

  return (
    <div
      style={{
        'text-align': 'center',
        padding: '2rem',
        'max-width': '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ color: '#333', 'margin-bottom': '2rem' }}>Connect Four</h1>

      <div
        style={{
          'background-color': '#ffffff',
          'border-radius': '10px',
          padding: '2rem',
          width: '100%',
          'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2 style={{ 'margin-top': '0', color: '#333', 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
          Game Setup
        </h2>

        <p style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
          Direct fallback component for troubleshooting. This appears when the main component fails to load.
        </p>

        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'center', 'margin-bottom': '2rem' }}>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              border: '2px solid #9BFCDA',
              'background-color': '#9BFCDA',
              color: '#1A0312',
              'border-radius': '8px',
              'font-size': '1rem',
              'font-weight': 'bold',
              cursor: 'pointer',
            }}
          >
            Human vs AI
          </button>

          <button
            style={{
              padding: '0.75rem 1.5rem',
              border: '2px solid #9BFCDA',
              color: '#9BFCDA',
              'border-radius': '8px',
              'font-size': '1rem',
              'font-weight': 'bold',
              cursor: 'pointer',
            }}
          >
            AI vs AI
          </button>
        </div>

        <button
          style={{
            display: 'block',
            width: '100%',
            padding: '1rem',
            'background-color': '#2a9d4e',
            color: 'white',
            border: 'none',
            'border-radius': '8px',
            'font-size': '1.1rem',
            'font-weight': 'bold',
            cursor: 'pointer',
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

export default PlayerSelectionDirectFallback
