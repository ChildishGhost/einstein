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

		// TODO: aggregate results
		messageChannel.sendMessage('plugin:performSearch:reply', {
			term,
			result: results[0] || {},
		})
	})

	messageChannel.sendMessage('plugin:initialized')
})()
