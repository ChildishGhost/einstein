import Fuse from 'fuse.js'

const SEARCH_LIMIT = 10

export default function rankResults<T extends { title: string; description?: string }>(term: string, result: T[]): T[] {
	const fuse = new Fuse(result, {
		keys: [ 'title', 'description' ],
		includeScore: true,
		findAllMatches: true,
		threshold: 1.0,
	})

	// Fuse drops what does not match at all; RFC-0004/R5 re-ranks without dropping, so those follow in engine order.
	const matched = term.length > 0 ? fuse.search(term).map(({ item }) => item) : []
	return [ ...matched, ...result.filter((item) => !matched.includes(item)) ].slice(0, SEARCH_LIMIT)
}
