import { BasePlugin } from '@/api/plugin'
import LinuxDesktopApplicationSearchEngine from '@/sharedProcess/plugins/desktop/LinuxDesktopApplicationSearchEngine'
import DarwinApplicationSearchEngine from '@/sharedProcess/plugins/desktop/DarwinApplicationSearchEngine'
import IApplicationSearchEngine from '@/sharedProcess/plugins/desktop/IApplicationSearchEngine'

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

	get searchEngines() {
		return [ this.applicationSearchEngine ]
	}
}
