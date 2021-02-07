import { BasePlugin } from "@/api/plugin";

const searchEngine = {
	get name() { return 'fooEngine' },
	get triggers() { return ['foo'] },
	async search(term: string, trigger?: string) {
		return {
			suggestions: [
				{
					title: 'bar',
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
		return [searchEngine]
	}
}
