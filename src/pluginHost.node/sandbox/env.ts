import { env } from 'node:process'

// prettier-ignore
const allowList = [
	'BLOCKSIZE',
	'COLORFGBG', 'COLORTERM',
	'CHARSET', 'LANG', 'LANGUAGE',
	'LC_ALL', 'LC_COLLATE', 'LC_CTYPE',
	'LC_MESSAGES', 'LC_MONETARY', 'LC_NUMERIC', 'LC_TIME',
	'LINES COLUMNS',
	'LSCOLORS',
	'SSH_AUTH_SOCK',
	'TZ',
	'DISPLAY', 'XAUTHORIZATION', 'XAUTHORITY',
	'EDITOR', 'VISUAL',
	'HOME', 'MAIL', 'PATH',
	// Linux
	'DBUS_SESSION_BUS_ADDRESS',
	'XAPPLRESDIR', 'XFILESEARCHPATH', 'XUSERFILESEARCHPATH',
	'QTDIR', 'KDEDIR',
	'XDG_SESSION_COOKIE',
	'XMODIFIERS', 'GTK_IM_MODULE', 'QT_IM_MODULE', 'QT_IM_SWITCHER',
	// Windows
	'APPDATA', 'LOCALAPPDATA',
	'ProgramData', 'ProgramFiles',
	'SystemDrive', 'SystemRoot',
]

/**
 * Permitted environment variables
 *
 * This will also revert environment variables that changed by Electron,
 * and unset ELECTRON_RUN_AS_NODE so that the child process can use node/electron based applications.
 *
 * @see https://www.electronjs.org/docs/latest/api/environment-variables#set-by-electron
 */
export const permittedEnv = (() => {
	const originalEnv = { ...env }

	if (originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP) {
		originalEnv.XDG_CURRENT_DESKTOP = originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP
		delete originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP
	}

	delete originalEnv.ELECTRON_RUN_AS_NODE

	return Object.fromEntries(
		Object.entries(originalEnv)
			.filter(([ name ]) => allowList.includes(name))
	)
})()
