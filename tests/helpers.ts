import { type ChildProcess, spawn } from 'node:child_process'
import { walkSync } from '@std/fs/walk'
import { fromFileUrl, join } from '@std/path'

export const repo = fromFileUrl(new URL('../', import.meta.url))

export const repoPath = (path: string) => join(repo, path)

export const assertExists = (path: string) => {
	try {
		Deno.statSync(repoPath(path))
	} catch {
		throw new Error(`${path} is missing`)
	}
}

export const readRepoFile = (path: string) => {
	assertExists(path)
	return Deno.readTextFileSync(repoPath(path))
}

export const tempDir = (prefix = 'einstein-test-') => Deno.makeTempDirSync({ prefix })

export type Output = { code: number; stdout: string; stderr: string }

/** Runs a command, by default `deno` in the repository root so its deno.json (tasks, import map) applies. */
export const run = async (
	args: string[],
	{ command = Deno.execPath(), cwd = repo, env = {}, timeout = 60_000 }: {
		command?: string
		cwd?: string
		env?: Record<string, string>
		timeout?: number
	} = {},
): Promise<Output> => {
	const { code, stdout, stderr } = await new Deno.Command(command, {
		args,
		cwd,
		env,
		stdin: 'null',
		signal: AbortSignal.timeout(timeout),
	}).output()
	const decoder = new TextDecoder()
	return { code, stdout: decoder.decode(stdout), stderr: decoder.decode(stderr) }
}

export const git = async (cwd: string, ...args: string[]) => {
	const result = await run(args, { command: 'git', cwd })
	if (result.code !== 0) {
		throw new Error(`git ${args.join(' ')} exited with ${result.code}:\n${result.stderr}`)
	}
	return result.stdout
}

/** Resolves with `promise`, or with undefined after `ms`. */
export const within = <T>(promise: Promise<T>, ms: number) => {
	let timer: ReturnType<typeof setTimeout> | undefined
	return Promise.race([
		promise,
		new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), ms))),
	])
		.finally(() => clearTimeout(timer!))
}

export const sleep = (ms: number) => within(new Promise<never>(() => {}), ms)

/** Polls `check` until it returns a value, or fails after `timeout` with `what` and `context()`. */
export const waitFor = async <T>(
	what: string,
	check: () => T | undefined | null | false,
	{ timeout = 15_000, context = () => '' }: { timeout?: number; context?: () => string } = {},
): Promise<T> => {
	const end = Date.now() + timeout
	while (true) {
		const value = check()
		if (value) return value
		if (Date.now() > end) throw new Error(`timed out waiting for ${what}\n${context()}`)
		await sleep(50)
	}
}

let denoDir: string | undefined
/** A fresh HOME would otherwise give the processes an empty Deno cache and make them download. */
const cachedDenoDir = async () => (denoDir ??= JSON.parse((await run(['info', '--json'])).stdout).denoDir as string)

/** A fresh HOME, XDG directories and runtime directory (so a fresh single-instance socket) for one test. */
export const isolatedEnv = async () => {
	const home = tempDir('einstein-home-')
	const env = {
		HOME: home,
		XDG_CONFIG_HOME: join(home, '.config'),
		XDG_DATA_HOME: join(home, '.local/share'),
		XDG_STATE_HOME: join(home, '.local/state'),
		XDG_CACHE_HOME: join(home, '.cache'),
		XDG_RUNTIME_DIR: join(home, 'run'),
		DENO_DIR: await cachedDenoDir(),
	}
	Deno.mkdirSync(env.XDG_RUNTIME_DIR, { mode: 0o700 })
	return { home, env }
}

const collectLines = async (stream: ReadableStream<Uint8Array>, lines: string[]) => {
	let rest = ''
	for await (const chunk of stream.pipeThrough(new TextDecoderStream())) {
		const parts = (rest + chunk).split('\n')
		rest = parts.pop()!
		lines.push(...parts)
	}
	if (rest) lines.push(rest)
}

export type Proc = { pid: number; ppid: number; cmdline: string[]; exe: string }

const readProc = (pid: number, tag: string): Proc | undefined => {
	try {
		if (!Deno.readTextFileSync(`/proc/${pid}/environ`).split('\0').includes(tag)) return undefined
		const stat = Deno.readTextFileSync(`/proc/${pid}/stat`)
		const [state, ppid] = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
		if (state === 'Z') return undefined
		const cmdline = Deno.readTextFileSync(`/proc/${pid}/cmdline`).split('\0').slice(0, -1)
		return { pid, ppid: Number(ppid), cmdline, exe: Deno.readLinkSync(`/proc/${pid}/exe`) }
	} catch {
		return undefined
	}
}

/** Live processes whose environment carries `tag`, i.e. everything a test started, however deep. */
const taggedProcesses = (tag: string) =>
	[...Deno.readDirSync('/proc')].filter((entry) => /^\d+$/.test(entry.name))
		.map((entry) => readProc(Number(entry.name), tag))
		.filter((proc): proc is Proc => proc !== undefined)

export type Role = 'ui' | 'pluginHost'
const roleOf = (proc: Proc) =>
	proc.cmdline.some((arg) => /\bui\./.test(arg))
		? 'ui'
		: proc.cmdline.some((arg) => /\bpluginHost\./.test(arg))
		? 'pluginHost'
		: undefined

export type Main = Awaited<ReturnType<typeof startMain>>

/**
 * Starts Einstein as `deno task dev` does, with `env` added. Every process it starts is tagged through its
 * environment, so `stop` kills whatever is left, even children that lost their parent.
 */
