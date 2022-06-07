import { PluginContext, SearchResult, VOID_TRIGGER, openUrl } from 'einstein'

type engine = {
	trigger: string,
	url: string,
	description: string,
}

// type for user configs
type Configs = {
	engines: engine[],
}

// note: ENGINES are configurable with user config
const ENGINES: engine[] = [
	// VOID_TRIGGER is used for the default search engine
	{ trigger: VOID_TRIGGER, url: 'https://duckduckgo.com/?q=%s', description: 'DuckDuckGo' },

	// default search engines
	{ trigger: 'g', url: 'https://www.google.com/search?hl=zh-TW&lr=lang_en%7Clang_zh-TW%7Clang_ja&q=%s', description: 'Google(en)' },
	{ trigger: 'github', url: 'https://github.com/search?q=%s&ref=opensearch', description: 'GitHub' },
	{ trigger: 'tw', url: 'https://itaigi.tw/k/%s', description: 'itaigi.tw' },
	{ trigger: 'q', url: 'https://www.qwant.com/?r=US&sr=en&l=en_gb&h=0&s=0&a=1&b=1&vt=1&hc=0&smartNews=1&theme=0&i=1&q=%s', description: 'Qwant' },
]

const openSearch = (e: engine, term: string, icon: string): SearchResult => {
	const url = e.url.replace('%s', term)
	return {
		id: e.trigger,
		title: `Open Search on ${e.description}`,
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
		id: e.trigger,
		title: `${e.trigger}: search on ${e.description}`,
		icon,
		completion: `${e.trigger} `,
	}
}

const searchEngine = {
	context: undefined as PluginContext<Configs>,

	triggers: Object.freeze(ENGINES.map((e) => e.trigger)),
	engines: ENGINES as engine[],

	async loadEnginesFromConfig() {
		const config = await this.context.loadConfig()

		if (config.engines ?? false) {
			this.engines = config.engines as engine[]
			this.triggers = Object.freeze(this.engines.map((e: engine) => e.trigger))
		}
	},

	async search(term: string, trigger?: string): Promise<SearchResult[]> {
		const result: SearchResult[] = []

		const icon = `plugin://${this.context.metadata.uid}/search.png`
		if (term.length > 0) {
			this.engines.forEach((e: engine) => {
				// populate the result array with the matched search engine trigger
				// in case of default search engine, also add hint for other available triggers
				if (e.trigger === trigger) {
					result.push(openSearch(e, term, icon))
				}
				if (trigger === VOID_TRIGGER && e.trigger.includes(term)) {
					result.push(hintSearch(e, icon))
				}
			})
		} else {
			// otherwise, return hint for available triggers
			// and add default search engine w/ search term = (incomplete) trigger
			this.engines.forEach((e: engine) => {
				if (e.trigger.includes(trigger)) {
					result.push(hintSearch(e, icon))
				} else if (e.trigger === VOID_TRIGGER) {
					result.push(openSearch(e, trigger, icon))
				}
			})
		}
		return result
	},
}

export default async (context: PluginContext<Configs>) => {
	searchEngine.context = context
	await searchEngine.loadEnginesFromConfig()
	context.registerSearchEngine(searchEngine, ...searchEngine.triggers)
	context.registerEventHandler('open-url', (data: any) => {
		openUrl(data)
	})
}
