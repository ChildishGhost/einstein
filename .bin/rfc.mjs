#!/usr/bin/env node
// Mechanical RFC steps (RFC-0001/R24).
// Usage: node .bin/rfc.mjs new <kebab-title>       next-numbered draft from the template
//        node .bin/rfc.mjs status <NNNN> <status>  change status, regenerate the index
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { INDEX_PATTERN, parseFrontMatter, TRANSITIONS, writeRfcIndex } from './docs-check.mjs'
import { isCurrent, stampTranslation } from './sync-translation.mjs'

const RFC_DIR = 'docs/rfc'
const TEMPLATE = `${RFC_DIR}/0000-template.md`
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Template placeholders that a new RFC leaves out of its front-matter.
const EMPTY_VALUE = /^[a-z-]+: (null|\[\])$/

const translationPath = (path) => path.replace(/\.md$/, '.zh-tw.md')

/** Runs `change`, then re-stamps only the translations of `paths` that were current before it. */
const keepingCurrent = async (root, paths, change) => {
	const current = paths.map((path) => join(root, translationPath(path))).filter((path) => existsSync(path) && isCurrent(path))
	await change()
	for (const path of current) {
		stampTranslation(path)
	}
}

const updateIndex = (root) =>
	keepingCurrent(root, [ `${RFC_DIR}/README.md` ], async () => {
		const block = readFileSync(await writeRfcIndex(root), 'utf8').match(INDEX_PATTERN)[0]
		const translation = join(root, RFC_DIR, 'README.zh-tw.md')
		if (existsSync(translation)) {
			writeFileSync(translation, readFileSync(translation, 'utf8').replace(INDEX_PATTERN, block))
		}
	})

const rfcFiles = (root) =>
	readdirSync(join(root, RFC_DIR)).filter((name) => /^\d{4}-.*\.md$/.test(name) && !name.endsWith('.zh-tw.md'))

/** The RFC skeleton inside a template's yaml code block, filled in. */
const fromTemplate = (template, { number, title, today }) => {
	const [ , front, body ] = template.match(/```yaml\n---\n([\s\S]*?)\n---\n```\n\n([\s\S]*)$/)
	const fields = front
		.split('\n')
		.map((line) => line.replace(/\s+#.*$/, ''))
		.filter((line) => !EMPTY_VALUE.test(line))
		.map((line) =>
			line
				.replace(/^rfc: .*/, `rfc: ${number}`)
				.replace(/^title: .*/, `title: ${title}`)
				.replace(/^created: .*/, `created: ${today}`),
		)
	const heading = body.replace(/^# RFC NNNN(: |：).*$/m, (_, separator) => `# RFC ${number}${separator}${title}`)
	return `---\n${fields.join('\n')}\n---\n\n${heading}`
}

/** Creates the next-numbered draft and its untranslated `.zh-tw.md`; returns the RFC path. */
export const createRfc = async (root, kebabTitle, { today = new Date().toISOString().slice(0, 10) } = {}) => {
	if (!KEBAB.test(kebabTitle ?? '')) {
		throw new Error(`title must be kebab-case: ${kebabTitle}`)
	}
	const last = Math.max(0, ...rfcFiles(root).map((name) => Number(name.slice(0, 4))))
	const number = String(last + 1).padStart(4, '0')
	const title = kebabTitle.replaceAll('-', ' ').replace(/^./, (first) => first.toUpperCase())
	const name = `${number}-${kebabTitle}.md`
	const path = `${RFC_DIR}/${name}`

	const values = { number, title, today }
	writeFileSync(join(root, path), fromTemplate(readFileSync(join(root, TEMPLATE), 'utf8'), values))
	// "pending" never matches a hash, so R2 fails until someone translates and stamps it.
	const note = `<!-- source-sha256: pending -->\n\n> 本文為 [${name}](${name}) 的翻譯，內容以英文版為準。\n\n`
	writeFileSync(
		join(root, translationPath(path)),
		note + fromTemplate(readFileSync(join(root, translationPath(TEMPLATE)), 'utf8'), values),
	)
	await updateIndex(root)
	return path
}

/** Sets an RFC's status in the RFC and its translation, then regenerates the index. */
export const setStatus = async (root, number, status) => {
	const name = rfcFiles(root).find((file) => file.startsWith(`${number}-`))
	if (!name) {
		throw new Error(`no RFC ${number}`)
	}
	const path = `${RFC_DIR}/${name}`
	const from = parseFrontMatter(readFileSync(join(root, path), 'utf8'))?.status
	if (!TRANSITIONS[from]?.includes(status)) {
		throw new Error(`RFC ${number}: ${from} → ${status} is not allowed (RFC-0001/R5)`)
	}
	await keepingCurrent(root, [ path ], () => {
		for (const file of [ path, translationPath(path) ].map((file) => join(root, file)).filter(existsSync)) {
			writeFileSync(file, readFileSync(file, 'utf8').replace(/^status: .*$/m, `status: ${status}`))
		}
	})
	await updateIndex(root)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
	const [ command, ...args ] = process.argv.slice(2)
	try {
		if (command === 'new') {
			console.log(`rfc:new: created ${await createRfc(root, args[0])} (translate it next)`)
		} else if (command === 'status') {
			await setStatus(root, ...args)
			console.log(`rfc:status: RFC ${args[0]} is ${args[1]}`)
		} else {
			throw new Error('usage: rfc.mjs new <kebab-title> | status <NNNN> <status>')
		}
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
