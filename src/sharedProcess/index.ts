import 'source-map-support/register'

import useMessageTunnel from '@/sharedProcess/useMessageTunnel'
//
;(async () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const messageTunnel = await useMessageTunnel()
})()
