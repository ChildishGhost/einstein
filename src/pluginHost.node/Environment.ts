import { mkdirSync } from 'fs'
import { homedir, platform } from 'os'
import { dirname, join as joinPath } from 'path'

import { memoize } from '@/common/decorator'

/**
 * All application-related environment configs will be placed here.
 */
export interface IEnvironment {
	platform: 'linux' | 'macos' | 'windows' | 'other'
	appRoot: string
	userHome: string
	builtinPluginsPath: string
	userPluginsPath: string
	userConfigPath: string
}

class Environment implements IEnvironment {
	@memoize
	get platform() {
		switch (platform()) {
		case 'linux':
			return 'linux'
		case 'darwin':
			return 'macos'
		case 'win32':
			return 'windows'
		default:
			return 'other'
		}
	}

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
	get userDataPath() {
		if (this.platform === 'windows') {
			return joinPath(this.userHome, 'AppData', 'Local', 'einstein')
		}
		return joinPath(this.userHome, '.config', 'einstein')
	}

	@memoize
	get userPluginsPath() {
		return joinPath(this.userDataPath, 'plugins')
	}

	@memoize
	get userConfigPath() {
		const path = joinPath(this.userDataPath, 'config')
		mkdirSync(path, { recursive: true })

		return path
	}
}

export default new Environment()
