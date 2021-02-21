import { dirname, join as joinPath } from 'path'

import { memoize } from '@/common/decorator'

/**
 * All application-related environment configs will be placed here.
 */
export interface IEnvironment {
	appRoot: string
	omniSearchEntryPath: string
	sharedProcessEntryPath: string
	pluginHostEntryPath: string
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

	@memoize
	get pluginHostEntryPath() {
		return joinPath(this.appRoot, 'node/pluginHost')
	}
}

export default new Environment()
