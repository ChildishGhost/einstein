import { join, relative } from '@std/path'
import { walkSync } from '@std/fs/walk'
import { afterEach, describe, it } from '@std/testing/bdd'
import { assert, assertEquals, assertMatch, assertNotEquals, assertNotMatch } from '@std/assert'

import {
	assertExists,
	ensureUiBundle,
	isolatedEnv,
	type Main,
	readRepoFile,
	repo,
	repoPath,
	type Role,
	run,
	sleep,
	startMain,
	uiBundlePath,
} from '../helpers.ts'

const entries = {
	main: 'src/main.deno/index.ts',
	ui: 'src/ui.deno/index.ts',
	pluginHost: 'src/pluginHost.deno/index.ts',
}

/** Local files in an entry's static module graph, relative to the repository. */
const moduleGraph = async (entry: string) => {
	assertExists(entry)
	const result = await run(['info', '--json', entry])
	assertEquals(result.code, 0, result.stderr)
	const { modules } = JSON.parse(result.stdout) as { modules: { specifier: string }[] }
	return modules
		.filter((module) => module.specifier.startsWith('file:'))
		.map((module) => relative(repo, new URL(module.specifier).pathname))
}

/**
 * A child that stands in for the UI process or the plugin host under main's real command line. It speaks the
 * child side of the tunnel protocol and prints what it sees as `STUB <json>` lines, which main forwards.
 * On `beforeShow` the UI stub sends what a launcher would, plus a packet with a forged token.
 * `script` adds packets a stub sends on its own: under `ready` shortly after its handshake, under a channel after it
 * received that channel, each followed by a `played` line. `initDelay` holds back the plugin host's
 * `plugin:initialized`.
 */
type Script = Record<string, [channel: string, data?: unknown][]>
type StubOptions = { script?: Script; initDelay?: number }
const stubSource = (role: Role, { script = {}, initDelay = 0 }: StubOptions = {}) => `
import process from 'node:process'
const role = ${JSON.stringify(role)}
const script = ${JSON.stringify(script)}
const log = (kind, value) => console.log('STUB ' + JSON.stringify({ role, kind, value }))
const names = ['net', 'run', 'read', 'write', 'env', 'sys', 'ffi']
log('permissions', Object.fromEntries(names.map((name) => [name, Deno.permissions.querySync({ name }).state])))
const token = crypto.randomUUID().replaceAll('-', '')
const nonce = crypto.randomUUID()
let mainToken
const send = (channel, data, to = mainToken) =>
	process.send({ type: 'messageTunnel:packet', token: to, data: { channel, data } })
const play = (key) => {
	if (!script[key]) return
	script[key].forEach(([channel, data]) => send(channel, data))
	log('played', key)
}
const ready = () => {
	log('ready')
	// Main connects the routes right after the handshake.
	setTimeout(() => play('ready'), 500)
	if (role === 'pluginHost') {
		return setTimeout(() => {
			log('initialized')
			send('plugin:initialized')
		}, ${initDelay})
	}
	process.stdout.write('split-')
	process.stderr.write('split-')
	setTimeout(() => {
		process.stdout.write('stdout\\n')
		process.stderr.write('stderr\\n')
	}, 200)
}
const onPacket = ({ channel, data }) => {
	if (channel === 'plugin:performSearch') {
		send('plugin:performSearch:reply', { term: data.term, result: [{ pluginUid: 'test.stub', id: '1', title: data.term }] })
	}
	if (channel === 'beforeShow') {
		send('search', { term: 'forged' }, 'f'.repeat(32))
		send('search', { term: 'genuine' })
		send('plugin:event', { pluginUid: 'test.stub', type: 'open', data: 1 })
		send('resizeWindow', { height: 100 })
		send('closeWindow')
	}
	play(channel)
}
process.on('message', (message) => {
	if (message?.type === role + ':exit') process.exit()
	if (message?.type === role + ':registerMessageTunnel:response' && message.nonce === nonce) {
		mainToken = message.token
		ready()
	} else if (message?.type === 'messageTunnel:packet') {
		if (message.token !== token) return log('foreignToken', message.data)
		log('received', message.data)
		onPacket(message.data)
	}
})
process.send({ type: role + ':registerMessageTunnel', nonce, token })
`

