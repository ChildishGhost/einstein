import { ISearchEngine } from 'einstein'

export default interface IApplicationSearchEngine extends ISearchEngine {
	launchApp(identifier: any): Promise<void>
}
