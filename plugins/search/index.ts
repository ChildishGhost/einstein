import { PluginContext, SearchResult, VOID_TRIGGER, spawn } from 'einstein'

// trigger, url, description
type engine = [string, string, string]
const ENGINES: engine[] = [
	// VOID_TRIGGER is used for the default search engine
	[ VOID_TRIGGER, 'https://duckduckgo.com/?q=%s','DuckDuckGo' ],

	// default search engines
	[ 'g', 'https://www.google.com/search?hl=zh-TW&lr=lang_en%7Clang_zh-TW%7Clang_ja&q=%s', 'Google(en)' ],
	[ 'github', 'https://github.com/search?q=%s&ref=opensearch', 'GitHub' ],
	[ 'tw', 'https://itaigi.tw/k/%s', 'itaigi.tw' ],
	[ 'q', 'https://www.qwant.com/?r=US&sr=en&l=en_gb&h=0&s=0&a=1&b=1&vt=1&hc=0&smartNews=1&theme=0&i=1&q=%s', 'Qwant' ],
]

const openSearch = (e:engine, term: string, icon: string): SearchResult => {
	const url = e[1].replace('%s', term)
	return {
		id: e[0],
		title: `Open Search on ${e[2]}`,
		description: url,
		icon,
		event: {
			type: 'open-url',
			data: url,
		},
	}
}

const hintSearch = (e:engine, icon: string): SearchResult => {
	return {
		id: e[0],
		title: `${e[0]}: search on ${e[2]}`,
		icon,
		completion: `${e[0]} `,
	}
}

const searchEngine = {
	triggers: Object.freeze(ENGINES.map(e => e[0])),
	context: undefined as PluginContext,

	async search(term: string, trigger?: string): Promise<SearchResult[]> {
		const result: SearchResult[] = []

		const icon = `plugin://${this.context.metadata.uid}/search.png`
		if (term.length > 0) {
			ENGINES.forEach(e => {
				// populate the result array with the matched search engine trigger
				// in case of default search engine, also add hint for other available triggers
				if (e[0] === trigger) {
					result.push(openSearch(e, term, icon))
				}
				if (trigger === VOID_TRIGGER && e[0].includes(term)) {
					result.push(hintSearch(e, icon))
				}
			})
		} else {
			// otherwise, return hint for available triggers
			// and add default search engine w/ search term = (incomplete) trigger
			ENGINES.forEach(e => {
				if (e[0].includes(trigger)) {
					result.push(hintSearch(e, icon))
				} else if (e[0] === VOID_TRIGGER) {
					result.push(openSearch(e, trigger, icon))
				}
			})
		}
		return result
	},
}

export default (context: PluginContext) => {
	searchEngine.context = context
	context.registerSearchEngine(searchEngine, ...searchEngine.triggers)
	context.registerEventHandler('open-url', (data: any) => {
		spawn(`xdg-open '${data}'`)
	})
}
