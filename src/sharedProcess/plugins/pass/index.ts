import { BasePlugin } from '@/api/plugin'
import PassSearchEngine from '@/sharedProcess/plugins/pass/PassSearchEngine'

export default class PassPlugin extends BasePlugin {
	readonly uid = 'tw.childish.einstein.plugin.pass'

	private passSearchEngine: PassSearchEngine = null

	async setup() {
		this.passSearchEngine = new PassSearchEngine()
	}

	onEvent(type: string, data?: any) {
		switch (type) {
		case 'pass':
			return this.passSearchEngine.copyPassword(data)
		case 'pass show':
			return this.passSearchEngine.showPasswordQR(data)
		default:
		}

		return Promise.resolve()
	}

	get searchEngines() {
		return [ this.passSearchEngine ]
	}
}
