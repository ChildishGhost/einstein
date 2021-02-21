import { memoize } from '@/common/decorator'
import { dirname } from 'path'

/**
 * All application-related environment configs will be placed here.
 */
export interface IEnvironment {
	appRoot: string
	omniSearchEntryPath: string
	sharedProcessEntryPath: string
}

class Environment implements IEnvironment {
	@memoize
	get appRoot() {
		return dirname(__dirname)
	}

	@memoize
	get omniSearchEntryPath() {
		return `file://${this.appRoot}/renderer/omniSearch.html`
	}

	@memoize
	get sharedProcessEntryPath() {
		return `file://${this.appRoot}/renderer/sharedProcess.html`
	}
}

export default new Environment()
