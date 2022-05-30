import { openUrlFn } from 'einstein'

import Environment from '@/pluginHost.node/Environment'

import { spawn } from './spawn'

export const openUrl: openUrlFn = async (url: string) => {
	switch (Environment.platform) {
	case 'linux':
		spawn(`xdg-open '${url}'`)
		break
	case 'macos':
		spawn('open', { argv: [ url ] })
		break
	case 'windows': {
		const encodedCommand = Buffer.from([ 'Start', `"${url}"` ].join(' '), 'utf16le').toString('base64')
		const powershellArgs = [
			'-NoProfile',
			'-NonInteractive',
			'-WindowStyle',
			'Hidden',
			'–ExecutionPolicy',
			'Bypass',
			'-EncodedCommand',
			encodedCommand,
		]

		spawn('powershell', {
			argv: powershellArgs,
		})
		break
	}
	default:
		break
	}
}
