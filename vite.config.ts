import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter({ fallback: "index.html" }),
      // the usage log records the commit each session ran; Vercel sets it at build time
      version: { name: process.env.VERCEL_GIT_COMMIT_SHA },
    }),
  ],
  test: {
    // old git worktrees live under .claude/worktrees and carry their own copies of the tests
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
});
