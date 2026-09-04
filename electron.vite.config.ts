import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

const sharedAlias = {
  '@shared': resolve('src/shared')
}

export default defineConfig({
  main: {
    build: {
      target: 'node24.19'
    },
    resolve: {
      alias: sharedAlias
    }
  },
  preload: {
    build: {
      target: 'node24.19'
    },
    resolve: {
      alias: sharedAlias
    }
  },
  renderer: {
    build: {
      target: 'chrome152'
    },
    resolve: {
      alias: {
        ...sharedAlias,
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      UnoCSS(),
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler']
        }
      })
    ]
  }
})
