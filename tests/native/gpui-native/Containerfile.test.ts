import { describe, it } from '@std/testing/bdd'
import { assert, assertEquals, assertExists, assertMatch } from '@std/assert'

import { readRepoFile } from '../../helpers.ts'

const dir = 'native/gpui-native'

/** Containerfile instructions, with line continuations joined. */
const instructions = (text: string) =>
	text
		.replace(/\\\n/g, ' ')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))

describe('RFC 0008: gpui-native container build', () => {
	it('RFC-0008/R15: one Containerfile cross-builds the addon reproducibly for x86_64 and aarch64 against glibc 2.36', () => {
		const text = readRepoFile(`${dir}/Containerfile`)
		const froms = instructions(text).filter((line) => /^FROM\s/i.test(line))
		const base = froms.find((line) => !/^FROM\s+scratch\b/i.test(line))
		assertExists(base, 'a build stage')
		assertMatch(base, /bookworm/, 'Debian bookworm ships glibc 2.36')
		assertMatch(base, /@sha256:[0-9a-f]{64}\b/, 'the base image is pinned by digest')
		assertMatch(froms.at(-1)!, /^FROM\s+scratch\b/i, 'the last stage holds only the addon, for --output')
		assertMatch(text, /(rust|toolchain)[^\n]*\b1\.\d+\.\d+\b/i, 'the Rust toolchain is pinned to an exact version')
		assertMatch(text, /--locked\b/)
		assertMatch(text, /\bzig\b/)
		for (const target of ['x86_64-unknown-linux-gnu', 'aarch64-unknown-linux-gnu']) {
			assert(text.includes(target), target)
		}
		assertMatch(text, /2\.36/, 'glibc 2.36 is the oldest supported')
		assertMatch(text, /patches/, 'the patches are applied in the build')
		const { commit } = JSON.parse(readRepoFile(`${dir}/upstream.json`))
		for (const hash of text.match(/\b[0-9a-f]{40}\b/g) ?? []) {
			assertEquals(hash, commit, 'the only upstream pin is upstream.json')
		}
	})
})
