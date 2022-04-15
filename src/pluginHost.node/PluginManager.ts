import { join as joinPath } from 'path'

import {
	UID,
	WithPluginTagged,
	SearchResult,
	VOID_TRIGGER,
	PluginContext as APIContext,
	PluginDispose,
	ISearchEngine,
	PluginSetup,
	PluginEventHandler,
	EventType,
	AppContext,
} from 'einstein'
import { NodeVM } from 'vm2'

import { PluginMetadata } from '@/pluginHost.node/PluginMetadata'
import PluginScanner from '@/pluginHost.node/PluginScanner'

type Plugin = {
	metadata: PluginMetadata
	dispose?: PluginDispose
	eventHandlers: Record<string, Set<PluginEventHandler>>
}

type PluginContext = APIContext & {
	readonly eventHandlers: Record<string, Set<PluginEventHandler>>
}

async function loadScript({ path, entry }: PluginMetadata): Promise<PluginSetup> {
	const loadPath = path ? joinPath(path, entry) : entry
	const vm = new NodeVM({
		sandbox: {},
		compiler: 'javascript',
		require: {
			external: true,
			context: 'sandbox',
			// TODO(davy): remove dangerous node.js API
			builtin: [ '*' ],
			// eslint-disable-next-line camelcase
			customRequire: __non_webpack_require__,
			mock: {
				// eslint-disable-next-line global-require
				'fuse.js': require('fuse.js')
			},
		},
	})

	return vm.runFile(loadPath).default
}

const PluginUIDSymbol = Symbol('PluginUID')
type WithPluginUID<T> = T & {
	[PluginUIDSymbol]: UID
}
const applyPluginUID = <T>(obj: T, uid: UID): WithPluginUID<T> => {
	return Object.defineProperty(obj as unknown as WithPluginUID<T>, PluginUIDSymbol, {
		configurable: false,
		enumerable: false,
		value: uid,
	})
}
const hasPluginUID = <T>(obj: T): obj is WithPluginUID<T> => {
	return Object.prototype.hasOwnProperty.call(obj, PluginUIDSymbol)
}

class PluginManager {
	private plugins: Map<UID, Plugin> = new Map()

	private triggerMap: Map<string, Set<ISearchEngine>> = new Map([ [ VOID_TRIGGER, new Set() ] ])

	private pluginScanner = new PluginScanner()

	// eslint-disable-next-line no-useless-constructor
	constructor(private readonly app: AppContext) {
		//
	}

	async loadPlugins() {
		const metadataList = await this.pluginScanner.scan()

		await Promise.all(metadataList.map((metadata) => this.loadPlugin(metadata)))
	}

	private async loadPlugin(metadata: PluginMetadata) {
		try {
			const setup = await loadScript(metadata)
			const context = this.buildContext(metadata.uid)
			const dispose = (await setup(context)) || undefined

			this.plugins.set(metadata.uid, {
				metadata,
				dispose,
				eventHandlers: context.eventHandlers,
			})
		} catch (e) {
			console.log(e.message)
		}
	}

	async unloadPlugin(uid: UID) {
		const plugin = this.plugins.get(uid)
		if (!plugin) {
			return
		}

		if (plugin.dispose) {
			await plugin.dispose()
		}

		this.plugins.delete(uid)
	}

	private buildContext(uid: UID): PluginContext {
		const eventHandlers: Record<string, Set<PluginEventHandler>> = {}

		return {
			app: this.app,

			get eventHandlers() {
				return eventHandlers
			},

			registerEventHandler: (type: EventType, handler: PluginEventHandler) => {
				if (!eventHandlers[type]) {
					eventHandlers[type] = new Set()
				}

				eventHandlers[type]!.add(handler)
			},
			registerSearchEngine: (searchEngine: ISearchEngine, ...triggers: string[]) => {
				const engine = applyPluginUID(searchEngine, uid)

				if (triggers.length === 0) {
					this.addSearchEngineTrigger(VOID_TRIGGER, engine)
					return
				}

				triggers.forEach((trigger) => this.addSearchEngineTrigger(trigger, engine))
			},
			deregisterEventHandler: (type: EventType, handler: PluginEventHandler) => {
				eventHandlers[type]?.delete(handler)
			},
			deregisterSearchEngine: (searchEngine: ISearchEngine, ...triggers: string[]) => {
				if (triggers.length === 0) {
					this.removeSearchEngineTrigger(VOID_TRIGGER, searchEngine)
					return
				}

				triggers.forEach((trigger) => this.removeSearchEngineTrigger(trigger, searchEngine))
			},
		}
	}

	private addSearchEngineTrigger(trigger: string, searchEngine: WithPluginUID<ISearchEngine>) {
		if (!this.triggerMap.has(trigger)) {
			this.triggerMap.set(trigger, new Set())
		}

		this.triggerMap.get(trigger)!.add(searchEngine)
	}

	private removeSearchEngineTrigger(trigger: string, searchEngine: ISearchEngine) {
		this.triggerMap.get(trigger)?.delete(searchEngine)
	}

	async search(term: string) {
		const [ trigger, ...terms ] = term.split(' ')

		// Option 1: trigger' 'terms...
		const engines = this.triggerMap.get(trigger)
		if (engines) {
			return {
				trigger,
				term: terms.join(' '),
				result: await this.performSearch(engines, terms.join(' '), trigger),
			}
		}

		// Option 2: terms...
		const voidEngines = this.triggerMap.get(VOID_TRIGGER)
		return {
			trigger: VOID_TRIGGER,
			term,
			result: await this.performSearch(voidEngines, term),
		}
	}

	async notifyPlugin(uid: UID, type: string, data?: any) {
		const plugin = this.plugins.get(uid)
		if (!plugin) {
			return
		}

		const handlers = plugin.eventHandlers[type]
		if (!handlers) {
			return
		}

		await Promise.all(Array.from(handlers, (handler) => handler(data)))
	}

	private async performSearch(engines: Set<ISearchEngine>, term: string, trigger: string = VOID_TRIGGER) {
		const results = await Promise.all(
			Array.from(engines, async (engine) => {
				if (!hasPluginUID(engine)) {
					return []
				}

				const result = await engine.search(term, trigger)

				return result.map<WithPluginTagged<SearchResult>>((orig) => ({
					...orig,
					pluginUid: engine[PluginUIDSymbol],
				}))
			}),
		)

		return results.flat()
	}
}

export default PluginManager
