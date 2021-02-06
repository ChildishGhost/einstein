import { ipcRenderer } from 'electron'
import { AppContext, onMounted, onUpdated, reactive, toRaw, watch } from 'vue'

const desiredSize = reactive({})

const resizeWindow = async (size : any) => {
	await ipcRenderer.invoke('resizeWindow', toRaw(size))
}

export default ($app : Element) => {
	const calculateDesiredSize = () => {
		Object.assign(desiredSize, {
			width: $app.clientWidth,
			height: $app.clientHeight,
		})
	}

	onMounted(() => calculateDesiredSize())
	watch(desiredSize, resizeWindow)

	return {
		calculateDesiredSize,
		desiredSize,
	}
}
