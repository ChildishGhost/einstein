import { WithPluginTagged } from '@/api/plugin'
import { SearchResult } from '@/api/searchEngine'

type PerformSearchReply = {
	term: string
	result: WithPluginTagged<SearchResult>[]
}

export default PerformSearchReply
