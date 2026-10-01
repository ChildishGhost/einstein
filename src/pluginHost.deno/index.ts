import { homedir } from 'node:os'
import { join } from '@std/path'
import Fuse from 'fuse.js'

import type { AppContext, SearchResult, WithPluginTagged } from '../api/index.ts'
import { connectMessageTunnel } from '../common/message/ProcessMessageProtocol.deno.ts'
import type PerformSearch from '../common/types/PerformSearch.ts'
import type PluginEvent from '../common/types/PluginEvent.ts'
import { handleBrokerRequest, isBrokerRequest } from './broker.ts'
import { resolvePluginFile } from './resolvePluginFile.ts'
import { type ScannedPlugin, scanPlugins, userDataPath } from './scan.ts'
import type { HostMessage, WorkerMessage } from './worker.ts'

const SEARCH_LIMIT = 10
const VOID_TRIGGER = ''

type LoadedPlugin = { path: string; request: (message: HostMessage & { id: number }) => Promise<unknown> }
type Engine = { uid: string; engine: number }

const platforms: Partial<Record<typeof Deno.build.os, AppContext['environment']['platform']>> = {
	linux: 'linux',
	darwin: 'macos',
	windows: 'windows',
}
const app: AppContext = { environment: { platform: platforms[Deno.build.os] ?? 'other', homedir: homedir() } }
const configDir = join(userDataPath(), 'config')

const plugins = new Map<string, LoadedPlugin>()
const triggers = new Map<string, Engine[]>([[VOID_TRIGGER, []]])
let nextId = 0

/** Starts `plugin` in its own Worker (RFC-0008/R16); resolves once its setup has run, or failed. */
const loadPlugin = ({ metadata, entry }: ScannedPlugin) =>
	new Promise<void>((resolve) => {
		const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: metadata.uid })
		const pending = new Map<number, (message: WorkerMessage & { type: 'result' }) => void>()
		const fail = (message: string) => {
			console.log(`Plugin ${metadata.uid} failed: ${message}`)
			resolve()
		}
		worker.addEventListener('error', (event) => {
			event.preventDefault()
			fail(event.message)
		})
		worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
			if (isBrokerRequest(data)) return handleBrokerRequest(data)
			switch (data.type) {
				case 'loaded':
					if (data.error) return fail(data.error)
					plugins.set(metadata.uid, {
						path: metadata.path,
						request: (message) =>
							new Promise((settle) => {
								pending.set(message.id, ({ result, error }) => {
									if (error) console.log(`Plugin ${metadata.uid} failed on ${message.type}: ${error}`)
									settle(result)
								})
								worker.postMessage(message)
							}),
					})
					return resolve()
				case 'register':
					data.triggers.forEach((trigger) => {
						const engines = triggers.get(trigger) ?? []
						triggers.set(trigger, engines)
						if (!engines.some(({ uid, engine }) => uid === metadata.uid && engine === data.engine)) {
							engines.push({ uid: metadata.uid, engine: data.engine })
						}
					})
					return
				case 'deregister':
					data.triggers.forEach((trigger) => {
						const engines = triggers.get(trigger)
						const index = engines?.findIndex(({ uid, engine }) => uid === metadata.uid && engine === data.engine)
						if (engines && index !== undefined && index >= 0) engines.splice(index, 1)
					})
					return
				case 'result':
					pending.get(data.id)?.(data)
					pending.delete(data.id)
			}
		})
		const configPath = join(configDir, `${metadata.uid}.config.json`)
		worker.postMessage({ type: 'load', metadata, entry, app, configPath } satisfies HostMessage)
	})

const performSearch = async (engines: Engine[], term: string, trigger: string) =>
	(await Promise.all(engines.map(async ({ uid, engine }) => {
		const result = await plugins.get(uid)?.request({ type: 'search', id: nextId++, engine, term, trigger })
		return Array.isArray(result)
			? result.map((item: SearchResult): WithPluginTagged<SearchResult> => ({ ...item, pluginUid: uid }))
			: []
	}))).flat()

/** Trigger routing of RFC-0003/R10. */
const search = async (query: string) => {
	const [trigger, ...terms] = query.split(' ')
	const engines = triggers.get(trigger)
	if (engines) {
		return { term: terms.join(' '), result: await performSearch(engines, terms.join(' '), trigger) }
	}
	return { term: query, result: await performSearch(triggers.get(VOID_TRIGGER)!, query, VOID_TRIGGER) }
}

process.on('message', (message: unknown) => {
	if ((message as { type?: unknown } | null)?.type === 'pluginHost:exit') {
		process.exit()
	}
})

const tunnel = await connectMessageTunnel('pluginHost')

Deno.mkdirSync(configDir, { recursive: true })
await Promise.all((await scanPlugins()).map(loadPlugin))

tunnel.register<{ uid: string; path: string }>('plugin:filePath', async (data) => {
	const { uid, path } = data!
	const plugin = plugins.get(uid)
	const filePath = plugin && typeof path === 'string' ? await resolvePluginFile(plugin.path, path) : undefined
	tunnel.sendMessage('plugin:filePath', filePath ? { uid, path, filePath } : { uid, path })
})

tunnel.register<PerformSearch>('plugin:performSearch', async (data) => {
	const rawTerm = data!.term
	const { term, result } = await search(rawTerm.trim())
	const fuse = new Fuse(result, {
		keys: ['title', 'description'],
		includeScore: true,
		findAllMatches: true,
		threshold: 1.0,
	})
	// Fuse drops what does not match at all; RFC-0004/R5 re-ranks without dropping, so those follow in engine order.
	const matched = term.length > 0 ? fuse.search(term).map(({ item }) => item) : []
	const ranked = [...matched, ...result.filter((item) => !matched.includes(item))].slice(0, SEARCH_LIMIT)
	tunnel.sendMessage('plugin:performSearch:reply', { term: rawTerm, result: ranked })
})

tunnel.register<PluginEvent>('plugin:event', async (event) => {
	const { pluginUid, type, data } = event!
	await plugins.get(pluginUid)?.request({ type: 'event', id: nextId++, eventType: type, data })
})

tunnel.sendMessage('plugin:initialized')
