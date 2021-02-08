import { BasePlugin } from '@/api/plugin'
import { ISearchEngine } from '@/api/searchEngine'
import LinuxDesktopApplicationSearchEngine from '@/sharedProcess/plugins/desktop/desktop-linux'

const { platform } = process

export default class DesktopApplicationsPlugin extends BasePlugin {
	uid = 'tw.childish.einstein.plugin.desktop'

	private mySearchEngines: ISearchEngine[] = []

	async setup() {
		if (platform === 'linux') {
			this.mySearchEngines.push(new LinuxDesktopApplicationSearchEngine())
		}
	}

	get searchEngines() {
		return this.mySearchEngines
	}
}
