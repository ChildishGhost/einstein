/// <reference lib="deno.worker" />
import Module, { createRequire } from 'node:module'
import { toFileUrl } from '@std/path'
import * as CommentJSON from 'comment-json'
import * as einstein from 'einstein'
import Fuse from 'fuse.js'

import type { AppContext, ISearchEngine, PluginEventHandler, PluginMetadata, PluginSetup } from '../api/index.ts'

export type Entry = { path: string; format: 'module' | 'main' }

export type HostMessage =
	| { type: 'load'; metadata: PluginMetadata; entry: Entry; app: AppContext; configPath: string }
	| { type: 'search'; id: number; engine: number; term: string; trigger: string }
	| { type: 'event'; id: number; eventType: string; data?: unknown }

export type WorkerMessage =
	| { type: 'loaded'; error?: string }
	| { type: 'register' | 'deregister'; engine: number; triggers: string[] }
	| { type: 'result'; id: number; result?: unknown; error?: string }

const post = (message: WorkerMessage) => self.postMessage(message)

/** CommonJS plugins get the same modules through `require` as ES module plugins through the import map. */
const loadMain = (path: string) => {
	const modules: Record<string, unknown> = { einstein, 'fuse.js': Fuse }
	// deno-lint-ignore no-explicit-any
	const loader = Module as any
	const load = loader._load
	loader._load = function (request: string, ...rest: unknown[]) {
		return request in modules ? modules[request] : load.call(this, request, ...rest)
	}
	return createRequire(path)(path)
}

const loadSetup = async ({ path, format }: Entry): Promise<PluginSetup> =>
	(format === 'module' ? await import(toFileUrl(path).href) : loadMain(path)).default

const engines = new Map<number, ISearchEngine>()
const engineIds = new Map<ISearchEngine, number>()
const eventHandlers: Record<string, Set<PluginEventHandler>> = {}

const engineId = (engine: ISearchEngine) => {
	if (!engineIds.has(engine)) {
		engineIds.set(engine, engineIds.size)
		engines.set(engineIds.size - 1, engine)
	}
	return engineIds.get(engine)!
}

const buildContext = (metadata: PluginMetadata, app: AppContext, configPath: string) => ({
	app,
	metadata,
	registerEventHandler(type: string, handler: PluginEventHandler) {
		;(eventHandlers[type] ??= new Set()).add(handler)
	},
	deregisterEventHandler(type: string, handler: PluginEventHandler) {
		eventHandlers[type]?.delete(handler)
	},
	registerSearchEngine(engine: ISearchEngine, ...triggers: string[]) {
		post({ type: 'register', engine: engineId(engine), triggers: triggers.length ? triggers : [einstein.VOID_TRIGGER] })
	},
	deregisterSearchEngine(engine: ISearchEngine, ...triggers: string[]) {
		if (!engineIds.has(engine)) return
		post({
			type: 'deregister',
			engine: engineId(engine),
			triggers: triggers.length ? triggers : [einstein.VOID_TRIGGER],
		})
	},
	async loadConfig() {
		try {
			return CommentJSON.parse(await Deno.readTextFile(configPath))
		} catch (error) {
			console.log(`Failed to read or parse file ${configPath}: ${(error as Error).message}`)
			return {}
		}
	},
	async saveConfig(config: unknown) {
		await Deno.writeTextFile(configPath, CommentJSON.stringify(config, null, 2))
	},
})

const answer = async (id: number, run: () => unknown) => {
	try {
		post({ type: 'result', id, result: await run() })
	} catch (error) {
		post({ type: 'result', id, error: (error as Error)?.message ?? String(error) })
	}
}

self.addEventListener('message', async ({ data }: MessageEvent<HostMessage>) => {
	switch (data.type) {
		case 'load':
			try {
				const setup = await loadSetup(data.entry)
				// The dispose function is kept by nobody yet: plugins are not unloaded while the host runs.
				await setup(buildContext(data.metadata, data.app, data.configPath) as never)
				post({ type: 'loaded' })
			} catch (error) {
				post({ type: 'loaded', error: (error as Error)?.message ?? String(error) })
			}
			break
		case 'search':
			await answer(data.id, () => engines.get(data.engine)?.search(data.term, data.trigger) ?? [])
			break
		case 'event':
			await answer(
				data.id,
				async () =>
					void (await Promise.all(Array.from(eventHandlers[data.eventType] ?? [], (handler) => handler(data.data)))),
			)
			break
	}
})
