import { join } from '@std/path'
import { describe, it } from '@std/testing/bdd'
import { assert, assertEquals, assertMatch, assertNotMatch } from '@std/assert'

import { isolatedEnv, readRepoFile, repoPath, sleep, startEntry } from '../helpers.ts'

type Result = { pluginUid: string; id: string; title: string; event?: Record<string, unknown> }
type FilePath = { uid: string; path: string; filePath?: string }
type Action =
	| { search: string }
	| { event: Record<string, unknown> }
	| { activate: { search: string; title: string } }
	| { filePath: { uid: string; path: string } }
type Files = Record<string, string | Record<string, unknown>>

/**
 * Starts the Deno plugin host with the test acting as main, and `plugins` installed as user plugins (RFC-0003/R1)
 * under a fresh HOME, then runs `actions` over its tunnel: `{search}` returns the reply's results, `{event}`
 * sends a plugin event, `{activate}` searches and sends the event of the result titled `title`, as the launcher does
 * on Enter, and returns that result, `{filePath}` returns the answer to that lookup (RFC-0002/R15). `__HOME__` in actions
 * stands for that HOME.
 */
const runPluginHost = async (
	{ plugins = {}, actions, env = {}, setup }: {
		plugins?: Record<string, Files>
		actions: Action[]
		env?: Record<string, string>
		setup?: (home: string) => void
	},
) => {
	const { home, env: isolated } = await isolatedEnv()
	for (const [name, files] of Object.entries(plugins)) {
		for (const [file, content] of Object.entries(files)) {
			const path = join(home, '.config/einstein/plugins', name, file)
			Deno.mkdirSync(join(path, '..'), { recursive: true })
			Deno.writeTextFileSync(path, typeof content === 'string' ? content : JSON.stringify(content))
		}
	}
	setup?.(home)
	const bin = join(home, 'bin')
	Deno.mkdirSync(bin, { recursive: true })
	Deno.writeTextFileSync(join(bin, 'xdg-open'), `#!/bin/sh\nprintf '%s\\n' "$1" >> '${join(home, 'opened')}'\n`)
	Deno.chmodSync(join(bin, 'xdg-open'), 0o755)

	const host = await startEntry('pluginHost', 'src/pluginHost.deno/index.ts', {
		args: ['--allow-all'],
		env: { ...isolated, PATH: `${bin}:${Deno.env.get('PATH')}`, ...env },
	})
	const reply = <T>(what: string, channel: string, match: (data: T) => boolean) => {
		const seen = host.received.length
		return host.waitFor(
			what,
			() =>
				host.received.slice(seen).find((packet) => packet.channel === channel && match(packet.data as T))?.data as T,
		)
	}
	const outputs: unknown[] = []
	let log = ''
	try {
		await host.waitFor(
			'plugin:initialized',
			() => host.received.some((packet) => packet.channel === 'plugin:initialized'),
		)
		for (const action of JSON.parse(JSON.stringify(actions).replaceAll('__HOME__', home)) as Action[]) {
			const search = async (term: string) => {
				const answer = reply<{ term: string; result: Result[] }>(
					`the results for "${term}"`,
					'plugin:performSearch:reply',
					(data) => data?.term === term,
				)
				host.send('plugin:performSearch', { term })
				return (await answer).result
			}
			if ('search' in action) outputs.push(await search(action.search))
			if ('activate' in action) {
				const results = await search(action.activate.search)
				const result = results.find((item) => item.title === action.activate.title)
				if (!result?.event) throw new Error(`no result to activate: ${JSON.stringify(results)}`)
				host.send('plugin:event', { pluginUid: result.pluginUid, ...result.event })
				await sleep(1000)
				outputs.push(result)
			}
			if ('event' in action) {
				host.send('plugin:event', action.event)
				await sleep(1000)
				outputs.push(null)
			}
			if ('filePath' in action) {
				const { uid, path } = action.filePath
				const answer = reply<FilePath>(
					`the plugin host to answer plugin:filePath for ${path}`,
					'plugin:filePath',
					(data) => data?.uid === uid && data?.path === path,
				)
				host.send('plugin:filePath', action.filePath)
				outputs.push(await answer)
			}
		}
	} finally {
		await host.stop()
		log = host.context()
	}
	const read = (name: string) => {
		try {
			return Deno.readTextFileSync(join(home, name))
		} catch {
			return null
		}
	}
	return { home, outputs, read, log }
}

