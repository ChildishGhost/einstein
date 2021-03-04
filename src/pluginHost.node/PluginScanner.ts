import { readdir, readFile } from 'fs/promises'
import { platform } from 'os'
import { join as joinPath } from 'path'

import Environment from '@/pluginHost.node/Environment'
import { PluginMetadata } from '@/pluginHost.node/PluginMetadata'

export default class PluginScanner {
	async scan() {
		return (await Promise.all(this.scanDirs.map((dir) => this.scanPluginsInDir(dir)))).flat()
	}

	private get scanDirs() {
		if (platform() === 'win32') {
			return [ Environment.builtinPluginsPath, Environment.userPluginsPath ]
		}

		return [ Environment.builtinPluginsPath, Environment.systemPluginsPath, Environment.userPluginsPath ]
	}

	private async scanPluginsInDir(dir: string) {
		try {
			const dirents = await readdir(dir, { withFileTypes: true })

			return Promise.all(
				dirents
					.filter((dirent) => dirent.isDirectory())
					.map((dirent) => joinPath(dir, dirent.name))
					.map((path) => this.readPluginMetadata(path)),
			)
		} catch (e) {
			console.log(`Unable to readdir: ${dir}, reason: ${e.message}`)
			return []
		}
	}

	private async readPluginMetadata(path: string): Promise<PluginMetadata | null> {
		console.log(`Scanned plugin path: ${path}`)
		try {
			const { name, uid, main: mainScript, module: moduleScript } = await this.readManifest(path)
			const entry = mainScript || moduleScript
			if (!name) {
				throw new Error('Missing required field: "name"')
			}
			if (!uid) {
				throw new Error('Missing required field: "uid"')
			}
			if (!entry) {
				throw new Error('Missing required field: "main" or "module"')
			}

			const metadata: PluginMetadata = {
				name,
				uid,
				entry,
				path,
			}

			console.log(`Plugin metadata: ${JSON.stringify(metadata)}`)
			return metadata
		} catch (e) {
			console.log(e.message)
			return null
		}
	}

	private async readManifest(path: string) {
		const packagePath = joinPath(path, 'package.json')
		const data = await readFile(packagePath, { encoding: 'utf-8' })

		try {
			return JSON.parse(data)
		} catch (e) {
			throw new SyntaxError(`Invalid plugin package.json in ${path}`)
		}
	}
}
