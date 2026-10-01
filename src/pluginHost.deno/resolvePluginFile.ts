import { join, SEPARATOR } from '@std/path'

/**
 * The real path of `path` inside the plugin folder, or undefined when there is no such file or it lies outside
 * the folder, through `..` or a symlink (RFC-0008/R11).
 */
export const resolvePluginFile = async (pluginPath: string, path: string) => {
	try {
		const root = await Deno.realPath(pluginPath)
		const file = await Deno.realPath(join(root, path))
		if (!file.startsWith(root + SEPARATOR) || !(await Deno.stat(file)).isFile) {
			return undefined
		}
		return file
	} catch {
		return undefined
	}
}
