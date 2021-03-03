import { homedir } from 'os'
import { dirname, join as joinPath } from 'path'

import { memoize } from '@/common/decorator'

/**
 * All application-related environment configs will be placed here.
 */
export interface IEnvironment {
	appRoot: string
	userHome: string
	builtinPluginsPath: string
	userPluginsPath: string
}

class Environment implements IEnvironment {
	@memoize
	get appRoot() {
		return dirname(__dirname)
	}

	@memoize
	get userHome() {
		return homedir()
	}

	@memoize
	get builtinPluginsPath() {
		return joinPath(this.appRoot, 'plugins')
	}

	@memoize
	get systemPluginsPath() {
		return joinPath('/', 'usr', 'share', 'einstein', 'plugins')
	}

	@memoize
	get userPluginsPath() {
		return joinPath(this.userHome, '.config', 'einstein', 'plugins')
	}
}

export default new Environment()