const pkg = (name: string, entries: Record<string, string>) => ({
	name,
	uid: `test.rfc0008.${name}`,
	version: '0.0.1',
	...entries,
})

const probePlugin = (name: string): Files => ({
	'package.json': pkg(name, { module: 'index.js' }),
	'index.js': `
import * as einstein from 'einstein'
import Fuse from 'fuse.js'
globalThis.loads = (globalThis.loads ?? 0) + 1
const contextKeys = ['registerSearchEngine', 'deregisterSearchEngine', 'registerEventHandler', 'deregisterEventHandler', 'loadConfig', 'saveConfig', 'app', 'metadata']
export default (context) => {
	context.registerSearchEngine({
		search: async () => [{ id: 'probe', title: JSON.stringify({
			worker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
			loads: globalThis.loads,
			fuse: new Fuse(['einstein']).search('einst').length,
			api: ['version', 'VOID_TRIGGER', 'openUrl', 'spawn'].every((key) => key in einstein) && contextKeys.every((key) => key in context),
			uid: context.metadata.uid,
		}) }],
	}, 'probe')
}
`,
})

/**
 * Writes fake `name` icons under `~/.icons`, sized largest first: a symbolic SVG, an XPM, a full-color SVG and a PNG, so
 * plain "largest file" would pick the symbolic or XPM one. Returns the full-color SVG, the one a launcher can draw well.
 */
