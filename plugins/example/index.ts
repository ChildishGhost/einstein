import { PluginContext, VOID_TRIGGER } from 'einstein'

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
	triggers: [ VOID_TRIGGER ],
	async search(_term: string, _trigger?: string) {
		return [
			{
				title: 'foobar',
				description: 'type foo to use foo engine',
				id: '1',
			},
		]
	},
}

export default ({ registerSearchEngine }: PluginContext) => {
	registerSearchEngine(searchEngine, ...searchEngine.triggers)
	registerSearchEngine(searchEngine2, ...searchEngine2.triggers)
}
