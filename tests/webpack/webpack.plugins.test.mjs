import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { before, describe, it } from 'node:test'

const repo = join(import.meta.dirname, '../..')
const pluginsDir = join(repo, 'plugins')
const built = join(repo, 'dist/plugins')

const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => join(entry.parentPath, entry.name))

const withAssets = readdirSync(pluginsDir).filter((name) => existsSync(join(pluginsDir, name, 'assets')))

// Rebuilds the plugins only when the build is missing or older than its sources, so `npm test` stays fast.
const buildIsStale = () => {
	const sources = [ join(repo, 'webpack/webpack.plugins.js'), ...withAssets.flatMap((name) =>
		files(join(pluginsDir, name)).filter((path) => !path.includes('/node_modules/'))) ]
	return withAssets.some((name) => {
		const output = join(built, name, 'index.mjs')
		return !existsSync(output) || sources.some((path) => statSync(path).mtimeMs > statSync(output).mtimeMs)
	})
}

describe('RFC-0003/R12: built plugins serve plugin:// files at the paths their source uses', () => {
	before(() => {
		if (buildIsStale()) {
			execFileSync('npx', [ 'webpack', '--config-name', 'plugins', '--config-name', 'plugins:module' ], { cwd: repo, stdio: 'ignore' })
		}
	})

	it('RFC-0003/R12: every asset of a built-in plugin keeps its relative path in dist/plugins, so one plugin:// URL works on both hosts', () => {
		assert.ok(withAssets.length > 0)
		for (const name of withAssets) {
			for (const source of files(join(pluginsDir, name, 'assets'))) {
				const path = relative(join(pluginsDir, name), source)
				const output = join(built, name, path)
				assert.ok(existsSync(output), `dist/plugins/${name}/${path} is built`)
				assert.deepEqual(readFileSync(output), readFileSync(source))
			}
		}
	})
})
