import { ISearchEngine, PluginContext, SearchResult } from 'einstein'
import Fuse from 'fuse.js'

import { Bookmark } from './types'
import { findIcon } from './utils'

export default abstract class BookmarksSearchEngine implements ISearchEngine {
	private fuse: Fuse<Bookmark> = null

	private isReady: Promise<void>

	protected abstract loadBookmarks(): Bookmark[] | PromiseLike<Bookmark[]>

	// eslint-disable-next-line no-useless-constructor
	constructor(protected readonly context: PluginContext) {
		this.isReady = (async () => {
			const bookmarks = await this.loadBookmarks()

			this.fuse = new Fuse(bookmarks, {
				keys: [ 'name', 'url' ],
				includeScore: true,
				findAllMatches: true,
				threshold: 0.4,
			})
		})()
	}

	async waitReady() {
		await this.isReady
	}

	async search(term: string, _trigger?: string): Promise<SearchResult[]> {
		await this.isReady

		return this.fuse.search(term).map<SearchResult<Bookmark>>(({ item }) => ({
			id: JSON.stringify(item),
			title: item.name,
			description: item.url,
			icon: this.context.app.environment.platform === 'linux' ? findIcon('www') : `plugin://${this.context.metadata.uid}/link.svg`,
			completion: item.name,
			event: {
				type: 'openUrl',
				data: {
					name: item.name,
					url: item.url,
				},
			},
		}))
	}
}
