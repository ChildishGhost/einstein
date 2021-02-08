import {
	inject,
	onMounted,
	reactive,
	toRaw,
	watch,
} from 'vue'
import { MessageChannel } from '@/common/MessageChannel'

export default ($app : Element) => {
	const withMessageChannel = inject<Promise<MessageChannel>>('$msg')
	const desiredSize = reactive({})

	const calculateDesiredSize = () => {
		Object.assign(desiredSize, {
			width: $app.clientWidth,
			height: $app.clientHeight,
		})
	}

	const resizeWindow = (size : any) => withMessageChannel.then((msg) => {
		msg.sendMessage('resizeWindow', toRaw(size))
	})

	const closeWindow = () => withMessageChannel.then((msg) => {
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
