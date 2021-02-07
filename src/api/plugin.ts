import { ISearchEngine } from './searchEngine'

type UID = string

interface IPlugin {
	readonly uid: UID
	setup(): Promise<void>

	readonly searchEngines: ISearchEngine[]
}

abstract class BasePlugin implements IPlugin {
	abstract get uid(): string

	// eslint-disable-next-line no-empty-function
	async setup() {}

	abstract get searchEngines(): ISearchEngine[]
}

export {
	UID,
	IPlugin,
	BasePlugin,
}
