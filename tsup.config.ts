import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  outDir: 'dist/cli',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'astro',
    '@astrojs/mdx',
    '@astrojs/react',
    '@astrojs/sitemap',
    '@astrojs/rss',
    'react',
    'react-dom',
    '@tailwindcss/vite',
    'tailwindcss',
    'sugar-high',
    'lucide-react',
    'zod-to-json-schema',
  ],
})
