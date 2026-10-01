import type { WithPluginTagged } from '../api/plugin.ts'
import type { SearchResult } from '../api/searchEngine.ts'
import type { IMessageTunnel } from '../common/message/MessageTunnel.ts'
import { shownIcon } from './icon.ts'

type Result = WithPluginTagged<SearchResult>
type SearchReply = { term: string; result?: Result[] }
type FilePath = { uid: string; path: string; filePath?: string }

const pluginFile = (url: string) => {
	if (!URL.canParse(url)) return undefined
	const { protocol, hostname: uid, pathname: path } = new URL(url)
	return protocol === 'plugin:' ? { uid, path } : undefined
}

/**
 * The launcher's input, results and selection (RFC 0004), kept while the window is hidden (RFC-0008/R10).
 * `setVisible` shows or hides the window; the launcher reports every change to main with `beforeShow` or
 * `closeWindow`, so `einstein --toggle` and the global shortcut agree on the state.
 */
export const createLauncher = (
	tunnel: IMessageTunnel,
	setVisible: (visible: boolean) => void = () => {},
	/** Lets the window observe the state, e.g. Vue's `reactive`. */
	observe: <T extends object>(state: T) => T = (state) => state,
) => {
	const state = observe({
		shown: false,
		term: '',
		results: [] as Result[],
		selected: 0,
		/** Files of `plugin://` icons, resolved by the plugin host through main (RFC-0008/R4, R11). */
		iconFiles: {} as Record<string, string>,
	})
	const requested = new Set<string>()

	const iconSource = (url?: string) => {
		const shown = shownIcon(url)
		return shown?.startsWith('data:') ? shown : shown && state.iconFiles[shown]
	}

	const requestIcons = () => {
		for (const { icon } of state.results) {
			const url = shownIcon(icon)
			const file = url && pluginFile(url)
			if (!file || requested.has(url)) continue
			requested.add(url)
			tunnel.sendMessage('plugin:filePath', file)
		}
	}

	tunnel.register('plugin:filePath', (data?: FilePath) => {
		if (!data?.filePath) return
		const url = [...requested].find((url) => {
			const file = pluginFile(url)
			return file?.uid === data.uid && file?.path === data.path
		})
		if (url) state.iconFiles[url] = data.filePath
	})

	tunnel.register('searchResult', (data?: SearchReply) => {
		if (data?.term !== state.term) return
		state.results = data.result ?? []
		state.selected = 0
		requestIcons()
	})

	const setShown = (shown: boolean) => {
		if (state.shown === shown) return
		state.shown = shown
		setVisible(shown)
		tunnel.sendMessage(shown ? 'beforeShow' : 'closeWindow')
	}
	tunnel.register('beforeShow', () => setShown(true))
	tunnel.register('closeWindow', () => setShown(false))

	const selectedResult = () => state.results[state.selected] as Result | undefined

	const launcher = {
		state,
		iconSource,
		show: () => setShown(true),
		hide: () => setShown(false),
		toggle: () => setShown(!state.shown),
		input(term: string) {
			state.term = term
			tunnel.sendMessage('search', { term })
		},
		move(offset: number) {
			const count = state.results.length
			if (count) state.selected = (state.selected + offset + count) % count
		},
		select(index: number) {
			state.selected = index
		},
		complete() {
			const result = selectedResult()
			if (result) launcher.input(result.completion ?? result.title)
		},
		activate() {
			const result = selectedResult()
			if (!result) return
			if (!result.event) {
				if (result.completion) launcher.complete()
				return
			}
			tunnel.sendMessage('plugin:event', { ...result.event, pluginUid: result.pluginUid })
			launcher.cancel()
		},
		cancel() {
			launcher.input('')
			launcher.hide()
		},
	}
	return launcher
}