type StubEvent = { role: Role; kind: string; value?: { channel: string; data?: unknown } & Record<string, unknown> }

const stubEvents = (main: Main) =>
	main.stdout.filter((line) => line.includes('STUB ')).map((line) =>
		JSON.parse(line.slice(line.indexOf('STUB ') + 5)) as StubEvent
	)
const received = (main: Main, role: Role) =>
	stubEvents(main).filter((event) => event.role === role && event.kind === 'received').map((event) => event.value!)
const readyCount = (main: Main, role: Role) =>
	stubEvents(main).filter((event) => event.role === role && event.kind === 'ready').length
const played = (main: Main, role: Role, key: string) =>
	stubEvents(main).some((event) => event.role === role && event.kind === 'played' && String(event.value) === key)
const windowChannels = ['beforeShow', 'resizeWindow', 'closeWindow']
/** Window commands main sent to the UI, in order. */
const windowCommands = (main: Main) =>
	received(main, 'ui').map((packet) => packet.channel).filter((channel) => windowChannels.includes(channel))
const count = (main: Main, role: Role, channel: string) =>
	received(main, role).filter((packet) => packet.channel === channel).length

let running: Main[] = []
afterEach(async () => {
	const stopping = running
	running = []
	for (const main of stopping) await main.stop()
})

/** Starts main, with stub children when `stubs` is set, and waits until both children are up. */
const start = async ({ stubs = false, ...options }: { stubs?: boolean } & Partial<Record<Role, StubOptions>> = {}) => {
	const { home, env } = await isolatedEnv()
	if (!stubs) await ensureUiBundle()
	if (stubs) {
		for (const role of ['ui', 'pluginHost'] as const) {
			const path = join(home, `${role}.stub.mjs`)
			Deno.writeTextFileSync(path, stubSource(role, options[role]))
			Object.assign(env, { [`EINSTEIN_TEST_${role.toUpperCase()}_ENTRY`]: path })
		}
	}
	const main = startMain(env)
	running.push(main)
	await main.waitFor('both children', () => {
		const { ui, pluginHost } = main.children()
		return ui && pluginHost && (!stubs || (readyCount(main, 'ui') && readyCount(main, 'pluginHost')))
	})
	return main
}

/** `einstein <args>` run again next to the running instance. */
const again = (main: Main, ...args: string[]) => run(['task', 'dev', ...args], { env: main.env, timeout: 30_000 })

const toggle = async (main: Main) => {
	const result = await again(main, '--toggle')
	assertEquals(result.code, 0, result.stderr)
}

