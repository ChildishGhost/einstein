#!/usr/bin/env -S deno run --no-prompt --allow-read --allow-write --allow-run=git
// Fetches the pinned gpui-native commit into native/gpui-native/.cache/upstream and applies the patches in order
// (RFC-0008/R14). Rerunning resets the checkout, so it always matches the pin and the patches.
import { existsSync } from '@std/fs'
import { fromFileUrl, join } from '@std/path'

const dir = fromFileUrl(new URL('../native/gpui-native/', import.meta.url))
const cache = join(dir, '.cache/upstream')
const { repository, commit } = JSON.parse(Deno.readTextFileSync(join(dir, 'upstream.json')))

const run = async (args: string[], stderr: 'inherit' | 'null' = 'inherit') => {
	const { success } = await new Deno.Command('git', { args, cwd: cache, stdin: 'null', stderr }).spawn().status
	return success
}
const must = async (...args: string[]) => {
	if (!(await run(args))) {
		console.error(`git ${args.join(' ')} failed`)
		Deno.exit(1)
	}
}

Deno.mkdirSync(cache, { recursive: true })
if (!existsSync(join(cache, '.git'))) {
	await must('init', '-q')
}
if (!(await run(['cat-file', '-e', `${commit}^{commit}`], 'null'))) {
	await must('fetch', '-q', '--depth', '1', repository, commit)
}
await must('checkout', '-q', '--force', '--detach', commit)
await must('clean', '-q', '-d', '--force')
const patches = [...Deno.readDirSync(join(dir, 'patches'))].map((entry) => entry.name).filter((name) =>
	name.endsWith('.patch')
).sort()
for (const name of patches) {
	await must('apply', '--whitespace=nowarn', join(dir, 'patches', name))
}
console.log(`gpui-native ${commit} with ${patches.length} patch(es) in ${cache}`)
