import { PluginContext, PluginSetup } from 'einstein'

import PassSearchEngine from '@/pluginHost.node/plugins/pass/PassSearchEngine'

const setup: PluginSetup = async (context: PluginContext) => {
	const searchEngine = new PassSearchEngine()

	context.registerSearchEngine(searchEngine, ...PassSearchEngine.triggers)
	context.registerEventHandler('pass', (data: any) => searchEngine.copyPassword(data))
	context.registerEventHandler('pass show', (data: any) => searchEngine.showPasswordQR(data))
}

export default setup
