import PerformSearchReply from '@/common/types/PerformSearchReply'
import PluginEvent from '@/common/types/PluginEvent'
import PluginManager from '@/sharedProcess/PluginManager'
import DesktopApplicationsPlugin from '@/sharedProcess/plugins/desktop'
import PassPlugin from '@/sharedProcess/plugins/pass'
import useMessageChannel from '@/sharedProcess/useMessageChannel'
import Fuse from 'fuse.js'
import 'source-map-support/register'

const SEARCH_LIMIT = 10

const pluginManager = new PluginManager()

;(async () => {
	const messageChannel = await useMessageChannel()

	await pluginManager.register(new DesktopApplicationsPlugin()).register(new PassPlugin()).setup()

	messageChannel.register('plugin:performSearch', async ({ term: rawTerm }) => {
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

		messageChannel.sendMessage<PerformSearchReply>('plugin:performSearch:reply', {
			term: rawTerm,
			result: rankedResult,
		})
	})

	messageChannel.register<PluginEvent>('plugin:event', async ({ pluginUid, type, data }) => {
		const plugin = pluginManager.getPlugin(pluginUid)
		if (!plugin) {
			return
		}

		await plugin.onEvent(type, data)
	})

	messageChannel.sendMessage('plugin:initialized')
})()
