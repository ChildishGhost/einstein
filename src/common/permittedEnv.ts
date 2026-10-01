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
	'EDITOR', 'VISUAL', 'BROWSER',
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

/** The variables of `env` that plugins and the programs they start may see (RFC-0003/R6). */
export const permitEnv = (env: Record<string, string | undefined>) =>
	Object.fromEntries(Object.entries(env).filter(([ name ]) => allowList.includes(name))) as Record<string, string>
