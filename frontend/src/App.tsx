import { Component } from 'solid-js'
import { Router, Route, useParams } from '@solidjs/router'
import styles from './App.module.css'
import HomePage from './HomePage'
import PlayerSelection from './PlayerSelection'
import HumanAIPlay from './HumanAIPlay'
import AiVsAiPlay from './AivsAiPlay'
import { Layout } from './layout'
import { ClientInstrumentationProvider } from './Instrumentation'

const App: Component = () => {
  return (
    <ClientInstrumentationProvider>
      <Layout>
        <div class={styles.App}>
          <Router>
            <Route path="/" component={HomePage} />
            <Route path="/connect4" component={PlayerSelection} />
            <Route path="/connect4/human-vs-ai/:gameId" component={HumanAIPlay} />
            <Route path="/connect4/ai-vs-ai/:gameId" component={AiVsAiPlay} />
          </Router>
        </div>
      </Layout>
    </ClientInstrumentationProvider>
  )
}

export default App
