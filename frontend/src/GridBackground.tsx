import { Component, JSX } from 'solid-js'
import styles from './GridBackground.module.css'

interface GridBackgroundProps {
  children: JSX.Element
}

const GridBackground: Component<GridBackgroundProps> = (props) => {
  return (
    <div class={styles.gridContainer}>
      <div class={styles.gridLines}>
        <div></div> {/* Top horizontal line */}
        <div></div> {/* Bottom horizontal line */}
      </div>
      {props.children}
    </div>
  )
}

export default GridBackground
