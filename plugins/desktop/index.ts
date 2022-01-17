import { PluginContext, PluginSetup } from 'einstein'

import DarwinApplicationSearchEngine from './DarwinApplicationSearchEngine'
import EventType from './EventType'
import IApplicationSearchEngine from './IApplicationSearchEngine'
import LinuxDesktopApplicationSearchEngine from './LinuxDesktopApplicationSearchEngine'

const { platform } = process

const createEngine = async (): Promise<IApplicationSearchEngine> => {
	switch (platform) {
	case 'linux':
		return new LinuxDesktopApplicationSearchEngine()
	case 'darwin': {
		const darwinEngine = new DarwinApplicationSearchEngine()
		await darwinEngine.setup()
		return darwinEngine
	}
	default:
		throw new Error('Unsupported platform')
	}
}

const setup: PluginSetup = async (context: PluginContext) => {
	const searchEngine = await createEngine()

	context.registerSearchEngine(searchEngine)
	context.registerEventHandler(EventType.EXECUTE_APPLICATION, (data) => searchEngine.launchApp(data))
}

export default setup
