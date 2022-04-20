import { inject, onMounted, reactive, toRaw, watch } from 'vue'

import { MessageTunnel } from '@/common/message/MessageTunnel'

export default ($app: Element) => {
	const withMessageTunnel = inject<Promise<MessageTunnel>>('$msg')!
	const desiredSize = reactive({})

	const calculateDesiredSize = () => {
		Object.assign(desiredSize, {
			width: $app.clientWidth,
			height: $app.clientHeight,
		})
	}

	const resizeWindow = (size: any) =>
		withMessageTunnel.then((msg) => {
			msg.sendMessage('resizeWindow', toRaw(size))
		})

	const closeWindow = () =>
		withMessageTunnel.then((msg) => {
			msg.sendMessage('closeWindow')
		})

	onMounted(() => calculateDesiredSize())
	watch(desiredSize, resizeWindow)

	return {
		closeWindow,
		calculateDesiredSize,
		desiredSize,
	}
}
