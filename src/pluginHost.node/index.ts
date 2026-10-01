import 'source-map-support/register'

import { join as joinPath } from 'path'

import { UID } from 'einstein'

import PerformSearchReply from '@/common/types/PerformSearchReply'
import PluginEvent from '@/common/types/PluginEvent'
import PluginManager from '@/pluginHost.node/PluginManager'
import rankResults from '@/pluginHost.node/rankResults'
import useApp from '@/pluginHost.node/useApp'
import useMessageTunnel from '@/pluginHost.node/useMessageTunnel'

const app = useApp()
const pluginManager = new PluginManager(app)

;(async () => {
	process.on('message', ({ type }) => {
		if (type === 'pluginHost:exit') {
			process.exit()
		}
	})

	const messageTunnel = await useMessageTunnel()

	await pluginManager.loadPlugins()

	messageTunnel.register('plugin:filePath', ({ uid, path }: { uid: UID; path: string }) => {
		const plugin = pluginManager.getPlugin(uid)

		if (!plugin) {
			messageTunnel.sendMessage('plugin:filePath', { uid, path })
			return
		}

		const filePath = joinPath(`${plugin.path}`, path)
		messageTunnel.sendMessage('plugin:filePath', { uid, path, filePath })
	})

	messageTunnel.register('plugin:performSearch', async ({ term: rawTerm }) => {
		const { term, result } = await pluginManager.search(rawTerm.trim())

		messageTunnel.sendMessage<PerformSearchReply>('plugin:performSearch:reply', {
			term: rawTerm,
			result: rankResults(term, result),
		})
	})

	messageTunnel.register<PluginEvent>('plugin:event', ({ pluginUid, type, data }) => {
		return pluginManager.notifyPlugin(pluginUid, type, data)
	})

	messageTunnel.sendMessage('plugin:initialized')
})()
