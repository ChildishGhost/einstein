import { UID } from '@/api/plugin'

type PluginEvent = {
	pluginUid: UID
	type: string
	data?: any
}

export default PluginEvent
