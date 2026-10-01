import type { ChannelHandler, IMessageTunnel } from '../common/message/MessageTunnel.ts'

/** Main's view of the launcher window, which the UI process draws (RFC-0008/R6). */
export type Launcher = { shown: boolean; height?: number }

/**
 * Connects the children through main, which stays the hub (RFC-0002/R13), and takes the UI's window commands
 * (RFC-0002/R16). `disconnect` detaches every handler, for when either child is replaced.
 */
export const connectRoutes = ({ ui, pluginHost }: { ui: IMessageTunnel; pluginHost: IMessageTunnel }) => {
	const launcher: Launcher = { shown: false }
	const registered: [IMessageTunnel, string, ChannelHandler][] = []
	const on = (tunnel: IMessageTunnel, channel: string, handler: ChannelHandler) => {
		tunnel.register(channel, handler)
		registered.push([tunnel, channel, handler])
	}
	const relay = (from: IMessageTunnel, to: IMessageTunnel, channel: string, toChannel = channel) =>
		on(from, channel, (data) => to.sendMessage(toChannel, data))

	relay(ui, pluginHost, 'search', 'plugin:performSearch')
	relay(pluginHost, ui, 'plugin:performSearch:reply', 'searchResult')
	relay(ui, pluginHost, 'plugin:event')
	relay(ui, pluginHost, 'plugin:filePath')
	relay(pluginHost, ui, 'plugin:filePath')
	on(ui, 'resizeWindow', ({ height }) => {
		launcher.height = height
	})
	// The UI reports every show and hide, including those of its global shortcut (RFC-0008/R12).
	on(ui, 'beforeShow', () => {
		launcher.shown = true
	})
	on(ui, 'closeWindow', () => {
		launcher.shown = false
	})

	return {
		launcher,
		/** `einstein --toggle` (RFC-0008/R8): the UI process shows after `beforeShow` and hides on `closeWindow`. */
		toggle() {
			launcher.shown = !launcher.shown
			ui.sendMessage(launcher.shown ? 'beforeShow' : 'closeWindow')
		},
		disconnect() {
			registered.forEach(([tunnel, channel, handler]) => tunnel.unregister(channel, handler))
		},
	}
}
