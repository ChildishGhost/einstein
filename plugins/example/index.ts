import { PluginContext, version, VOID_TRIGGER } from 'einstein'

const searchEngine = {
	triggers: [ VOID_TRIGGER, 'foo' ],
	async search(_term: string, _trigger?: string) {
		return [
			{
				title: 'bar',
				description: 'aaa',
				id: '1',
			},
			{
				title: 'buz',
				description: 'aab',
				id: '2',
			},
			{
				title: 'yolo',
				description: 'abc',
				id: '3',
			},
		]
	},
}

const searchEngine2 = {
	async search(_term: string, _trigger?: string) {
		return [
			{
				title: 'foobar',
				description: 'type foo to use foo engine',
				id: '1',
			},
			{
				title: 'einstein-version',
				description: version,
				id: '2',
			},
		]
	},
}

export default async ({ registerSearchEngine, loadConfig, saveConfig }: PluginContext<{
	latestVersion: string
	counter: number
}>) => {
	const config = await loadConfig()

	registerSearchEngine(searchEngine, ...searchEngine.triggers)
	registerSearchEngine(searchEngine2)

	config.counter = (config.counter ?? 0) + 1
	config.latestVersion = version

	await saveConfig(config)
}
