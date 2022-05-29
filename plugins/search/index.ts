import { PluginContext, SearchResult, VOID_TRIGGER } from 'einstein'

import { exec, findIcon } from './utils'

const ENGINES = [
	// trigger, url, description

	// VOID_TRIGGER is used for the default search engine
  [ VOID_TRIGGER, 'https://duckduckgo.com/?q=%s','DuckDuckGo' ],

	// default search engines
  [ 'g', 'https://www.google.com/search?hl=zh-TW&lr=lang_en%7Clang_zh-TW%7Clang_ja&q=%s', 'Google(en)' ],
  [ 'github', 'https://github.com/search?q=%s&ref=opensearch', 'GitHub' ],
  [ 'tw', 'https://itaigi.tw/k/%s', 'itaigi.tw' ],
  [ 'q', 'https://www.qwant.com/?r=US&sr=en&l=en_gb&h=0&s=0&a=1&b=1&vt=1&hc=0&smartNews=1&theme=0&i=1&q=%s', 'Qwant' ],
]

const searchEngine = {
	triggers: Object.freeze(ENGINES.map(e => e[0])),

	async search(term: string, trigger?: string): Promise<SearchResult[]> {
		const result: SearchResult[] = []
		if (term.length > 0) {
			// populate the result array with search engine urls
			ENGINES.filter(e => e[0] === trigger).forEach(e => {
				const url = e[1].replace('%s', term)
				result.push({
					id: e[0],
					title: `Open Search on ${e[2]}`,
					description: url,
					icon: findIcon('www'),
					event: {
						type: 'open-url',
						data: url,
					},
				})
			})
		} else {
			// otherwise, return available search engine triggers
			ENGINES.filter(e => e[0].includes(trigger)).forEach(e => {
				result.push({
					id: e[0],
					title: `${e[0]}: search on ${e[2]}`,
					icon: findIcon('www'),
				})
			})
		}
		return result
	},
}

export default (context: PluginContext) => {
	context.registerSearchEngine(searchEngine, ...searchEngine.triggers)
	context.registerEventHandler('open-url', (data: any) => {
		exec(`xdg-open '${data}'`)
	})
}
