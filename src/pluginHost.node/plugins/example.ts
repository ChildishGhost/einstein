import { BasePlugin } from '@/api/plugin'
import { ISearchEngine, VOID_TRIGGER } from '@/api/searchEngine'

const searchEngine: ISearchEngine = {
	name: 'fooEngine',
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

const searchEngine2: ISearchEngine = {
	name: 'voidEngine',
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

export default class ExamplePlugin extends BasePlugin {
	readonly uid = 'example'

	readonly searchEngines = [ searchEngine, searchEngine2 ]
}
