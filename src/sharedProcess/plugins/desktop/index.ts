import { BasePlugin } from '@/api/plugin'
import DarwinApplicationSearchEngine from '@/sharedProcess/plugins/desktop/DarwinApplicationSearchEngine'
import EventType from '@/sharedProcess/plugins/desktop/EventType'
import IApplicationSearchEngine from '@/sharedProcess/plugins/desktop/IApplicationSearchEngine'
import LinuxDesktopApplicationSearchEngine from '@/sharedProcess/plugins/desktop/LinuxDesktopApplicationSearchEngine'

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
