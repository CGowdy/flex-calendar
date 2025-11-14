<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">Flex Calendar</span>
      </RouterLink>

      <nav class="header-nav">
        <a
          class="nav-link"
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  font-size: 1.25rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--color-text);
}

.brand-mark::before {
  content: '📅';
  margin-right: 0.5rem;
}

.header-nav {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.nav-link {
  font-size: 0.875rem;
  color: var(--color-text);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background-color: var(--color-background-mute);
}

.app-main {
  flex: 1 1 auto;
  padding: 1.5rem;
  width: 100%;
  margin: 0;
  display: flex;
}

@media (max-width: 640px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .header-nav {
    width: 100%;
    justify-content: space-between;
  }

  .app-main {
    padding: 1rem;
  }
}
</style>
