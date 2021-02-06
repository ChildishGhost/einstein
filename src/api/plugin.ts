type SearchResult = {
	title: string,
	description?: string,
	icon?: string,
}

interface IPlugin {
	setup(): void

	searchHint(): Promise<SearchResult | void>
	searchTerm(): Promise<SearchResult[]>
}

abstract class BasePlugin implements IPlugin {
	setup() {}
	async searchHint() {}

	abstract searchTerm() : Promise<SearchResult[]>
}

export {
	IPlugin,
	BasePlugin,
	SearchResult,
}
