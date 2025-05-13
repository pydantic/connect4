import { Component } from 'solid-js'
import styles from './App.module.css'
import SimpleRoute from './SimpleRoute'

const App: Component = () => {
  console.log('App component rendering')

  return (
    <div class={styles.App}>
      <SimpleRoute />
    </div>
  )
}

export default App
