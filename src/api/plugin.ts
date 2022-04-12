import { AppContext } from './app'
import { ISearchEngine } from './searchEngine'
import { EventType, UID } from './types'

type PluginEventHandler = (data?: any) => void | Promise<void>
interface PluginContext {
	registerEventHandler(type: EventType, handler: PluginEventHandler): void
	registerSearchEngine(searchEngine: ISearchEngine, ...triggers: string[]): void

	deregisterEventHandler(type: EventType, handler: PluginEventHandler): void
	deregisterSearchEngine(searchEngine: ISearchEngine, ...triggers: string[]): void

	readonly app: AppContext
}
type PluginDispose = () => void | PromiseLike<void>
type PluginSetup = (context: PluginContext) => void | PromiseLike<void> | PluginDispose | PromiseLike<PluginDispose>

type WithPluginTagged<T> = T & {
	pluginUid: UID
}

export { PluginContext, PluginDispose, PluginEventHandler, PluginSetup, WithPluginTagged }
