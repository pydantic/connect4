import { Component, JSX } from 'solid-js'
import { PydanticLogo } from './icons/pydantic-logo'
import styles from './layout.module.css'
import GridBackground from './GridBackground'

export const Layout: Component<{ children: JSX.Element }> = ({ children }) => {
  return (
    <GridBackground>
      <section class={styles.layout}>
        <main class={styles.content}>{children}</main>
        <footer class={styles.footer}>
          <a href="https://pydantic.dev" target="_blank" rel="noopener noreferrer">
            <PydanticLogo />
            <span>Pydantic</span>
          </a>
        </footer>
      </section>
    </GridBackground>
  )
}
