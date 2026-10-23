import { defineConfig } from 'vitest/config';

// Relative base so the build works under any path (Vercel, GitHub Pages, a sub-path of the hub).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  // the kit's dist uses extensionless relative imports: let Vite resolve them so a test may import src/lab.ts
  test: { include: ['src/**/*.test.ts'], server: { deps: { inline: ['@onigam/lab-kit'] } } },
});
