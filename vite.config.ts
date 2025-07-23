// vite.config.ts
import { defineConfig } from 'vite'
import templatrPlugin from './vite-plugin-templatr'

export default defineConfig({
	plugins: [templatrPlugin()],
	assetsInclude: ['**/*.hway'],
})
