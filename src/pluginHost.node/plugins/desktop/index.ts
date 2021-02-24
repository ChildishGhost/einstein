import { BasePlugin } from 'einstein'

import DarwinApplicationSearchEngine from '@/pluginHost.node/plugins/desktop/DarwinApplicationSearchEngine'
import EventType from '@/pluginHost.node/plugins/desktop/EventType'
import IApplicationSearchEngine from '@/pluginHost.node/plugins/desktop/IApplicationSearchEngine'
import LinuxDesktopApplicationSearchEngine from '@/pluginHost.node/plugins/desktop/LinuxDesktopApplicationSearchEngine'

const { platform } = process

export default class DesktopApplicationsPlugin extends BasePlugin {
	uid = 'tw.childish.einstein.plugin.desktop'

	private applicationSearchEngine: IApplicationSearchEngine = null

	async setup() {
		switch (platform) {
		case 'linux':
			this.applicationSearchEngine = new LinuxDesktopApplicationSearchEngine()
			break
		case 'darwin': {
			const darwinEngine = new DarwinApplicationSearchEngine()
			await darwinEngine.setup()
			this.applicationSearchEngine = darwinEngine
			break
		}
		default:
		}
	}

	onEvent(type: string, data?: any) {
		switch (type as EventType) {
		case 'executeApplication':
			return this.applicationSearchEngine.launchApp(data)
		default:
		}

		return Promise.resolve()
	}

	get searchEngines() {
		return [ this.applicationSearchEngine ]
	}
}
