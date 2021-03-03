import { UID } from 'einstein'

export type PluginMetadata = {
	name: string
	uid: UID
	entry: string
	path?: string
}
