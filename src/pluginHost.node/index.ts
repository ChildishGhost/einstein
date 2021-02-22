import 'source-map-support/register'

import useMessageTunnel from '@/pluginHost.node/useMessageTunnel'
//
;(async () => {
	process.on('message', ({ type }) => {
		if (type === 'pluginHost:exit') {
			process.exit()
		}
	})

	const messageTunnel = await useMessageTunnel()

	messageTunnel.sendMessage('test', 'hi')
})()
