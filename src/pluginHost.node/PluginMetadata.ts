import { UID, PluginSetup } from 'einstein'

export type PluginMetadata = {
	name: string
	uid: UID
	entry: string
	path?: string
	setup?: PluginSetup
}
