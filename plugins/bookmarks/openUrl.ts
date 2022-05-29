import { EnvironmentPlatform, spawn } from 'einstein'

export const openUrl = async (platform: EnvironmentPlatform, url: string) => {
	switch (platform) {
	case 'linux':
		spawn(`xdg-open ${url}`)
		break
	case 'macos':
		spawn('open', { argv: [ url ] })
		break
	case 'windows': {
		const encodedCommand = Buffer.from([
			'Start',
			`"${url}"`,
		].join(' '), 'utf16le').toString('base64')
		const powershellArgs = [
			'-NoProfile',
			'-NonInteractive',
			'-WindowStyle', 'Hidden',
			'–ExecutionPolicy', 'Bypass',
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
