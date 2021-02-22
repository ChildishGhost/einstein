import { ISearchEngine } from '@/api/searchEngine'

export default interface IApplicationSearchEngine extends ISearchEngine {
	launchApp(identifier: any): Promise<void>
}
