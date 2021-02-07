import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'

const pluginManager = new PluginManager()
pluginManager
	.register(new ExamplePlugin())
	.setup()
