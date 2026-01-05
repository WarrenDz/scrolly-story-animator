import { defineConfig } from 'vite'

export default defineConfig({
  base: '/scrolly-story-animator/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        map: 'map/map.html'
      }
    }
  }
})