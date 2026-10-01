import { homedir } from 'node:os'
import { fromFileUrl, join } from '@std/path'

import type { PluginMetadata } from '../api/index.ts'
import type { Entry } from './worker.ts'

export type ScannedPlugin = { metadata: PluginMetadata; entry: Entry }

export const userDataPath = () => join(homedir(), '.config', 'einstein')

/** Built-in, system and user roots, in that order (RFC-0003/R1). */
const roots = () => [
	fromFileUrl(new URL('../../plugins/', import.meta.url)),
	'/usr/share/einstein/plugins',
	join(userDataPath(), 'plugins'),
]

// The example is only built on request (RFC-0005/R21); run from the source tree, it would answer every search.
const skipped = (root: string, name: string) =>
	root === roots()[0] && name === 'example' && !Deno.env.get('BUILD_EXAMPLE_PLUGIN')

/** The entry is `module`, falling back to `main` (RFC-0008/R18). */
const readPlugin = async (path: string): Promise<ScannedPlugin> => {
	let manifest: Record<string, unknown>
	try {
		manifest = JSON.parse(await Deno.readTextFile(join(path, 'package.json')))
	} catch (error) {
		throw new Error(`Invalid plugin package.json in ${path}: ${(error as Error).message}`)
	}
	const { name, uid, main, module } = manifest
	if (typeof name !== 'string' || !name) throw new Error(`Missing required field: "name" in ${path}`)
	if (typeof uid !== 'string' || !uid) throw new Error(`Missing required field: "uid" in ${path}`)
	const entry: Entry | undefined = typeof module === 'string' && module
		? { path: join(path, module), format: 'module' }
		: typeof main === 'string' && main
		? { path: join(path, main), format: 'main' }
		: undefined
	if (!entry) throw new Error(`Missing required field: "main" or "module" in ${path}`)
	return { metadata: { name, uid, path }, entry }
}

const scanRoot = async (root: string) => {
	const paths: string[] = []
	try {
		for await (const { name, isDirectory } of Deno.readDir(root)) {
			if (isDirectory && !skipped(root, name)) paths.push(join(root, name))
		}
	} catch (error) {
		console.log(`Unable to readdir: ${root}, reason: ${(error as Error).message}`)
		return []
	}
	return Promise.all(paths.map((path) =>
		readPlugin(path).catch((error) => {
			console.log(error.message)
			return undefined
		})
	))
}

/** Every valid plugin; invalid ones and unreadable roots are logged and skipped (RFC-0003/R2). */
export const scanPlugins = async () =>
	(await Promise.all(roots().map(scanRoot))).flat().filter((plugin): plugin is ScannedPlugin => plugin !== undefined)
