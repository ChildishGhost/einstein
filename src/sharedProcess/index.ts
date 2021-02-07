import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'
import useMessageChannel from '@/sharedProcess/useMessageChannel';

(async () => {
	const pluginManager = new PluginManager()
	pluginManager
		.register(new ExamplePlugin())
		.setup()

	const messageChannel = await useMessageChannel()

	messageChannel.sendMessage('test')
})()