export const startMain = (env: Record<string, string>, args: string[] = []) => {
	const tagValue = crypto.randomUUID()
	const tag = `EINSTEIN_TEST_RUN=${tagValue}`
	const task = new Deno.Command(Deno.execPath(), {
		args: ['task', 'dev', ...args],
		cwd: repo,
		env: { ...env, EINSTEIN_TEST_RUN: tagValue },
		stdin: 'null',
		stdout: 'piped',
		stderr: 'piped',
	}).spawn()
	const stdout: string[] = []
	const stderr: string[] = []
	const collected = Promise.all([collectLines(task.stdout, stdout), collectLines(task.stderr, stderr)])
	const context = () => `--- stdout\n${stdout.join('\n')}\n--- stderr\n${stderr.join('\n')}`
	let mainPid: number | undefined

	const processes = () => taggedProcesses(tag)
	const main = () => {
		const all = processes()
		mainPid ??= all.find((proc) => proc.cmdline.some((arg) => arg.endsWith('src/main.deno/index.ts')))?.pid
		return all.find((proc) => proc.pid === mainPid)
	}
	const children = () => {
		const pid = main()?.pid
		const found = processes().filter((proc) => pid !== undefined && proc.ppid === pid)
		return {
			all: found,
			ui: found.find((proc) => roleOf(proc) === 'ui'),
			pluginHost: found.find((proc) => roleOf(proc) === 'pluginHost'),
		}
	}

	return {
		env: { ...env, EINSTEIN_TEST_RUN: tagValue },
		stdout,
		stderr,
		main,
		children,
		processes,
		waitFor: <T>(what: string, check: () => T | undefined | null | false, timeout?: number) =>
			waitFor(what, check, { timeout, context }),
		async stop() {
			const pid = main()?.pid
			if (pid) Deno.kill(pid, 'SIGTERM')
			await within(task.status, 5_000)
			for (let attempt = 0; attempt < 20 && processes().length; attempt++) {
				processes().forEach((proc) => {
					try {
						Deno.kill(proc.pid, 'SIGKILL')
					} catch {
						// Already gone.
					}
				})
				await sleep(100)
			}
			await task.status
			await collected
			const left = processes()
			if (left.length) throw new Error(`processes left running: ${left.map((proc) => proc.cmdline.join(' '))}`)
		},
	}
}

export const uiBundlePath = repoPath('src/ui.deno/dist/window.mjs')

// The bundle also inlines src/common (e.g. appId.ts).
const uiBundleIsStale = () => {
	let built: number
	try {
		built = Deno.statSync(uiBundlePath).mtime!.getTime()
	} catch {
		return true
	}
	const sources = ['src/ui.deno', 'src/common'].flatMap((dir) => [
		...walkSync(repoPath(dir), { includeDirs: false, skip: [/\/(dist|node_modules)(\/|$)/] }),
	])
	return sources.some(({ path }) => Deno.statSync(path).mtime!.getTime() > built)
}

let uiBundle: Promise<void> | undefined
/** Builds the launcher window bundle once per run if it is missing or older than its sources, so no test runs a stale UI. */
export const ensureUiBundle = () =>
	uiBundle ??= (async () => {
		if (!uiBundleIsStale()) return
		const result = await run(['task', 'build:ui'])
		if (result.code !== 0) throw new Error(`deno task build:ui failed:\n${result.stderr}`)
	})()

export type Packet = { channel: string; data?: unknown }

/**
 * Starts a child entry directly, with the test acting as main on the other end of its IPC channel: it answers
 * the child's token handshake (RFC-0002/R11) and exchanges tunnel packets.
 */
export const startEntry = async (
	role: Role,
	entry: string,
	{ args, env }: { args: string[]; env: Record<string, string> },
) => {
	const child: ChildProcess = spawn(
		Deno.execPath(),
		['run', '--no-prompt', '--config', repoPath('deno.json'), ...args, repoPath(entry)],
		{
			cwd: repo,
			env: { ...Deno.env.toObject(), ...env },
			stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
			serialization: 'advanced',
		},
	)
	const output: string[] = []
	child.stdout!.on('data', (chunk) => output.push(String(chunk)))
	child.stderr!.on('data', (chunk) => output.push(String(chunk)))
	const exited = new Promise((resolve) => child.once('exit', resolve))
	const context = () => `--- ${role} output\n${output.join('')}`
	const token = crypto.randomUUID().replaceAll('-', '')
	let childToken: string | undefined
	const received: Packet[] = []

	child.on('message', (message: Record<string, unknown>) => {
		if (message?.type === `${role}:registerMessageTunnel` && typeof message.token === 'string') {
			childToken = message.token
			child.send({ type: `${role}:registerMessageTunnel:response`, nonce: message.nonce, token })
		} else if (message?.type === 'messageTunnel:packet' && message.token === token) {
			received.push(message.data as Packet)
		}
	})

	const handle = {
		received,
		context,
		send(channel: string, data?: unknown) {
			child.send({ type: 'messageTunnel:packet', token: childToken, data: { channel, data } })
		},
		waitFor: <T>(what: string, check: () => T | undefined | null | false, timeout?: number) =>
			waitFor(what, check, { timeout, context }),
		async stop() {
			child.kill('SIGKILL')
			if (!(await within(exited.then(() => true), 5_000))) throw new Error(`${role} did not exit`)
		},
	}
	try {
		await handle.waitFor(
			`the ${role} handshake`,
			() => childToken || child.exitCode !== null || child.signalCode !== null,
		)
		if (!childToken) throw new Error(`${role} exited before its handshake\n${context()}`)
	} catch (error) {
		await handle.stop()
		throw error
	}
	return handle
}
