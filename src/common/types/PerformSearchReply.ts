import { SearchResult } from '@/api/searchEngine'

type PerformSearchReply = {
	term: string
	result: SearchResult[]
}

export default PerformSearchReply