describe('RFC 0008: process tree', () => {
	it('RFC-0008/R1: the Deno stack type-checks and runs on Deno alone, while the Electron build stays available', async () => {
		const check = await run(['check', ...Object.values(entries)])
		assertEquals(check.code, 0, check.stderr)
		for (const dir of ['src/main.deno', 'src/ui.deno', 'src/pluginHost.deno']) {
			for (const { path } of walkSync(repoPath(dir), { includeDirs: false, exts: ['ts', 'mts', 'js', 'mjs', 'vue'] })) {
				assertNotMatch(Deno.readTextFileSync(path), /from ['"]electron['"]|require\(['"]electron['"]\)/, path)
			}
		}
		const pkg = JSON.parse(readRepoFile('package.json'))
		assertMatch(pkg.scripts.build, /build:webpack/, 'the Electron build is kept on Linux')
		assertExists('src/main/index.ts')

		const main = await start()
		const deno = Deno.realPathSync(Deno.execPath())
		for (const proc of [main.main()!, ...main.children().all]) {
			assertEquals(Deno.realPathSync(proc.exe), deno, proc.cmdline.join(' '))
		}
	})

	it('RFC-0008/R2: main runs no UI and no plugin code, and the UI process and the plugin host are two separate processes that do not load each other', async () => {
		const main = await start()
		const { all, ui, pluginHost } = main.children()
		assertEquals(all.length, 2, all.map((proc) => proc.cmdline.join(' ')).join('\n'))
		assertNotEquals(ui!.pid, pluginHost!.pid)

		const graph = await moduleGraph(entries.main)
		assert(!graph.some((path) => /^(src\/ui\.deno|src\/pluginHost\.deno|plugins)\//.test(path)), graph.join('\n'))
		assert(!graph.some((path) => /gpui|\.node$/.test(path)), 'gpui-native draws in the process that loads it')
		assert(!(await moduleGraph(entries.ui)).some((path) => path.startsWith('src/pluginHost.deno/')))
		assert(!(await moduleGraph(entries.pluginHost)).some((path) => path.startsWith('src/ui.deno/')))
	})

	it('RFC-0008/R2: the launcher bundle the UI process imports at run time holds no main, plugin host or plugin code', async () => {
		await ensureUiBundle()
		// `import()` of the bundle is outside the static graph; its imports and its source map list what it holds.
		const imported = await moduleGraph(relative(repo, uiBundlePath))
		const { sources } = JSON.parse(Deno.readTextFileSync(`${uiBundlePath}.map`)) as { sources: string[] }
		const bundled = sources.map((source) => relative(repo, join(uiBundlePath, '..', source)))
		assert(bundled.some((path) => path.startsWith('src/ui.deno/')), bundled.join('\n'))
		const foreign = [...imported, ...bundled].filter((path) =>
			/^(src\/main\.deno|src\/pluginHost\.deno|plugins)\//.test(path)
		)
		assertEquals(foreign, [])
	})
})

describe('RFC 0008: spawning the children', () => {
	it('RFC-0008/R3: children are spawned Deno executables with explicit permissions, --no-prompt and an advanced-serialization IPC channel, because fork would grant every permission', async () => {
		const main = await start()
		const deno = Deno.realPathSync(Deno.execPath())
		for (const proc of main.children().all) {
			const command = proc.cmdline.join(' ')
			assertEquals(Deno.realPathSync(proc.exe), deno, command)
			assert(proc.cmdline.includes('--no-prompt'), `never blocks on a permission prompt: ${command}`)
			assert(proc.cmdline.some((arg) => /^(-A|--allow-)/.test(arg)), `explicit permissions: ${command}`)
			const environ = Deno.readTextFileSync(`/proc/${proc.pid}/environ`).split('\0')
			assert(environ.some((line) => line.startsWith('NODE_CHANNEL_FD=')), `an IPC channel: ${command}`)
			assert(environ.includes('NODE_CHANNEL_SERIALIZATION_MODE=advanced'), `advanced serialization: ${command}`)
		}
	})

	it('RFC-0008/R3: main forwards child stdout and stderr line by line, so a line written in pieces stays one line', async () => {
		const main = await start({ stubs: true })
		await main.waitFor('the forwarded lines', () =>
			main.stdout.some((line) => line.includes('split-stdout')) &&
			main.stderr.some((line) => line.includes('split-stderr')))
		assert(!main.stdout.some((line) => /split-$/.test(line)), main.stdout.join('\n'))
		assert(!main.stderr.some((line) => /split-$/.test(line)), main.stderr.join('\n'))
	})
})

describe('RFC 0008: child permissions', () => {
	it('RFC-0008/R4: the UI process is granted no net and no run permission, the plugin host is granted all', async () => {
		const main = await start({ stubs: true })
		const permissions = (role: Role) =>
			stubEvents(main).find((event) => event.role === role && event.kind === 'permissions')!.value!
		const ui = permissions('ui')
		assertNotEquals(ui.net, 'granted', 'a networked UI process could load arbitrary icons')
		assertNotEquals(ui.run, 'granted', 'the UI process must not start programs')
		for (const [name, state] of Object.entries(permissions('pluginHost'))) {
			assertEquals(state, 'granted', `plugin host ${name}`)
		}
	})
})

describe('RFC 0008: messaging', () => {
	it('RFC-0008/R5: both children complete the token handshake, and packets with another token are dropped', async () => {
		const main = await start({ stubs: true })
		await toggle(main)
		await main.waitFor(
			'the search at the plugin host',
			() => received(main, 'pluginHost').some((packet) => packet.channel === 'plugin:performSearch'),
		)
		await main.waitFor(
			'the result at the UI',
			() => received(main, 'ui').some((packet) => packet.channel === 'searchResult'),
		)
		const searches = received(main, 'pluginHost').filter((packet) => packet.channel === 'plugin:performSearch')
		assertEquals(searches.map((packet) => packet.data), [{ term: 'genuine' }], 'the forged search is dropped')
		const foreign = stubEvents(main).filter((event) => event.kind === 'foreignToken')
		assertEquals(foreign, [], 'main addresses every packet with the receiving child’s token')
	})
})

describe('RFC 0008: main as the hub', () => {
	it('RFC-0008/R6: main relays search and events between the children, and window commands stay between main and the UI', async () => {
		const main = await start({ stubs: true })
		await toggle(main)
		await main.waitFor(
			'the event at the plugin host',
			() => received(main, 'pluginHost').some((packet) => packet.channel === 'plugin:event'),
		)
		await main.waitFor(
			'the result at the UI',
			() => received(main, 'ui').some((packet) => packet.channel === 'searchResult'),
		)
		await sleep(200)

		const atPluginHost = received(main, 'pluginHost')
		assert(
			atPluginHost.some((packet) =>
				packet.channel === 'plugin:event' &&
				JSON.stringify(packet.data) === JSON.stringify({ pluginUid: 'test.stub', type: 'open', data: 1 })
			),
			'events arrive unchanged',
		)
		const result = received(main, 'ui').find((packet) => packet.channel === 'searchResult')!
		assertEquals(result.data, { term: 'genuine', result: [{ pluginUid: 'test.stub', id: '1', title: 'genuine' }] })
		const windowCommands = ['beforeShow', 'resizeWindow', 'closeWindow']
		assert(received(main, 'ui').some((packet) => packet.channel === 'beforeShow'), 'main shows the launcher')
		assertEquals(atPluginHost.filter((packet) => windowCommands.includes(packet.channel)), [])
	})

	it('RFC-0008/R6: main follows the UI’s own show and hide reports, so --toggle does the opposite, and they never reach the plugin host', async () => {
		const main = await start({
			stubs: true,
			ui: {
				script: {
					// Shown by the global shortcut, without main (RFC-0008/R12), at the height the window reports.
					ready: [['beforeShow'], ['resizeWindow', { height: 120 }]],
					// Shown again by the shortcut, then closed with Esc.
					closeWindow: [['beforeShow'], ['closeWindow']],
				},
			},
		})
		await main.waitFor('the UI to report itself shown', () => played(main, 'ui', 'ready'))
		await toggle(main)
		await main.waitFor('main to answer the toggle', () => windowCommands(main).length)
		assertEquals(windowCommands(main), ['closeWindow'], 'the UI reported itself shown, so --toggle hides it')

		await main.waitFor('the UI to report itself shown and closed', () => played(main, 'ui', 'closeWindow'))
		await toggle(main)
		await main.waitFor('main to answer the second toggle', () => windowCommands(main).length === 2)
		assertEquals(
			windowCommands(main),
			['closeWindow', 'beforeShow'],
			'the UI reported itself closed, so --toggle shows it',
		)

		await sleep(200)
		assertEquals(received(main, 'pluginHost').filter((packet) => windowChannels.includes(packet.channel)), [])
	})
})

describe('RFC 0008: restarting children', () => {
	it('RFC-0008/R7: a crashed child is restarted, but three unexpected exits within 60 s keep it down and point to einstein --restart', async () => {
		const main = await start()
		for (let crash = 1; crash <= 3; crash++) {
			const ui = main.children().ui!
			const logged = main.stderr.length
			Deno.kill(ui.pid, 'SIGKILL')
			await main.waitFor(
				`main to log crash ${crash}`,
				() => main.stderr.slice(logged).some((line) => /exit/i.test(line)),
			)
			if (crash < 3) {
				await main.waitFor(`the UI process to restart after crash ${crash}`, () => {
					const next = main.children().ui
					return next && next.pid !== ui.pid
				})
			}
		}
		await main.waitFor('the hint', () => main.stderr.some((line) => line.includes('einstein --restart')))
		await sleep(1_500)
		assertEquals(main.children().ui, undefined, 'the UI process stays down')
		assert(main.children().pluginHost, 'the plugin host keeps running')
	})

	it('RFC-0008/R7: a crashed plugin host or UI process is restarted and main relays through the new one, so search works again', async () => {
		const main = await start({ stubs: true })
		const searched = async (times: number) => {
			await toggle(main)
			await main.waitFor(
				`search ${times} at the plugin host`,
				() => count(main, 'pluginHost', 'plugin:performSearch') === times,
			)
			await main.waitFor(`result ${times} at the UI`, () => count(main, 'ui', 'searchResult') === times)
		}
		for (const role of ['pluginHost', 'ui'] as const) {
			const crashed = main.children()[role]!
			const logged = main.stderr.length
			Deno.kill(crashed.pid, 'SIGKILL')
			await main.waitFor(
				`main to log the ${role} crash`,
				() => main.stderr.slice(logged).some((line) => /exit/i.test(line)),
			)
			await main.waitFor(`the ${role} to restart`, () => {
				const next = main.children()[role]
				return next && next.pid !== crashed.pid && readyCount(main, role) === 2
			})
			await searched(role === 'pluginHost' ? 1 : 2)
		}
	})

	it('RFC-0008/R7: the launcher starts only after the plugin host has loaded its plugins (RFC-0002/R4), also on einstein --restart', async () => {
		// Held back, so a launcher started early would come up before it.
		const main = await start({ stubs: true, pluginHost: { initDelay: 1_000 } })
		const restart = await again(main, '--restart')
		assertEquals(restart.code, 0, restart.stderr)
		await main.waitFor(
			'both children to start again',
			() => readyCount(main, 'ui') === 2 && readyCount(main, 'pluginHost') === 2,
		)
		const starts = stubEvents(main)
			.filter((event) =>
				(event.role === 'pluginHost' && event.kind === 'initialized') ||
				(event.role === 'ui' && event.kind === 'permissions')
			)
			.map((event) => event.role)
		assertEquals(starts, ['pluginHost', 'ui', 'pluginHost', 'ui'])
	})
})

describe('RFC 0008: single instance', () => {
	it('RFC-0008/R8: a second start creates no other instance, and einstein --toggle and --restart act on the running one', async () => {
		const main = await start({ stubs: true })
		const mainPid = main.main()!.pid
		const before = main.children()

		const second = await again(main)
		assertEquals(second.code, 0, second.stderr)
		assertEquals(main.children().all.map((proc) => proc.pid).sort(), before.all.map((proc) => proc.pid).sort())

		await toggle(main)
		await main.waitFor(
			'beforeShow at the running UI',
			() => received(main, 'ui').some((packet) => packet.channel === 'beforeShow'),
		)

		const restart = await again(main, '--restart')
		assertEquals(restart.code, 0, restart.stderr)
		await main.waitFor('both children to be replaced', () => {
			const { ui, pluginHost } = main.children()
			return ui && pluginHost && ui.pid !== before.ui!.pid && pluginHost.pid !== before.pluginHost!.pid &&
				readyCount(main, 'ui') === 2 && readyCount(main, 'pluginHost') === 2
		})
		assertEquals(main.main()?.pid, mainPid, 'the running instance restarts its children, not itself')
	})
})
