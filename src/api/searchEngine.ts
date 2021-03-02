const VOID_TRIGGER = ''

type SearchResult<EventType = any> = {
	id: string
	title: string
	description?: string
	icon?: string
	completion?: string
	event?: {
		type: string
		data?: EventType
	}
}

interface ISearchEngine {
	search(term: string, trigger?: string): Promise<SearchResult[]>
}

export { VOID_TRIGGER, SearchResult, ISearchEngine }
