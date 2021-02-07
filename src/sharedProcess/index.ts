import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'
import { ipcRenderer } from 'electron'
import MessageChannel from '@/sharedProcess/MessageChannel'

;(async () => {
	const pluginManager = new PluginManager()
	pluginManager
		.register(new ExamplePlugin())
		.setup()

	const messagePort = await MessageChannel()
	messagePort.onmessage = ({ data }) => {

	}
})()
