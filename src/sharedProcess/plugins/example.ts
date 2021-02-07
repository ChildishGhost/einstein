import { BasePlugin } from '@/api/plugin'
import { VOID_TRIGGER } from '@/api/searchEngine'

const searchEngine = {
	name: 'fooEngine',
	triggers: [ VOID_TRIGGER, 'foo' ],
	async search(_term: string, _trigger?: string) {
		return {
			suggestions: [
				{
					title: 'bar',
				},
			],
		}
	},
}

const searchEngine2 = {
	name: 'voidEngine',
	triggers: [ VOID_TRIGGER ],
	async search(_term: string, _trigger?: string) {
		return {
			suggestions: [
				{
					title: 'foobar',
					description: 'type foo to use foo engine',
				},
			],
		}
	},
}

export default class ExamplePlugin extends BasePlugin {
	get uid() {
		return 'example'
	}

	get searchEngines() {
		return [ searchEngine, searchEngine2 ]
	}
}
