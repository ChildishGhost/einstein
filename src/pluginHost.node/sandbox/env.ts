import { env as originalEnv } from 'node:process'

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
]

export const permittedEnv = Object.fromEntries(
	Object.entries(originalEnv)
		.filter(([ name ]) => allowList.includes(name))
		.filter(([ name ]) => name !== 'ELECTRON_RUN_AS_NODE')
)
