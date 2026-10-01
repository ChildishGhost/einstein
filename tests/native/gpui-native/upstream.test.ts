import { existsSync, walkSync } from '@std/fs'
import { join, relative } from '@std/path'
import { describe, it } from '@std/testing/bdd'
import { assert, assertEquals, assertMatch } from '@std/assert'

import { git, readRepoFile, repo, repoPath, run, tempDir } from '../../helpers.ts'

const dir = 'native/gpui-native'
const cache = repoPath(`${dir}/.cache/upstream`)

describe('RFC 0008: gpui-native pin and patches', () => {
	it('RFC-0008/R14: gpui-native is pinned to an upstream commit and the patches apply to it in order, with no vendored source', async () => {
		const { repository, commit } = JSON.parse(readRepoFile(`${dir}/upstream.json`))
		assertMatch(repository, /^https:\/\//)
		assertMatch(commit, /^[0-9a-f]{40}$/, 'a full commit hash, not a branch or tag')
		const patches = [...Deno.readDirSync(repoPath(`${dir}/patches`))].map((entry) => entry.name)
			.filter((name) => name.endsWith('.patch')).sort()
		assert(patches.length > 0, 'Einstein’s changes live as patch files')
		const source = [
			...walkSync(repoPath(dir), { includeDirs: false, match: [/(^|\/)Cargo\.toml$|\.rs$/], skip: [/\/\.cache$/] }),
		].map((entry) => relative(repoPath(dir), entry.path))
		assertEquals(source, [], 'changes live only as patches')

		const tracked = (await git(repo, 'ls-files', '--', dir)).split('\n')
		for (const path of ['upstream.json', ...patches.map((name) => `patches/${name}`)]) {
			assert(tracked.includes(`${dir}/${path}`), `${dir}/${path} is committed, so every checkout builds the same addon`)
		}

		assert(existsSync(join(cache, '.git')), `no upstream checkout in ${cache}: run \`deno task native:fetch\``)
		// A throwaway index: the check needs no network and leaves the cached checkout as it is.
		const env = { GIT_INDEX_FILE: join(tempDir(), 'index') }
		const steps = [
			['read-tree', commit],
			...patches.map((name) => ['apply', '--cached', repoPath(`${dir}/patches/${name}`)]),
		]
		for (const args of steps) {
			const result = await run(args, { command: 'git', cwd: cache, env })
			assertEquals(result.code, 0, `git ${args.join(' ')}:\n${result.stderr}`)
		}
	})
})
