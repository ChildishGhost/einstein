import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'
import { createChannel } from '@/sharedProcess/MessageChannel'

;(async () => {
	const pluginManager = new PluginManager()
	pluginManager
		.register(new ExamplePlugin())
		.setup()

	const messageChannel = await createChannel()

	messageChannel.sendMessage('test')
})()
