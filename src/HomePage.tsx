import { Component } from "solid-js";
import styles from "./HomePage.module.css";

const HomePage: Component = () => {
  const navigateTo = (path: string) => {
    // Use the navigate function we added to window in SimpleRoute
    window.navigate(path);
  };

  return (
    <div class={styles.homeContainer}>
      <h1>Connect Four</h1>
      <div class={styles.buttonContainer}>
        <a
          href="/connect4"
          onClick={() => navigateTo("/connect4")}
          class={styles.button}
        >
          Play Connect Four
        </a>
        <a
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          class={styles.button}
        >
          See Connect Four Traces
        </a>
        <a href="#" class={styles.button} onClick={(e) => e.preventDefault()}>
          Join Prize Draw
        </a>
      </div>
    </div>
  );
};

export default HomePage;
