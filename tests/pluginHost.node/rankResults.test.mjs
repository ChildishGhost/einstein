import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import rankResults from '../../src/pluginHost.node/rankResults.ts'

const titles = (results) => results.map(({ title }) => title)

describe('RFC-0004/R5: results from all engines are ranked together', () => {
	it('RFC-0004/R5: results that do not match the query follow the matches in engine order, so no engine result is hidden', () => {
		const result = [ { title: 'zzz' }, { title: 'calculator' }, { title: 'qqq', description: 'www' } ]

		assert.deepEqual(titles(rankResults('calc', result)), [ 'calculator', 'zzz', 'qqq' ])
	})

	it('RFC-0004/R5: at most 10 results are shown, best matches first', () => {
		const result = [ ...Array.from({ length: 12 }, (_, i) => ({ title: `x${i}` })), { title: 'calculator' } ]

		const ranked = rankResults('calc', result)
		assert.equal(ranked.length, 10)
		assert.equal(ranked[0].title, 'calculator')
	})

	it('RFC-0004/R5: an empty query keeps engine order', () => {
		assert.deepEqual(titles(rankResults('', [ { title: 'b' }, { title: 'a' } ])), [ 'b', 'a' ])
	})
})
