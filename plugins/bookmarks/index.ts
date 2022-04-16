import { PluginContext, PluginSetup } from 'einstein'

import ChromiumBookmarksSearchEngine from './BookmarksSearchEngine'

const setup: PluginSetup = async (context: PluginContext) => {
	const chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine({
		environment: context.app.environment
	})

	context.registerSearchEngine(chromiumBookmarksSearchEngine)
	context.registerEventHandler('openUrl', (data: any) => chromiumBookmarksSearchEngine.openBookmark(data))
}

export default setup
