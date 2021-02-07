import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'
import useMessageChannel from '@/sharedProcess/useMessageChannel'

const pluginManager = new PluginManager()

;(async () => {
	const messageChannel = await useMessageChannel()

	await pluginManager
		.register(new ExamplePlugin())
		.setup()

	messageChannel.register('plugin:performSearch', async ({ term }) => {
		const results = await pluginManager.search(term)
		const mergedResult = {
			suggestions: results.reduce((acc, { suggestions }) => {
				acc.push(...suggestions)
				return acc
			}, []),
		}

		// TODO: aggregate results
		messageChannel.sendMessage('plugin:performSearch:reply', {
			term,
			result: mergedResult,
		})
	})

	messageChannel.sendMessage('plugin:initialized')
})()
