import 'source-map-support/register'

import Fuse from 'fuse.js'

import PerformSearchReply from '@/common/types/PerformSearchReply'
import PluginEvent from '@/common/types/PluginEvent'
import PluginManager from '@/pluginHost.node/PluginManager'
import BookmarksPlugin from '@/pluginHost.node/plugins/bookmarks'
import DesktopApplicationsPlugin from '@/pluginHost.node/plugins/desktop'
import useMessageTunnel from '@/pluginHost.node/useMessageTunnel'

const SEARCH_LIMIT = 10

const pluginManager = new PluginManager()

;(async () => {
	process.on('message', ({ type }) => {
		if (type === 'pluginHost:exit') {
			process.exit()
		}
	})

	const messageTunnel = await useMessageTunnel()

	// TODO(davy): load as normal plugin
	await pluginManager.loadPlugin({
		uid: 'tw.childish.einstein.plugin.desktop',
		name: 'Desktop Applications',
		entry: 'internal',
		setup: DesktopApplicationsPlugin,
	})
	await pluginManager.loadPlugin({
		uid: 'tw.childish.einstein.plugin.bookmarks.chromium',
		name: 'Bookmarks',
		entry: 'internal',
		setup: BookmarksPlugin,
	})
	await pluginManager.loadPlugins()

	messageTunnel.register('plugin:performSearch', async ({ term: rawTerm }) => {
		const { term, result } = await pluginManager.search(rawTerm.trim())

		const fuse = new Fuse(result, {
			keys: [ 'title', 'description' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 1.0,
		})

		const rankedResult =
			term.length > 0
				? fuse.search(term, { limit: SEARCH_LIMIT }).map(({ item }) => item)
				: result.slice(0, SEARCH_LIMIT)

		messageTunnel.sendMessage<PerformSearchReply>('plugin:performSearch:reply', {
			term: rawTerm,
			result: rankedResult,
		})
	})

	messageTunnel.register<PluginEvent>('plugin:event', ({ pluginUid, type, data }) => {
		return pluginManager.notifyPlugin(pluginUid, type, data)
	})

	messageTunnel.sendMessage('plugin:initialized')
})()
