import { describe, it } from '@std/testing/bdd'
import { assert, assertMatch } from '@std/assert'

import { readRepoFile } from './helpers.ts'

type Task = string | { command?: string; dependencies?: string[] }

/** A task's command plus those of the tasks it depends on. */
const expandTask = (all: Record<string, Task>, name: string, seen = new Set<string>()): string => {
	if (seen.has(name) || !(name in all)) {
		return ''
	}
	seen.add(name)
	const task = typeof all[name] === 'string' ? { command: all[name] } : all[name]
	const inner = (task.command ?? '').match(/deno task ([\w:-]+)/g)?.map((call) => call.split(' ')[2]) ?? []
	return [task.command ?? '', ...[...(task.dependencies ?? []), ...inner].map((dep) => expandTask(all, dep, seen))]
		.join('\n')
}

describe('RFC 0008: Deno pin and tasks', () => {
	it('RFC-0008/R20: the Deno version is pinned, one task builds everything, another runs from the source tree and a third runs the Deno tests', () => {
		assertMatch(readRepoFile('.tool-versions'), /^deno \d+\.\d+\.\d+$/m, 'an exact version, as asdf and mise read it')
		const all: Record<string, Task> = JSON.parse(readRepoFile('deno.json')).tasks ?? {}
		const build = expandTask(all, 'build')
		for (const part of [/\bvite\b/, /ui\.deno/, /main\.deno/, /pluginHost\.deno/, /plugins/]) {
			assertMatch(build, part, `deno task build covers ${part}`)
		}
		assertMatch(expandTask(all, 'dev'), /src\/main\.deno\//, 'deno task dev starts main from source')
		assertMatch(expandTask(all, 'test'), /\bdeno test\b/, "deno task test uses Deno's test runner")
	})
})

describe('RFC 0008: CI', () => {
	it('RFC-0008/R21: CI builds the Electron stack and, on Linux, the Deno stack and the gpui-native addon, and runs the Deno tests', () => {
		const ci = readRepoFile('.github/workflows/build.yaml').replace(/\\\n\s*/g, ' ')
		assertMatch(ci, /runs-on:\s*ubuntu/)
		assertMatch(ci, /npm run build\b/, 'the Electron build is kept')
		assertMatch(ci, /denoland\/setup-deno@/)
		assertMatch(ci, /deno-version-file:\s*\.tool-versions/, 'CI uses the pinned Deno')
		assertMatch(ci, /deno task build\b/)
		assertMatch(ci, /deno task test\b/, 'the Deno tests run in CI')
		assertMatch(ci, /deno task native:build\b/, 'CI builds the addon with the same task as locally')
		const tasks: Record<string, Task> = JSON.parse(readRepoFile('deno.json')).tasks ?? {}
		const install = [...ci.matchAll(/deno task ([\w:-]+)/g)].find(([, name]) =>
			/\bdeno install\b/.test(expandTask(tasks, name))
		)
		assert(install, 'CI installs the UI dependencies with a Deno task')
		const order = [
			['deno task native:fetch', ci.indexOf('deno task native:fetch')],
			['deno task native:build', ci.search(/deno task native:build\b/)],
			[install[0], install.index],
			['deno task build', ci.search(/deno task build\b/)],
			['deno task test', ci.search(/deno task test\b/)],
		] as const
		order.forEach(([step, at], i) => {
			assert(at >= 0, `CI runs ${step}`)
			assert(
				i === 0 || order[i - 1][1] < at,
				`${order[i - 1]?.[0]} runs before ${step}: the UI bundle needs the built gpui-native packages installed, ` +
					'and the tests need the upstream checkout',
			)
		})
		const task = expandTask(tasks, 'native:build')
		const recipe = [task, ...(task.match(/[\w./-]+\.m?ts\b/g) ?? []).map(readRepoFile)].join('\n')
		assertMatch(recipe, /native\/gpui-native\/Containerfile/, "that task builds with the repository's container recipe")
	})
})
