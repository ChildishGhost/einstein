#!/usr/bin/env -S deno run --no-prompt --allow-env=XDG_DATA_HOME,HOME --allow-write
// Installs or removes the desktop entry the XDG global-shortcuts portal matches against the app id (RFC-0008/R13).
import { fromFileUrl, isAbsolute, join } from '@std/path'

import { appId } from '../src/common/appId.ts'

const xdgDataHome = Deno.env.get('XDG_DATA_HOME')
const dataHome = xdgDataHome && isAbsolute(xdgDataHome) ? xdgDataHome : join(Deno.env.get('HOME') ?? '', '.local/share')
const applications = join(dataHome, 'applications')
const file = join(applications, `${appId}.desktop`)

// Desktop Entry Exec quoting, then string-value escaping of backslashes.
const quote = (arg: string) => `"${arg.replace(/[\\"`$]/g, '\\$&')}"`.replaceAll('\\', '\\\\').replaceAll('%', '%%')

const action = Deno.args[0]
if (action === 'install') {
	const config = fromFileUrl(new URL('../deno.json', import.meta.url))
	Deno.mkdirSync(applications, { recursive: true })
	Deno.writeTextFileSync(
		file,
		[
			'[Desktop Entry]',
			'Type=Application',
			'Name=Einstein',
			'Comment=Spotlight-like launcher',
			`Exec=${[Deno.execPath(), 'task', '--config', config, 'dev'].map(quote).join(' ')}`,
			'Terminal=false',
			'Categories=Utility;',
			'',
		].join('\n'),
	)
	console.log(`installed ${file}`)
} else if (action === 'remove') {
	try {
		Deno.removeSync(file)
		console.log(`removed ${file}`)
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error
		}
	}
} else {
	console.error('usage: desktop-entry.mts install|remove')
	Deno.exit(2)
}
