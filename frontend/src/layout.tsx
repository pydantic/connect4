import { Component, JSX } from 'solid-js'
import { PydanticLogo } from './icons/pydantic-logo'
import styles from './layout.module.css'

export const Layout: Component<{ children: JSX.Element }> = ({ children }) => {
  return (
    <section class={styles.layout}>
      <main>{children}</main>
      <footer class={styles.footer}>
        <a href="https://pydantic.dev" target="_blank" rel="noopener noreferrer">
          <PydanticLogo />
          <span>Pydantic</span>
        </a>
      </footer>
    </section>
  )
}
