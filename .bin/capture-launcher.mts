#!/usr/bin/env -S deno run --no-prompt --allow-env=XDG_CURRENT_DESKTOP,SPECTACLE --allow-read --allow-write --allow-run
// Captures only the launcher window on KDE Plasma, for visual checks: a KWin check that the active window is the
// launcher, Spectacle's active-window mode, then a width check that deletes any capture that is not the launcher.
// Usage: capture-launcher.mts [--toggle] <file.png>
// SPECTACLE overrides the command, e.g. `host-spawn spectacle` inside a toolbox.
import { fromFileUrl, resolve } from '@std/path'

import { width } from '../src/ui.deno/metrics.ts'

const fail = (message: string): never => {
	console.error(message)
	Deno.exit(1)
}

const toggle = Deno.args.includes('--toggle')
const [target] = Deno.args.filter((arg) => arg !== '--toggle')
if (!target?.endsWith('.png')) fail('usage: capture-launcher.mts [--toggle] <file.png>')
if (!(Deno.env.get('XDG_CURRENT_DESKTOP') ?? '').split(':').includes('KDE')) {
	fail('capture-launcher needs KDE Plasma (KWin); XDG_CURRENT_DESKTOP does not contain KDE.')
}
const file = resolve(target)

const run = async (command: string, args: string[]) => {
	try {
		return (await new Deno.Command(command, { args, stdin: 'null', stdout: 'null' }).output()).success
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) fail(`${command} not found; set SPECTACLE, e.g. "host-spawn spectacle".`)
		throw error
	}
}

if (toggle) {
	const config = fromFileUrl(new URL('../deno.json', import.meta.url))
	if (!await run(Deno.execPath(), ['task', '--config', config, 'dev', '--toggle'])) fail('toggling the launcher failed')
	// Lets the window show and finish its resize animation.
	await new Promise((done) => setTimeout(done, 1000))
}

// A layer-shell surface has no app_id in KWin (its resourceClass is the executable, "deno"), so the launcher is
// identified by the pid KWin reports for the active window, which must run this checkout's UI entry point.
const activeWindowPid = async (): Promise<number | undefined> => {
	const nonce = crypto.randomUUID().replaceAll('-', '')
	const path = `/CaptureCheck/${nonce}`
	const plugin = `einstein-capture-check-${nonce}`
	const script = await Deno.makeTempFile({ suffix: '.js' })
	// KWin cannot return a value from a script, so the script sends a call that dbus-monitor observes.
	await Deno.writeTextFile(
		script,
		`const w = workspace.activeWindow\ncallDBus('org.freedesktop.DBus', '${path}', 'org.einstein.CaptureCheck', 'report', w ? String(w.pid) : '0')\n`,
	)
	let monitor: Deno.ChildProcess | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	const busctl = async (...args: string[]) => {
		const { success, stdout } = await new Deno.Command('busctl', {
			args: ['--user', 'call', 'org.kde.KWin', ...args],
			stdin: 'null',
			stderr: 'null',
		}).output()
		if (!success) throw new Error(`busctl ${args.slice(2, 3)} failed`)
		return new TextDecoder().decode(stdout)
	}
	try {
		monitor = new Deno.Command('dbus-monitor', {
			args: ['--session', `type='method_call',path='${path}'`],
			stdin: 'null',
			stdout: 'piped',
			stderr: 'null',
		}).spawn()
		const reader = monitor.stdout.pipeThrough(new TextDecoderStream()).getReader()
		let buffer = ''
		const nextMatch = async (pattern: RegExp) => {
			for (;;) {
				const lines = buffer.split('\n')
				buffer = lines.pop()!
				for (const [index, line] of lines.entries()) {
					const found = line.match(pattern)
					if (found) {
						buffer = [...lines.slice(index + 1), buffer].join('\n')
						return found
					}
				}
				const { value, done } = await reader.read()
				if (done) return undefined
				buffer += value
			}
		}
		const timeout = new Promise<undefined>((done) => timer = setTimeout(() => done(undefined), 3000))
		// dbus-monitor loses its own bus name once it has become a monitor.
		if (!await Promise.race([nextMatch(/member=NameLost/), timeout])) return undefined
		const id = (await busctl('/Scripting', 'org.kde.kwin.Scripting', 'loadScript', 'ss', script, plugin)).match(
			/^i (\d+)/,
		)
		if (!id) return undefined
		await busctl(`/Scripting/Script${id[1]}`, 'org.kde.kwin.Script', 'run')
		const pid = await Promise.race([nextMatch(/^\s*string "(\d+)"$/), timeout])
		return pid ? Number(pid[1]) : undefined
	} finally {
		clearTimeout(timer)
		await busctl('/Scripting', 'org.kde.kwin.Scripting', 'unloadScript', 's', plugin).catch(() => undefined)
		if (monitor) {
			monitor.kill()
			await monitor.status
		}
		await Deno.remove(script)
	}
}

let activePid: number | undefined
try {
	activePid = await activeWindowPid()
} catch (error) {
	fail(`checking the active window through KWin failed: ${error instanceof Error ? error.message : error}`)
}
// Deno reads /proc only with --allow-all, so ps reads the command line.
const activeCommand = activePid
	? new TextDecoder().decode(
		(await new Deno.Command('ps', { args: ['-ww', '-o', 'args=', '-p', String(activePid)], stdin: 'null' }).output())
			.stdout,
	).trim()
	: ''
if (!` ${activeCommand} `.includes(` ${fromFileUrl(new URL('../src/ui.deno/index.ts', import.meta.url))} `)) {
	fail(`the active window (pid ${activePid ?? 'unknown'}) is not this checkout's Einstein launcher; nothing captured.`)
}

const [spectacle, ...wrapperArgs] = (Deno.env.get('SPECTACLE') ?? 'spectacle').trim().split(/\s+/)
if (!await run(spectacle, [...wrapperArgs, '-b', '-n', '-a', '-o', file])) fail('spectacle failed')

// A PNG stores its width big-endian at byte 16 of the IHDR chunk.
let captured: number | undefined
try {
	const header = Deno.readFileSync(file).subarray(0, 24)
	captured = new DataView(header.buffer, header.byteOffset).getUint32(16)
} catch {
	captured = undefined
}
if (captured !== width) {
	try {
		Deno.removeSync(file)
	} catch {
		// Nothing was written.
	}
	fail(`the active window is ${captured ?? 'unknown'} px wide, not the ${width} px launcher; capture deleted.`)
}
console.log(`captured the launcher to ${file}`)
