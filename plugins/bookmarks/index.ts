import { PluginContext, PluginSetup } from 'einstein'

import ChromiumBookmarksSearchEngine from './BookmarksSearchEngine'

const setup: PluginSetup = async (context: PluginContext) => {
	const chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine()

	context.registerSearchEngine(chromiumBookmarksSearchEngine)
	context.registerEventHandler('linux', (data: any) => chromiumBookmarksSearchEngine.openBookmark(data))
}

export default setup
