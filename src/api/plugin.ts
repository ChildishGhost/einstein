import { AppContext } from './app/index.ts'
import { ConfigDefinition, Configuration } from './configuration/index.ts'
import { ISearchEngine } from './searchEngine.ts'
import { EventType, UID } from './types.ts'

type PluginEventHandler = (data?: any) => void | Promise<void>
type PluginMetadata = {
	name: string
	uid: UID
	path: string
}

interface PluginContext<PluginConfig extends ConfigDefinition = {}> {
	registerEventHandler(type: EventType, handler: PluginEventHandler): void
	registerSearchEngine(searchEngine: ISearchEngine, ...triggers: string[]): void

	deregisterEventHandler(type: EventType, handler: PluginEventHandler): void
	deregisterSearchEngine(searchEngine: ISearchEngine, ...triggers: string[]): void

	loadConfig(): Promise<Configuration<PluginConfig>>
	saveConfig(config: PluginConfig): Promise<void>

	readonly app: AppContext
	readonly metadata: PluginMetadata
}
type PluginDispose = () => void | PromiseLike<void>
type PluginSetup<PluginConfig extends ConfigDefinition = {}> = (
	context: PluginContext<PluginConfig>,
) => void | PromiseLike<void> | PluginDispose | PromiseLike<PluginDispose>

type WithPluginTagged<T> = T & {
	pluginUid: UID
}

export type { PluginContext, PluginDispose, PluginEventHandler, PluginSetup, PluginMetadata, WithPluginTagged }
