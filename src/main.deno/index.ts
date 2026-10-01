import type { ChildProcess } from 'node:child_process'

import type { MessageTunnel } from '../common/message/MessageTunnel.ts'
import { type Role, startChild } from './children.ts'
import { createRestartGuard } from './restartGuard.ts'
import { connectRoutes } from './routes.ts'
import { acquireInstance, type Command, defaultSocketPath, sendCommand } from './singleInstance.ts'

type Running = { child: ChildProcess; tunnel: MessageTunnel; stopping: boolean }

const children: Partial<Record<Role, Running>> = {}
const guards = {
	ui: createRestartGuard({ name: 'UI process' }),
	pluginHost: createRestartGuard({ name: 'Plugin host' }),
}
let routes: ReturnType<typeof connectRoutes> | undefined

// Lifecycle steps run one at a time, so a crash during a restart cannot interleave with it.
let queue = Promise.resolve()
const enqueue = (step: () => Promise<void>) => {
	queue = queue.then(step).catch((error) => console.error(error))
	return queue
}

const launch = async (role: Role) => {
	// Test hook: runs a stub entry in place of this child, under the same command line and permissions.
	const { child, tunnel } = await startChild(role, { entry: Deno.env.get(`EINSTEIN_TEST_${role.toUpperCase()}_ENTRY`) })
	const running: Running = { child, tunnel, stopping: false }
	children[role] = running
	child.once('exit', (code, signal) => {
		if (running.stopping) return
		console.error(`${role} exited unexpectedly (${code ?? signal})`)
		if (children[role] === running) delete children[role]
		if (guards[role].exited()) enqueue(() => restartChild(role))
	})
	if (role === 'pluginHost') {
		await Promise.race([
			new Promise((resolve) => tunnel.register('plugin:initialized', resolve)),
			new Promise((resolve) => child.once('exit', resolve)),
		])
	}
}

const connect = () => {
	routes?.disconnect()
	routes = children.ui && children.pluginHost
		? connectRoutes({ ui: children.ui.tunnel, pluginHost: children.pluginHost.tunnel })
		: undefined
}

// RFC-0002/R4: the plugin host has loaded every plugin before the launcher is started and routes are connected.
const restartChild = async (role: Role) => {
	try {
		await launch(role)
	} catch (error) {
		console.error(error)
		if (guards[role].exited()) enqueue(() => restartChild(role))
		return
	}
	connect()
}

const stop = (role: Role) =>
	new Promise<void>((resolve) => {
		const running = children[role]
		delete children[role]
		if (!running || running.child.exitCode !== null || running.child.signalCode !== null) return resolve()
		running.stopping = true
		running.child.once('exit', () => resolve())
		running.child.send({ type: `${role}:exit` })
		setTimeout(() => running.child.kill(), 1000)
	})

const stopAll = async () => {
	routes?.disconnect()
	routes = undefined
	await Promise.all([stop('ui'), stop('pluginHost')])
}

// A child that dies before its handshake counts as an unexpected exit too (RFC-0008/R7).
const startAll = async () => {
	await restartChild('pluginHost')
	await restartChild('ui')
}

const restartAll = async () => {
	await stopAll()
	guards.ui.reset()
	guards.pluginHost.reset()
	await startAll()
}

const command = Deno.args.map((arg) => arg.replace(/^--/, '')).find((arg): arg is Command =>
	arg === 'toggle' || arg === 'restart'
)
const socket = defaultSocketPath()
const instance = await acquireInstance(socket, {
	toggle: () => routes?.toggle(),
	restart: () => void enqueue(restartAll),
})

if (!instance.primary) {
	if (command) {
		await sendCommand(socket, command)
	} else {
		console.log('Einstein is already running; use --toggle or --restart.')
	}
	Deno.exit(0)
}

const shutdown = () =>
	enqueue(async () => {
		await stopAll()
		await instance.close()
		Deno.exit(0)
	})
Deno.addSignalListener('SIGINT', shutdown)
Deno.addSignalListener('SIGTERM', shutdown)

await enqueue(startAll)
