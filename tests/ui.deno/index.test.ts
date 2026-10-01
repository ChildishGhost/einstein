import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'

import { ensureUiBundle, isolatedEnv, sleep, startEntry } from '../helpers.ts'

describe('RFC 0008: result icons', () => {
	it('RFC-0008/R4: the UI process asks main for plugin:// icons and never for other URLs, since it cannot fetch them itself', async () => {
		await ensureUiBundle()
		const { env } = await isolatedEnv()
		// Every permission except the two R4 withholds, so the test does not fix the rest of the UI's set.
		const ui = await startEntry('ui', 'src/ui.deno/index.ts', {
			args: ['--allow-all', '--deny-net', '--deny-run'],
			env,
		})
		try {
			const icon = (id: string, url: string) => ({ pluginUid: 'test.rfc0008.icons', id, title: id, icon: url })
			ui.send('beforeShow')
			ui.send('searchResult', {
				term: '',
				result: [
					icon('plugin', 'plugin://test.rfc0008.icons/assets/icon.png'),
					icon('data', 'data:image/png;base64,AA=='),
					icon('https', 'https://example.com/remote.png'),
					icon('file', 'file:///etc/passwd'),
				],
			})
			const mentions = (text: string) => ui.received.filter((packet) => JSON.stringify(packet).includes(text))
			await ui.waitFor(
				'the UI process to ask main for the plugin:// icon (it draws results from slice 4, RFC-0008/R9)',
				() => mentions('assets/icon.png').length,
				5_000,
			)
			await sleep(500)
			assertEquals([...mentions('example.com'), ...mentions('/etc/passwd')], [], 'other URLs are not shown')
		} finally {
			await ui.stop()
		}
	})
})
