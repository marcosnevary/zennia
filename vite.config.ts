import { svelte } from '@sveltejs/vite-plugin-svelte'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  test: {
    // old git worktrees live under .claude/worktrees and carry their own copies of the tests
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
