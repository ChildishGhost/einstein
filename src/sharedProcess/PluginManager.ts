import { IPlugin, UID } from '@/api/plugin'
import { SearchResult, VOID_TRIGGER } from '@/api/searchEngine'

type TriggerPointer = { pluginUid: UID, engineName: string }

class PluginManager {
	private plugins: IPlugin[]

	private searchTriggers: Record<string, TriggerPointer[]>

	constructor() {
		this.plugins = []
		this.searchTriggers = {}
	}

	register(plugin: IPlugin): this {
		if (this.plugins.find((({ uid }) => uid === plugin.uid))) {
			return this // duplicated
		}
		this.plugins.push(plugin)

		return this
	}

	async setup() {
		await Promise.all(this.plugins.map((p) => p.setup()))

		this.plugins.forEach(({ uid, searchEngines }) => {
			searchEngines.forEach(({ name, triggers }) => {
				triggers.forEach((trigger) => {
					if (!this.searchTriggers[trigger]) {
						this.searchTriggers[trigger] = []
					}
					this.searchTriggers[trigger].push({
						pluginUid: uid,
						engineName: name,
					})
				})
			})
		})
	}

	async search(term: string) {
		const [ trigger, ...terms ] = term.split(' ')

		// Option 1: trigger' 'terms...
		const engines = this.searchTriggers[trigger]
		if (engines) {
			return this.performSearch(engines, terms.join(' '), trigger)
		}

		// Option 2: terms...
		const voidEngines = this.searchTriggers[VOID_TRIGGER]
		return this.performSearch(voidEngines, term)
	}

	getPlugin(uid: UID): IPlugin | undefined {
		return this.plugins.find(({ uid: id }) => id === uid)
	}

	private performSearch(engines: TriggerPointer[], term: string, trigger: string = VOID_TRIGGER) {
		return Promise.all(engines.reduce((acc, { pluginUid, engineName }) => {
			const plugin = this.getPlugin(pluginUid)
			if (!plugin) { return acc }

			const engine = plugin.searchEngines.find(({ name }) => name === engineName)
			if (!engine) { return acc }

			acc.push(engine.search(term, trigger))

			return acc
		}, [] as Promise<SearchResult>[])).then((acc) => acc.flat())
	}
}

export default PluginManager
