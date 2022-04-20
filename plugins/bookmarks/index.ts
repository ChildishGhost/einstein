import { PluginContext, PluginSetup } from 'einstein'

import { ChromiumBookmarksSearchEngine } from './ChromiumBookmarksSearchEngine'
import { openUrl } from './openUrl'

const setup: PluginSetup = async (context: PluginContext) => {
	const chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine(context)
	await chromiumBookmarksSearchEngine.waitReady()

	context.registerSearchEngine(chromiumBookmarksSearchEngine)
	context.registerEventHandler('openUrl', ({ url }: { url: string }) => {
		openUrl(context.app.environment.platform, url)
	})
}

export default setup
