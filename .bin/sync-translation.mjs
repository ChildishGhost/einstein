#!/usr/bin/env node
// Usage: node .bin/sync-translation.mjs <file.zh-tw.md>...
// Stamps each translation with the SHA-256 of its English source (RFC-0001/R2).
// Run only after the translation content has been updated to match the source.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const HEADER = /^<!-- source-sha256: \S* -->\n/

export const sourceOf = (translation) => translation.replace(/\.zh-tw\.md$/, '.md')

const hashOf = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

/** Whether the translation's stamp matches its source as it is on disk now. */
export const isCurrent = (translation) =>
	readFileSync(translation, 'utf8').match(HEADER)?.[0] === `<!-- source-sha256: ${hashOf(sourceOf(translation))} -->\n`

export const stampTranslation = (translation) => {
	if (!translation.endsWith('.zh-tw.md')) {
		throw new Error(`not a translation: ${translation}`)
	}
	const hash = hashOf(sourceOf(translation))
	const body = readFileSync(translation, 'utf8').replace(HEADER, '')
	writeFileSync(translation, `<!-- source-sha256: ${hash} -->\n${body}`)
	return hash
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	for (const translation of process.argv.slice(2)) {
		const hash = stampTranslation(translation)
		console.log(`${translation} ← ${sourceOf(translation)} (${hash.slice(0, 12)})`)
	}
}
