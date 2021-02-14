import { BaseSearchEngine, SearchResult } from '@/api/searchEngine'
import { exec as cpExec } from 'child_process'
import * as fs from 'fs'
import Fuse from 'fuse.js'
import * as os from 'os'

type LinuxPassPreSearch = {
	file: string
	name: string
}

/**
 * This search engine implements pass password manager integration
 *
 * @see https://www.passwordstore.org/
 */
export default class LinuxPassSearchEngine extends BaseSearchEngine {
	private passFiles: string[]

	private fuse: Fuse<LinuxPassPreSearch> = null

	name = 'tw.childish.einstein.plugin.pass.linux'

	triggers = [ 'pass' ]

	constructor() {
		super()
		this.loadPassStore()
		this.initFuse()
	}

	async search(term: string, trigger?: string): Promise<SearchResult[]> {
		if (trigger === `${this.triggers[0]}`) {
			const result = this.fuse.search(term).map(({ item }) => ({
				id: item.file,
				title: item.name,
				description: item.file,
				completion: item.name,
				event: {
					type: 'pass',
					data: {
						file: item.file,
					},
				},
			}))

			return result
		}
		return []
	}

	async copyPassword({ file }: { file: string }) {
		cpExec(`pass -c ${file}`, { env: process.env }, (error: Error, _stdout: string, stderr: string) => {
			if (error) {
				console.log(error)
			}
			if (stderr) {
				console.log(stderr)
			}
		})
	}

	private loadPassStore() {
		const passStoreDir = `${os.homedir()}/.password-store`

		// walk directory recursively
		const walk = (path: string, acc: string[]) => {
			if (fs.existsSync(path)) {
				const stats = fs.statSync(path)
				if (stats.isDirectory()) {
					acc.push(
						...fs
							.readdirSync(path)
							.map((file) => walk(`${path}/${file}`, []))
							.flat(),
					)
				} else {
					acc.push(path)
				}
			}
			return acc
		}

		// collect all available .gpg files and remove passstore directory path
		this.passFiles = walk(passStoreDir, [])
			.filter((f) => f.endsWith('.gpg'))
			.map((f) => f.replace(`.gpg`, ''))
			.map((f) => f.replace(`${passStoreDir}/`, ''))
	}

	private initFuse() {
		const preSearch: LinuxPassPreSearch[] = this.passFiles.map((f) => {
			return { file: f, name: f.split('/').reverse()[0] }
		})
		console.log(preSearch)

		this.fuse = new Fuse(preSearch, {
			keys: [ 'name', 'file' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 0.4,
		})
	}
}
