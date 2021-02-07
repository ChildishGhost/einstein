const VOID_TRIGGER = ''

type Suggestion = {
	title: string
	description?: string
	icon?: string
}

type Hint = {
	title: string
	description?: string
	icon?: string
}

type SearchResult = {
	suggestions: Suggestion[]
	hint?: Hint
	completion?: string
}

interface ISearchEngine {
	readonly name: string
	readonly triggers: string[]
	search(term: string, trigger?: string): Promise<SearchResult>
}

export {
	VOID_TRIGGER,
	Suggestion,
	Hint,
	SearchResult,
	ISearchEngine,
}
