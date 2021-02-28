import { BasePlugin } from '@/api/plugin'
import ChromiumBookmarksSearchEngine from '@/pluginHost.node/plugins/bookmarks/BookmarksSearchEngine'

export default class BookmarksPlugin extends BasePlugin {
	readonly uid = 'tw.childish.einstein.plugin.bookmarks'

	private chromiumBookmarksSearchEngine: ChromiumBookmarksSearchEngine = null

	async setup() {
		this.chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine()
	}

	onEvent(type: string, data?: any) {
		switch (type) {
		case 'linux':
			return this.chromiumBookmarksSearchEngine.openBookmark(data)
		default:
		}

		return Promise.resolve()
	}

	get searchEngines() {
		return [ this.chromiumBookmarksSearchEngine ]
	}
}
