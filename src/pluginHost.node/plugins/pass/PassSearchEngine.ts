import * as os from 'os'

import Fuse from 'fuse.js'

import { BaseSearchEngine, SearchResult } from '@/api/searchEngine'
import { exec, findIcon, walk } from '@/pluginHost.node/utils'

type PreSearch = {
	file: string
	name: string
}

type PassInput = { file: string }
/**
 * This search engine implements pass password manager integration
 *
 * @see https://www.passwordstore.org/
 */
export default class PassSearchEngine extends BaseSearchEngine {
	private passFiles: string[]

	private fuse: Fuse<PreSearch> = null

	name = 'tw.childish.einstein.plugin.pass.linux'

	triggers = [ 'pass' ]

	private subCommand = [ 'show' ]

	help = [
		{
			id: 'pass trigger help',
			title: 'pass',
			description: 'the standard unix password manager',
			icon: findIcon('dialog-password'),
			completion: 'pass ',
		},
		{
			id: 'pass trigger help',
			title: 'pass show',
			description: 'show password in QR code',
			icon: findIcon('dialog-password'),
			completion: 'pass show ',
		},
	]

	constructor() {
		super()
		this.loadPassStore()
		this.initFuse()
	}

	async search(term: string, trigger?: string): Promise<SearchResult[]> {
		if (trigger === `${this.triggers[0]}`) {
			const [ subCommand, ...remaining ] = term.split(' ')
			if (subCommand === `${this.subCommand[0]}`) {
				return this.searchAndShow(remaining.join(' '))
			}
			return this.searchOnTerm(term)
		}
		return []
	}

	async copyPassword({ file }: PassInput) {
		exec(`pass -c ${file}`)
	}

	async showPasswordQR({ file }: PassInput) {
		if (os.platform() === 'darwin') {
			exec(`pass show ${file} | head -n1 | qrencode -s 10 -o - | open -fa Preview.app`)
		} else {
			exec(`pass show -q ${file}`)
		}
	}

	private searchAndShow(term: string) {
		if (term.length === 0) {
			return [ this.help[1] ]
		}
		return this.fuse.search(term).map<SearchResult<PassInput>>(({ item }) => ({
			id: item.file,
			title: item.name,
			description: item.file,
			icon: findIcon('dialog-password'),
			completion: `${this.triggers[0]} show ${item.name}`,
			event: {
				type: 'pass show',
				data: {
					file: item.file,
				},
			},
		}))
	}

	private searchOnTerm(term: string) {
		if (term.length === 0) {
			return this.help
		}
		return this.fuse.search(term).map<SearchResult<PassInput>>(({ item }) => ({
			id: item.file,
			title: item.name,
			description: item.file,
			icon: findIcon('dialog-password'),
			completion: `${this.triggers[0]} ${item.name}`,
			event: {
				type: 'pass',
				data: {
					file: item.file,
				},
			},
		}))
	}

	private loadPassStore() {
		const passStoreDir = `${os.homedir()}/.password-store`

		// collect all available .gpg files and remove passstore directory path
		this.passFiles = walk(passStoreDir, [])
			.filter((f) => f.endsWith('.gpg'))
			.map((f) => f.replace(`.gpg`, ''))
			.map((f) => f.replace(`${passStoreDir}/`, ''))
	}

	private initFuse() {
		const preSearch: PreSearch[] = this.passFiles.map((f) => {
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
