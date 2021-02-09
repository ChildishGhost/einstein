import { ISearchEngine } from '@/api/searchEngine'

export default interface IApplicationSearchEngine extends ISearchEngine {
	launchApp(path: string): Promise<void>
}