const writeIcons = (home: string, name: string) => {
	const kib = (size: number, head: string) => head + ' '.repeat(size * 1024 - head.length)
	const write = (path: string, content: string) => {
		Deno.mkdirSync(join(home, '.icons', path, '..'), { recursive: true })
		Deno.writeTextFileSync(join(home, '.icons', path), content)
	}
	const svg = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="${fill}"/></svg>`
	write(`symbolic/${name}-symbolic.svg`, kib(512, svg('currentColor')))
	write(`xpm/${name}.xpm`, kib(384, '/* XPM */'))
	const fullColor = kib(256, svg('#3584e4'))
	write(`scalable/${name}.svg`, fullColor)
	write(`48x48/${name}.png`, kib(128, '\x89PNG\r\n\x1a\n'))
	return fullColor
}

const assertIcon = (icon: unknown, expected: string) => {
	const [, mime, base64] = String(icon).match(/^data:(image\/png|image\/svg\+xml);base64,([A-Za-z0-9+/]+=*)$/) ?? []
	assert(mime, `a data URI with a MIME type GPUI and Chromium decode, got ${String(icon).slice(0, 40)}`)
	assertEquals(new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))), expected)
}

const titleOf = (results: unknown, uid: string) =>
	(results as Result[] | null)?.find((result) => result.pluginUid === uid)?.title

describe('RFC 0008: plugin:// images', () => {
	it('RFC-0008/R11: plugin:// files resolve inside the plugin folder only, so a plugin cannot expose other files', async () => {
		const uid = 'test.rfc0008.images'
		const paths = ['/assets/icon.png', '/../secret', '/assets/../../secret', '/assets/link', '/missing.png']
		const { outputs } = await runPluginHost({
			plugins: {
				images: {
					'package.json': pkg('images', { module: 'index.js' }),
					'index.js': 'export default () => {}\n',
					'assets/icon.png': 'png',
				},
			},
			setup: (home) => {
				Deno.writeTextFileSync(join(home, '.config/einstein/plugins/secret'), 'secret')
				Deno.symlinkSync(
					join(home, '.config/einstein/plugins/secret'),
					join(home, '.config/einstein/plugins/images/assets/link'),
				)
			},
			actions: paths.map((path) => ({ filePath: { uid, path } })),
		})
		const [icon, ...refused] = outputs as FilePath[]
		assert(icon.filePath, 'the plugin’s own file is found')
		assertEquals(Deno.readTextFileSync(icon.filePath), 'png')
		assertEquals(
			refused.map((answer) => answer.filePath ?? null),
			[null, null, null, null],
			'escapes via ../ or a symlink are refused',
		)
	})
})

describe('RFC 0008: plugin isolation and API', () => {
	it('RFC-0008/R16: each plugin runs in its own Worker with einstein and the fuzzy matcher from the preload, API unchanged', async () => {
		const { outputs } = await runPluginHost({
			plugins: { a: probePlugin('a'), b: probePlugin('b') },
			actions: [{ search: 'probe x' }],
		})
		for (const name of ['a', 'b']) {
			const uid = `test.rfc0008.${name}`
			const title = titleOf(outputs[0], uid)
			assert(title, `${uid} answered`)
			assertEquals(
				JSON.parse(title),
				{ worker: true, loads: 1, fuse: 1, api: true, uid },
				'loads: 1 means no shared globals',
			)
		}
	})

	it('RFC-0008/R17: spawn and openUrl run on the plugin host with the RFC 0003 behavior and environment allowlist', async () => {
		const { home, read } = await runPluginHost({
			plugins: {
				c: {
					'package.json': pkg('c', { module: 'index.js' }),
					'index.js': `
import { openUrl, spawn } from 'einstein'
export default (context) => {
	context.registerEventHandler('spawn', ({ out }) => spawn('env > "' + out + '"'))
	context.registerEventHandler('open', ({ url }) => openUrl(url))
}
`,
				},
			},
			env: { EINSTEIN_RFC0008_SECRET: 'leak' },
			actions: [
				{ event: { pluginUid: 'test.rfc0008.c', type: 'spawn', data: { out: '__HOME__/env' } } },
				{ event: { pluginUid: 'test.rfc0008.c', type: 'open', data: { url: 'https://example.com/?q=a b' } } },
			],
		})
		const env = read('env')
		assert(env, `spawn ran its command through a shell (${home})`)
		assertMatch(env, /^HOME=/m)
		assertNotMatch(
			env,
			/EINSTEIN_RFC0008_SECRET/,
			'variables outside the allowlist do not reach programs plugins start',
		)
		assertEquals(read('opened'), 'https://example.com/?q=a b\n', 'openUrl uses xdg-open on Linux')
	})
})

describe('RFC 0008: plugin bundles', () => {
	it('RFC-0008/R18: the Deno host loads module, and falls back to main through require for CommonJS-only plugins', async () => {
		const cjs = (title: string) =>
			`const { VOID_TRIGGER } = require('einstein')
module.exports.default = (context) => {
	context.registerSearchEngine({ search: async () => [{ id: '1', title: ${
				JSON.stringify(title)
			} + typeof VOID_TRIGGER }] }, 'entry')
}
`
		const esm = (title: string) =>
			`import { VOID_TRIGGER } from 'einstein'
export default (context) => {
	context.registerSearchEngine({ search: async () => [{ id: '1', title: ${
				JSON.stringify(title)
			} + typeof VOID_TRIGGER }] }, 'entry')
}
`
		const { outputs } = await runPluginHost({
			plugins: {
				both: {
					'package.json': pkg('both', { main: 'main.js', module: 'module.mjs' }),
					'main.js': cjs('main:'),
					'module.mjs': esm('module:'),
				},
				cjsonly: { 'package.json': pkg('cjsonly', { main: 'main.js' }), 'main.js': cjs('main:') },
			},
			actions: [{ search: 'entry x' }],
		})
		assertEquals(titleOf(outputs[0], 'test.rfc0008.both'), 'module:string')
		assertEquals(titleOf(outputs[0], 'test.rfc0008.cjsonly'), 'main:string', 'existing CommonJS plugins keep working')

		for (const { name, isDirectory } of Deno.readDirSync(repoPath('plugins'))) {
			if (!isDirectory) continue
			const manifest = JSON.parse(readRepoFile(`plugins/${name}/package.json`))
			assert(manifest.main && manifest.module, `plugins/${name} declares both bundles`)
		}
	})
})

describe('RFC 0008: built-in plugins', () => {
	it('RFC-0008/R19: built-in plugins behave on the Deno host as RFC 0005 specifies (web search opens the engine URL)', async () => {
		const uid = 'tw.childish.einstein.plugins.search'
		const { outputs, read } = await runPluginHost({ actions: [{ search: 'github einstein' }] })
		const result = (outputs[0] as Result[]).find((item) => item.pluginUid === uid && item.id === 'github')
		assert(result?.event, JSON.stringify(outputs[0]))
		const second = await runPluginHost({ actions: [{ event: { pluginUid: uid, ...result.event } }] })
		assertEquals(second.read('opened'), 'https://github.com/search?q=einstein&ref=opensearch\n')
		assertEquals(read('opened'), null, 'searching alone opens nothing')
	})

	it('RFC-0008/R19: the bookmarks plugin reads every profile of the configured Chromium browsers, merges duplicates and opens the URL (RFC-0005/R4–R7)', async () => {
		const uid = 'tw.childish.einstein.plugins.bookmarks.chromium'
		const url = (name: string, href: string) => ({ type: 'url', name, url: href })
		const bookmarks = (...children: unknown[]) =>
			JSON.stringify({ roots: { bookmark_bar: { type: 'folder', name: 'Bar', children } } })
		const quokka = url('Quokka Handbook', 'https://quokka.example/handbook')
		const { outputs, read } = await runPluginHost({
			setup: (home) => {
				const write = (path: string, content: string) => {
					Deno.mkdirSync(join(home, path, '..'), { recursive: true })
					Deno.writeTextFileSync(join(home, path), content)
				}
				// The config replaces the built-in browser list, so google-chrome is not read.
				write(`.config/einstein/config/${uid}.config.json`, JSON.stringify({ browsers: ['chromium', 'vivaldi'] }))
				write('.config/chromium/Default/Bookmarks', bookmarks(quokka))
				write('.config/chromium/Profile 1/Bookmarks', bookmarks(quokka))
				write(
					'.config/vivaldi/Default/Bookmarks',
					bookmarks({ type: 'folder', name: 'Nested', children: [url('Wombat Notes', 'https://wombat.example/')] }),
				)
				write('.config/vivaldi/Profile 2/Bookmarks', '{ not json')
				write('.config/google-chrome/Default/Bookmarks', bookmarks(url('Platypus Atlas', 'https://platypus.example/')))
			},
			actions: [
				{ search: 'quokka' },
				{ activate: { search: 'quokka', title: 'Quokka Handbook' } },
				{ search: 'wombat' },
				{ search: 'platypus' },
			],
		})
		const [quokkas, quokkaResult, wombat, platypus] = outputs as [Result[], Result, Result[], Result[]]
		const ours = (results: Result[]) => results.filter((result) => result.pluginUid === uid)
		assertEquals(
			ours(quokkas).length,
			1,
			'the same bookmark in two profiles is one result; the unreadable file is skipped',
		)
		const { pluginUid, title, description, completion } = quokkaResult as Result & Record<string, unknown>
		assertEquals({ pluginUid, title, description, completion }, {
			pluginUid: uid,
			title: 'Quokka Handbook',
			description: 'https://quokka.example/handbook',
			completion: 'Quokka Handbook',
		})
		assertEquals(read('opened'), 'https://quokka.example/handbook\n', 'opening a bookmark calls openUrl')
		assertEquals(ours(wombat).map((result) => result.title), ['Wombat Notes'], 'nested folders and URLs are searched')
		assertEquals(ours(platypus), [], 'a browser left out of the configured list is not read')
	})

	it('RFC-0008/R19: the desktop plugin lists launchable .desktop entries and their actions, and launches them without field codes (RFC-0005/R9, R10, R13)', async () => {
		const uid = 'tw.childish.einstein.plugins.desktop'
		const { outputs, read } = await runPluginHost({
			setup: (home) => {
				const bin = join(home, 'bin')
				Deno.mkdirSync(bin, { recursive: true })
				const app = join(bin, 'quokka-viewer')
				Deno.writeTextFileSync(
					app,
					`#!/bin/sh\nprintf '[%s]' "$@" >> '${join(home, 'launched')}'\necho >> '${join(home, 'launched')}'\n`,
				)
				Deno.chmodSync(app, 0o755)
				const applications = join(home, '.local/share/applications')
				Deno.mkdirSync(applications, { recursive: true })
				const entry = (name: string, lines: string) => Deno.writeTextFileSync(join(applications, name), lines)
				entry(
					'quokka-viewer.desktop',
					`[Desktop Entry]\nType=Application\nName=Quokka Viewer\nExec=${app} --view %U\n\n` +
						`[Desktop Action window]\nName=New Window\nExec=${app} --new %f\n`,
				)
				entry(
					'quokka-hidden.desktop',
					`[Desktop Entry]\nType=Application\nName=Quokka Hidden\nExec=${app}\nNoDisplay=true\n`,
				)
				entry('quokka-link.desktop', `[Desktop Entry]\nType=Link\nName=Quokka Link\nURL=https://quokka.example/\n`)
				entry('quokka-noexec.desktop', `[Desktop Entry]\nType=Application\nName=Quokka Without Exec\n`)
			},
			actions: [
				{ search: 'quokka' },
				{ activate: { search: 'quokka viewer', title: 'Quokka Viewer' } },
				{ activate: { search: 'quokka viewer', title: 'Quokka Viewer: New Window' } },
			],
		})
		const results = (outputs[0] as (Result & Record<string, unknown>)[]).filter((result) => result.pluginUid === uid)
		assertEquals(results.map((result) => result.title).sort(), ['Quokka Viewer', 'Quokka Viewer: New Window'])
		const viewer = results.find((result) => result.title === 'Quokka Viewer')!
		assertMatch(String(viewer.description), /quokka-viewer --view$/, 'the command is shown, without field codes')
		assertEquals(viewer.completion, 'Quokka Viewer')
		assertEquals(read('launched'), '[--view]\n[--new]\n', 'no files or URLs are passed to the app')
	})

	it('RFC-0008/R19: the desktop plugin finds entries in applications subdirectories and skips unreadable ones, so one bad entry cannot hide every app (RFC-0005/R9)', async () => {
		const uid = 'tw.childish.einstein.plugins.desktop'
		const { outputs, log } = await runPluginHost({
			setup: (home) => {
				const applications = join(home, '.local/share/applications')
				const nested = join(applications, 'wine/Programs')
				Deno.mkdirSync(nested, { recursive: true })
				const entry = (path: string, name: string) =>
					Deno.writeTextFileSync(path, `[Desktop Entry]\nType=Application\nName=${name}\nExec=true\n`)
				entry(join(applications, 'numbat-plain.desktop'), 'Numbat Plain')
				entry(join(nested, 'numbat-nested.desktop'), 'Numbat Nested')
				// Root ignores permissions, so the unreadable entry only counts as one for other users.
				if (Deno.uid() !== 0) {
					entry(join(applications, 'numbat-unreadable.desktop'), 'Numbat Unreadable')
					Deno.chmodSync(join(applications, 'numbat-unreadable.desktop'), 0o000)
				}
				Deno.symlinkSync(join(home, 'missing.desktop'), join(applications, 'numbat-broken.desktop'))
				Deno.symlinkSync(applications, join(nested, 'loop'))
			},
			actions: [{ search: 'numbat' }],
		})
		const titles = (outputs[0] as (Result & Record<string, unknown>)[])
			.filter((result) => result.pluginUid === uid)
			.map((result) => result.title)
		assertEquals(titles.sort(), ['Numbat Nested', 'Numbat Plain'])
		assertNotMatch(log, new RegExp(`Plugin ${uid} failed`))
	})

	it('RFC-0008/R19: the desktop plugin skips actions without Exec and entries that fail to process, so one bad entry cannot hide every app (RFC-0005/R9)', async () => {
		const uid = 'tw.childish.einstein.plugins.desktop'
		const { outputs, log } = await runPluginHost({
			setup: (home) => {
				const applications = join(home, '.local/share/applications')
				Deno.mkdirSync(applications, { recursive: true })
				Deno.writeTextFileSync(
					join(applications, 'bilby.desktop'),
					`[Desktop Entry]\nType=Application\nName=Bilby\nExec=true\n\n` +
						`[Desktop Action broken]\nName=Broken\n\n` +
						`[Desktop Action window]\nName=New Window\nExec=true --new\n`,
				)
				// Root ignores permissions, so the unreadable icon only makes processing fail for other users.
				if (Deno.uid() !== 0) {
					Deno.mkdirSync(join(home, '.icons'), { recursive: true })
					const icon = join(home, '.icons/bilby-einstein-test-unreadable.svg')
					Deno.writeTextFileSync(icon, '<svg xmlns="http://www.w3.org/2000/svg"/>')
					Deno.chmodSync(icon, 0o000)
					Deno.writeTextFileSync(
						join(applications, 'bilby-unprocessable.desktop'),
						`[Desktop Entry]\nType=Application\nName=Bilby Unprocessable\nExec=true\nIcon=bilby-einstein-test-unreadable\n`,
					)
				}
			},
			actions: [{ search: 'bilby' }],
		})
		const titles = (outputs[0] as (Result & Record<string, unknown>)[])
			.filter((result) => result.pluginUid === uid)
			.map((result) => result.title)
		assertEquals(titles.sort(), ['Bilby', 'Bilby: New Window'])
		assertNotMatch(log, new RegExp(`Plugin ${uid} failed`))
	})

	it('RFC-0008/R19: the pass plugin answers only its trigger, and copies or shows an entry through pass (RFC-0005/R14–R16)', async () => {
		const uid = 'tw.childish.einstein.plugins.pass'
		const { outputs, read } = await runPluginHost({
			setup: (home) => {
				for (const entry of ['web/quokka.example.gpg', 'mail/wombat.gpg', 'web/notes.txt']) {
					Deno.mkdirSync(join(home, '.password-store', entry, '..'), { recursive: true })
					Deno.writeTextFileSync(join(home, '.password-store', entry), '')
				}
				// Stands in for pass, which the plugin only runs; the test never needs a real password store.
				Deno.mkdirSync(join(home, 'bin'), { recursive: true })
				Deno.writeTextFileSync(join(home, 'bin/pass'), `#!/bin/sh\necho "$*" >> '${join(home, 'pass.log')}'\n`)
				Deno.chmodSync(join(home, 'bin/pass'), 0o755)
			},
			actions: [
				{ search: 'pass ' },
				{ search: 'pass quokka' },
				{ search: 'quokka' },
				{ search: 'pass notes' },
				{ activate: { search: 'pass quokka', title: 'quokka.example' } },
				{ activate: { search: 'pass show quokka', title: 'quokka.example' } },
			],
		})
		const ours = (index: number) =>
			(outputs[index] as (Result & Record<string, unknown>)[]).filter((result) => result.pluginUid === uid)
		assertEquals(
			ours(0).map((result) => result.completion).sort(),
			['pass ', 'pass show '],
			'an empty term offers the subcommands',
		)
		assertEquals(ours(1).map(({ title, description }) => ({ title, description })), [
			{ title: 'quokka.example', description: 'web/quokka.example' },
		])
		assertEquals(ours(2), [], 'without the pass trigger it stays silent')
		assertEquals(ours(3), [], 'only *.gpg entries are indexed')
		assertEquals(read('pass.log'), '-c web/quokka.example\nshow -q web/quokka.example\n')
	})

	it('RFC-0008/R19: desktop icons are embedded as data URIs the launcher can decode, full-color before symbolic (RFC-0005/R11)', async () => {
		const uid = 'tw.childish.einstein.plugins.desktop'
		let fullColor = ''
		let symbolic = ''
		const { outputs } = await runPluginHost({
			setup: (home) => {
				// Icon names unique to the test, so real system icons cannot match.
				fullColor = writeIcons(home, 'quokka-einstein-test-icon')
				symbolic = `<svg xmlns="http://www.w3.org/2000/svg"><path fill="currentColor"/></svg>`
				Deno.mkdirSync(join(home, '.icons/symbolic'), { recursive: true })
				Deno.writeTextFileSync(join(home, '.icons/symbolic/wombat-einstein-test-icon-symbolic.svg'), symbolic)
				const applications = join(home, '.local/share/applications')
				Deno.mkdirSync(applications, { recursive: true })
				for (const [name, icon] of [['Quokka Icons', 'quokka'], ['Wombat Icons', 'wombat']]) {
					Deno.writeTextFileSync(
						join(applications, `${icon}-icons.desktop`),
						`[Desktop Entry]\nType=Application\nName=${name}\nExec=true\nIcon=${icon}-einstein-test-icon\n`,
					)
				}
			},
			actions: [{ search: 'quokka icons' }, { search: 'wombat icons' }],
		})
		const iconOf = (index: number, title: string) =>
			(outputs[index] as (Result & Record<string, unknown>)[]).find((result) =>
				result.pluginUid === uid && result.title === title
			)?.icon
		assertIcon(iconOf(0, 'Quokka Icons'), fullColor)
		assertIcon(iconOf(1, 'Wombat Icons'), symbolic)
	})

	it('RFC-0008/R19: the pass icon is embedded as a data URI the launcher can decode, full-color before symbolic (RFC-0005/R11)', async () => {
		const uid = 'tw.childish.einstein.plugins.pass'
		let fullColor = ''
		// The pass plugin always looks up dialog-password, so the fakes are made larger than any system icon of that name.
		const { outputs } = await runPluginHost({
			setup: (home) => fullColor = writeIcons(home, 'dialog-password'),
			actions: [{ search: 'pass ' }],
		})
		const help = (outputs[0] as (Result & Record<string, unknown>)[]).filter((result) => result.pluginUid === uid)
		assert(help.length > 0, JSON.stringify(outputs[0]))
		for (const result of help) assertIcon(result.icon, fullColor)
	})
	it('RFC-0008/R19: plugin:// icons of built-in plugins resolve from their source folder, where the Deno host loads them (RFC-0003/R12)', async () => {
		const bookmarks = JSON.stringify({
			roots: {
				bookmark_bar: {
					type: 'folder',
					name: 'Bar',
					children: [{ type: 'url', name: 'Quokka', url: 'https://quokka.example/' }],
				},
			},
		})
		const { outputs } = await runPluginHost({
			setup: (home) => {
				Deno.mkdirSync(join(home, '.config/chromium/Default'), { recursive: true })
				Deno.writeTextFileSync(join(home, '.config/chromium/Default/Bookmarks'), bookmarks)
			},
			actions: [{ search: 'quokka' }],
		})
		const folders = {
			'tw.childish.einstein.plugins.bookmarks.chromium': 'bookmarks',
			'tw.childish.einstein.plugins.search': 'search',
		}
		const icons = Object.keys(folders).map((uid) => {
			const icon = (outputs[0] as (Result & Record<string, unknown>)[]).find((result) => result.pluginUid === uid)?.icon
			assert(typeof icon === 'string' && icon.startsWith('plugin://'), `${uid} returns a plugin:// icon`)
			const { hostname, pathname } = new URL(icon)
			return { uid: hostname, path: pathname }
		})
		const answers = (await runPluginHost({ actions: icons.map((filePath) => ({ filePath })) })).outputs as FilePath[]
		for (const { uid, path, filePath } of answers) {
			const folder = Deno.realPathSync(repoPath(`plugins/${folders[uid as keyof typeof folders]}`))
			assert(filePath?.startsWith(`${folder}/`), `${uid}${path} resolves inside ${folder}: ${filePath}`)
			assert(Deno.statSync(filePath!).isFile)
		}
	})
})
