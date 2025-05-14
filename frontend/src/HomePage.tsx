import { Component } from 'solid-js'
import styles from './HomePage.module.css'
import {  A } from '@solidjs/router'

const HomePage: Component = () => {  

  return (
    <div class={styles.homeContainer}>
      <h1>Connect 4</h1>
      <div class={styles.buttonContainer}>
        <A href="/connect4" class={styles.button}>
          Play the game - Connect 4
        </A>
        <A href="https://example.com" target="_blank" rel="noopener noreferrer" class={styles.button}>
          See game traces in Logfire
        </A>
        <A href="#" class={styles.button}>
          Join the Prize Draw
        </A>
      </div>
    </div>
  )
}

export default HomePage
