import { IEnvironment, PluginContext, PluginSetup } from 'einstein'

import DarwinApplicationSearchEngine from './DarwinApplicationSearchEngine'
import EventType from './EventType'
import IApplicationSearchEngine from './IApplicationSearchEngine'
import LinuxDesktopApplicationSearchEngine from './LinuxDesktopApplicationSearchEngine'

const createEngine = async (env: IEnvironment): Promise<IApplicationSearchEngine> => {
	switch (env.platform) {
	case 'linux':
		return new LinuxDesktopApplicationSearchEngine(env)
	case 'macos': {
		const darwinEngine = new DarwinApplicationSearchEngine(env)
		await darwinEngine.setup()
		return darwinEngine
	}
	default:
		throw new Error('Unsupported platform')
	}
}

const setup: PluginSetup = async (context: PluginContext) => {
	const searchEngine = await createEngine(context.app.environment)

	context.registerSearchEngine(searchEngine)
	context.registerEventHandler(EventType.EXECUTE_APPLICATION, (data) => searchEngine.launchApp(data))
}

export default setup
