import { PluginContext, SearchResult, version, VOID_TRIGGER } from 'einstein'

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
	async search(_term: string, _trigger?: string): Promise<SearchResult[]> {
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
				quickActions: [
					{
						title: 'Print to console',
						event: {
							type: 'print',
							data: version,
						},
					},
					{
						title: 'Print base64',
						event: {
							type: 'print',
							data: Buffer.from(version).toString('base64'),
						},
					},
				],
			},
		]
	},
}

export default async ({ registerSearchEngine, registerEventHandler, loadConfig, saveConfig }: PluginContext<{
	latestVersion: string
	counter: number
}>) => {
	const config = await loadConfig()

	registerSearchEngine(searchEngine, ...searchEngine.triggers)
	registerSearchEngine(searchEngine2)

	registerEventHandler('print', (data: string) => {
		// eslint-disable-next-line no-console
		console.log(data)
	})

	config.counter = (config.counter ?? 0) + 1
	config.latestVersion = version

	await saveConfig(config)
}
