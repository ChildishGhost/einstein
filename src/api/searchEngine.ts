const VOID_TRIGGER = ''

type Suggestion = {
	id: string
	title: string
	description?: string
	icon?: string
	completion?: string
	event?: {
		name?: string
		data?: any
	}
}

type SearchResult = Suggestion[]

interface ISearchEngine {
	readonly name: string
	readonly triggers: string[]
	search(term: string, trigger?: string): Promise<SearchResult>
}

abstract class BaseSearchEngine implements ISearchEngine {
	abstract get name(): string

	abstract get triggers(): string[]

	async search(_term: string, _trigger?: string): Promise<SearchResult> {
		return []
	}
}

export {
	VOID_TRIGGER,
	Suggestion,
	SearchResult,
	ISearchEngine,
	BaseSearchEngine,
}
