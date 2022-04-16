import { PluginMetadata as BasePluginMetadata } from 'einstein'

export type PluginMetadata = BasePluginMetadata & {
	entry: string
}
