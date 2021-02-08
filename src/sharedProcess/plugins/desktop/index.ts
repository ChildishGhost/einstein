import { BasePlugin } from '@/api/plugin'
import { ISearchEngine } from '@/api/searchEngine'
import LinuxDesktopApplicationSearchEngine from '@/sharedProcess/plugins/desktop/desktop-linux'
import DarwinApplicationSearchEngine from '@/sharedProcess/plugins/desktop/DarwinApplicationSearchEngine'

const { platform } = process

export default class DesktopApplicationsPlugin extends BasePlugin {
	uid = 'tw.childish.einstein.plugin.desktop'

	private mySearchEngines: ISearchEngine[] = []

	async setup() {
		switch (platform) {
		case 'linux':
			this.mySearchEngines.push(new LinuxDesktopApplicationSearchEngine())
			break
		case 'darwin': {
			const darwinApp = new DarwinApplicationSearchEngine()
			await darwinApp.setup()
			this.mySearchEngines.push(darwinApp)
			break
		}
		default:
		}
	}

	get searchEngines() {
		return this.mySearchEngines
	}
}
