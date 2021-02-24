import { WithPluginTagged, SearchResult } from 'einstein'

type PerformSearchReply = {
	term: string
	result: WithPluginTagged<SearchResult>[]
}

export default PerformSearchReply
