import { join } from '@std/path'
import { describe, it } from '@std/testing/bdd'
import { assertEquals, assertMatch } from '@std/assert'

import { run, tempDir } from '../helpers.ts'

const names = (dir: string) => [...Deno.readDirSync(dir)].map((entry) => entry.name)

describe('RFC 0008: desktop entry', () => {
	it('RFC-0008/R13: one command installs the desktop entry the portal needs, another removes exactly that file', async () => {
		const dataHome = tempDir()
		const applications = join(dataHome, 'applications')
		Deno.mkdirSync(applications)
		Deno.writeTextFileSync(join(applications, 'other.desktop'), '[Desktop Entry]\n')
		const env = { XDG_DATA_HOME: dataHome }

		const install = await run(['task', 'desktop-entry:install'], { env })
		assertEquals(install.code, 0, install.stderr)
		const added = names(applications).filter((name) => name !== 'other.desktop')
		assertEquals(added.length, 1, added.join(', '))
		assertMatch(added[0], /^[a-z0-9-]+(\.[a-zA-Z0-9-]+){2,}\.desktop$/, 'the portal needs a reverse-DNS application id')
		const entry = Deno.readTextFileSync(join(applications, added[0]))
		assertMatch(entry, /^\[Desktop Entry\]$/m)
		assertMatch(entry, /^Type=Application$/m)
		assertMatch(entry, /^Exec=.+$/m)

		const remove = await run(['task', 'desktop-entry:remove'], { env })
		assertEquals(remove.code, 0, remove.stderr)
		assertEquals(names(applications), ['other.desktop'])
	})
})
