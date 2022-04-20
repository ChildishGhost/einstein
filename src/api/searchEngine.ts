const VOID_TRIGGER = ''

type QuickAction<EventType = any> = {
	title: string
	icon?: string
	event: {
		type: string
		data?: EventType
	}
}

type SearchResult<EventType = any, QuickActionEvent = EventType> = {
	id: string
	title: string
	description?: string
	icon?: string
	completion?: string
	event?: {
		type: string
		data?: EventType
	}
	quickActions?: QuickAction<QuickActionEvent>[]
}

interface ISearchEngine {
	search(term: string, trigger?: string): Promise<SearchResult[]>
}

export { VOID_TRIGGER, SearchResult, ISearchEngine, QuickAction }
