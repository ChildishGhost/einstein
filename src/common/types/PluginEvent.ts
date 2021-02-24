import { UID } from 'einstein'

type PluginEvent = {
	pluginUid: UID
	type: string
	data?: any
}

export default PluginEvent
