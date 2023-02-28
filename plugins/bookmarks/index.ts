import { PluginContext, PluginSetup, openUrl } from 'einstein'

import { ChromiumBookmarksSearchEngine } from './ChromiumBookmarksSearchEngine'
import { Configs } from './types'

const setup: PluginSetup = async (context: PluginContext<Configs>) => {
	const chromiumBookmarksSearchEngine = new ChromiumBookmarksSearchEngine(context)
	await chromiumBookmarksSearchEngine.waitReady()

	context.registerSearchEngine(chromiumBookmarksSearchEngine)
	context.registerEventHandler('openUrl', ({ url }: { url: string }) => {
		openUrl(url)
	})
}

export default setup
