import PerformSearchReply from '@/common/types/PerformSearchReply'
import PluginEvent from '@/common/types/PluginEvent'
import PluginManager from '@/sharedProcess/PluginManager'
import DesktopApplicationsPlugin from '@/sharedProcess/plugins/desktop'
import PassPlugin from '@/sharedProcess/plugins/pass'
import useMessageChannel from '@/sharedProcess/useMessageChannel'
import Fuse from 'fuse.js'

const pluginManager = new PluginManager()

;(async () => {
	const messageChannel = await useMessageChannel()

	await pluginManager.register(new DesktopApplicationsPlugin()).register(new PassPlugin()).setup()

	messageChannel.register('plugin:performSearch', async ({ term }) => {
		const results = await pluginManager.search(term)

		const fuse = new Fuse(results, {
			keys: [ 'title', 'description' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 1.0,
		})

		// use the rest of the search terms if trigger is set
		const fuzzTerm = term.includes(' ') ? term.split(' ').slice(1).join(' ') : term

		const rankedResult = fuse.search(fuzzTerm, { limit: 10 }).map(({ item }) => item)

		console.log(`Fuzzing on: ${fuzzTerm}`)
		console.log(results)
		console.log(rankedResult)

		messageChannel.sendMessage<PerformSearchReply>('plugin:performSearch:reply', {
			term,
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
