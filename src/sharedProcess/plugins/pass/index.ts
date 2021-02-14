import { BasePlugin } from '@/api/plugin'
import LinuxPassSearchEngine from '@/sharedProcess/plugins/pass/LinuxPassSearchEngine'

export default class PassPlugin extends BasePlugin {
	readonly uid = 'tw.childish.einstein.plugin.pass'

	private passSearchEngine: LinuxPassSearchEngine = null

	async setup() {
		this.passSearchEngine = new LinuxPassSearchEngine()
	}

	onEvent(type: string, data?: any) {
		switch (type) {
		case 'pass':
			return this.passSearchEngine.copyPassword(data)
		default:
		}

		return Promise.resolve()
	}

	get searchEngines() {
		return [ this.passSearchEngine ]
	}
}
