import { IPlugin, UID } from '@/api/plugin'

class PluginManager {
	private plugins: IPlugin[]

	private searchTriggers: Record<string, { pluginId: UID, engineName: string }[]>

	constructor() {
		this.plugins = []
		this.searchTriggers = {}
	}

	register(plugin: IPlugin) {
		if (this.plugins.find((({ uid }) => uid === plugin.uid))) {
			return // duplicated
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
						pluginId: uid,
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
			const results = await Promise.all(engines.map(({ pluginId, engineName }) => {
				const plugin = this.getPlugin(pluginId)
				if (!plugin) { return }

				const engine = plugin.searchEngines.find(({ name }) => name === engineName)
				if (!engine) { return }

				return engine.search(terms.join(' '), trigger)
			}))

			return results
		}

		// Option 2: terms...
	}

	getPlugin(uid: UID): IPlugin | undefined {
		return this.plugins.find(({ uid: id }) => id === uid)
	}
}

export default PluginManager
