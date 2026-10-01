// Bundles the launcher window with the gpui-native Vue renderer (RFC-0008/R9, R20).
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import { keyStop } from './vite/keyStop.ts'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

if (!existsSync(path('node_modules/@gpui-native/vue'))) {
	throw new Error('@gpui-native/vue is not installed: run `deno task native:build` and `deno task install:ui` first')
}

export default defineConfig({
	plugins: [vue({ template: { compilerOptions: { nodeTransforms: [keyStop] } } })],
	// Library mode keeps `process.env.NODE_ENV`, which the UI process has no permission to read.
	define: { 'process.env.NODE_ENV': JSON.stringify('production') },
	// One Vue runtime, shared by Einstein's components and gpui-native's renderer.
	resolve: { dedupe: ['@vue/runtime-core'] },
	build: {
		target: 'esnext',
		outDir: path('dist/'),
		emptyOutDir: true,
		sourcemap: true,
		lib: { entry: path('window.ts'), formats: ['es'], fileName: 'window' },
		rollupOptions: { external: [/^node:/] },
	},
})
