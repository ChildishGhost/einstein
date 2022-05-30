import { PluginContext, PluginSetup, openUrl } from 'einstein'

import { ChromiumBookmarksSearchEngine } from './ChromiumBookmarksSearchEngine'

const setup: PluginSetup = async (context: PluginContext) => {
	const chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine(context)
	await chromiumBookmarksSearchEngine.waitReady()

	context.registerSearchEngine(chromiumBookmarksSearchEngine)
	context.registerEventHandler('openUrl', ({ url }: { url: string }) => {
		openUrl(url)
	})
}

export default setup
