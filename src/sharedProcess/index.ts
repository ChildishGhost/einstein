import 'source-map-support/register'

import Fuse from 'fuse.js'

import PerformSearchReply from '@/common/types/PerformSearchReply'
import PluginEvent from '@/common/types/PluginEvent'
import PluginManager from '@/sharedProcess/PluginManager'
import DesktopApplicationsPlugin from '@/sharedProcess/plugins/desktop'
import PassPlugin from '@/sharedProcess/plugins/pass'
import useMessageTunnel from '@/sharedProcess/useMessageTunnel'

const SEARCH_LIMIT = 10

const pluginManager = new PluginManager()

;(async () => {
	const messageTunnel = await useMessageTunnel()

	await pluginManager.register(new DesktopApplicationsPlugin()).register(new PassPlugin()).setup()

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

		console.log(`Fuzzing on: ${term}`)
		console.log(result)
		console.log(rankedResult)

		messageTunnel.sendMessage<PerformSearchReply>('plugin:performSearch:reply', {
			term: rawTerm,
			result: rankedResult,
		})
	})

	messageTunnel.register<PluginEvent>('plugin:event', async ({ pluginUid, type, data }) => {
		const plugin = pluginManager.getPlugin(pluginUid)
		if (!plugin) {
			return
		}

		await plugin.onEvent(type, data)
	})

	messageTunnel.sendMessage('plugin:initialized')
})()
