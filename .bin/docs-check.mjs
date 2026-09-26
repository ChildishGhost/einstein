#!/usr/bin/env node
// docs:check — enforces RFC 0001 (docs/rfc/0001-rfc-process.md).
// Usage: node .bin/docs-check.mjs [--base <ref>]   check (default base: merge-base with origin/dev)
//        node .bin/docs-check.mjs --index          regenerate the RFC index (R19)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RFC_DIR = 'docs/rfc'
const RFC_NAME = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
const TEMPLATE = '0000'
const REQUIRED_FIELDS = [ 'rfc', 'title', 'status', 'created', 'references' ]
const GATES = [ 'accept', 'accept, verify' ]
export const TRANSITIONS = {
	draft: [ 'draft', 'accepted', 'rejected', 'withdrawn' ],
	accepted: [ 'accepted', 'implemented', 'superseded' ],
	implemented: [ 'implemented', 'superseded' ],
	rejected: [ 'rejected' ],
	withdrawn: [ 'withdrawn' ],
	superseded: [ 'superseded' ],
}
const INDEX_START = '<!-- rfc-index:start -->'
const INDEX_END = '<!-- rfc-index:end -->'
// .claude holds worktrees; only its skills are checked.
const SKIP_DIRS = new Set([ '.git', '.claude', '.drafts', 'node_modules', 'dist' ])
const SKILLS_DIR = '.claude/skills'
const GATE_SKILL = `${SKILLS_DIR}/rfc-cascade/SKILL.md`
const TEST_FILE = /(\.test\.[cm]?[jt]sx?|_test\.[jt]sx?)$/

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

const git = (root, ...args) =>
	execFileSync('git', [ '-C', root, ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] }).trim()

const tryGit = (root, ...args) => {
	try {
		return git(root, ...args)
	} catch {
		return null
	}
}

const walk = (root, dir = '') => {
	const full = join(root, dir)
	if (!existsSync(full)) {
		return []
	}
	return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
		const path = dir ? `${dir}/${entry.name}` : entry.name
		if (entry.isDirectory()) {
			return SKIP_DIRS.has(entry.name) ? [] : walk(root, path)
		}
		return [ path ]
	})
}

export const parseFrontMatter = (text) => {
	if (!text.startsWith('---\n')) {
		return null
	}
	const end = text.indexOf('\n---\n', 3)
	if (end === -1) {
		return null
	}
	const fields = {}
	for (const line of text.slice(4, end).split('\n')) {
		const match = line.match(/^([a-z-]+):\s*(.*)$/)
		if (match) {
			fields[match[1]] = match[2]
		}
	}
	return fields
}

const listField = (value) =>
	(value ?? '')
		.replace(/^\[|\]$/g, '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)

const requirementsOf = (text) =>
	[ ...text.matchAll(/^- \*\*(R\d+)\*\*( \*\(manual\)\*)?/gm) ].map(([ , id, manual ]) => ({ id, manual: !!manual }))

/** Markdown with code blocks and inline code removed, so examples are not taken as links. */
const proseOf = (text) => text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '')

const linksOf = (text) =>
	[ ...proseOf(text).matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g) ]
		.map(([ , target ]) => target)
		.filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#'))

const importsOf = (text) => [ ...proseOf(text).matchAll(/^@(\S+)\s*$/gm) ].map(([ , path ]) => path)

const resolveLink = (root, file, target) => {
	const path = target.split('#')[0]
	return path.startsWith('/') ? join(root, path) : resolve(root, dirname(file), path)
}

const translationHeader = (text) => text.match(/^<!-- source-sha256: (\S*) -->\n/)?.[1]

const readRfcs = (root) => {
	const dir = join(root, RFC_DIR)
	if (!existsSync(dir)) {
		return []
	}
	return readdirSync(dir)
		.filter((name) => name.endsWith('.md') && !name.endsWith('.zh-tw.md') && !/^README\.md$/.test(name))
		.sort()
		.map((name) => {
			const text = readFileSync(join(dir, name), 'utf8')
			return { name, path: `${RFC_DIR}/${name}`, number: name.slice(0, 4), text, fields: parseFrontMatter(text) }
		})
}

const indexBlock = (rfcs) =>
	[
		INDEX_START,
		'| RFC | Title | Status |',
		'|---|---|---|',
		...rfcs
			.filter(({ name }) => RFC_NAME.test(name))
			.map(({ name, fields }) => `| [${fields?.rfc ?? ''}](${name}) | ${fields?.title ?? ''} | ${fields?.status ?? ''} |`),
		INDEX_END,
	].join('\n')

export const INDEX_PATTERN = new RegExp(`${INDEX_START}[\\s\\S]*?${INDEX_END}`)

/** Regenerates the table between the index markers in docs/rfc/README.md (RFC-0001/R19). */
export const writeRfcIndex = async (root) => {
	const path = join(root, RFC_DIR, 'README.md')
	const block = indexBlock(readRfcs(root))
	const current = existsSync(path) ? readFileSync(path, 'utf8') : '# RFCs\n\n'
	const next = INDEX_PATTERN.test(current)
		? current.replace(INDEX_PATTERN, block)
		: `${current.trimEnd()}\n\n${block}\n`
	writeFileSync(path, next)
	return path
}

const defaultBase = (root) =>
	tryGit(root, 'rev-parse', '--verify', '--quiet', 'origin/dev') ? tryGit(root, 'merge-base', 'HEAD', 'origin/dev') : null

/** Front-matter lines that may always change (R6). */
const withoutMutableFields = (text) =>
	text
		.split('\n')
		.filter((line) => !/^(status|superseded-by):/.test(line))

const isSubsequence = (needle, haystack) => {
	let i = 0
	for (const line of haystack) {
		if (i < needle.length && line === needle[i]) {
			i++
		}
	}
	return i === needle.length
}

const beforeErrata = (lines) => {
	const index = lines.indexOf('## Errata')
	return (index === -1 ? lines : lines.slice(0, index)).join('\n')
}

/**
 * Checks the repository at `root` against RFC 0001.
 * `base`: published ref for R5/R6 (default: merge-base with origin/dev; `null` skips those checks).
 * Returns problems as `{ rule, file, message }`.
 */
export const checkRepository = async (root, { base } = {}) => {
	const problems = []
	const report = (rule, file, message) => problems.push({ rule, file, message })
	const publishedBase = base === undefined ? defaultBase(root) : base

	const files = [ ...walk(root), ...walk(root, SKILLS_DIR) ]
	const skills = files.filter((path) => new RegExp(`^${SKILLS_DIR}/[^/]+/SKILL\\.md$`).test(path))
	const testsText = files
		.filter((path) => path.startsWith('tests/') || TEST_FILE.test(path))
		.map((path) => readFileSync(join(root, path), 'utf8'))
		.join('\n')

	const rfcs = readRfcs(root)
	for (const rfc of rfcs) {
		const { name, path, number, text, fields } = rfc
		if (!RFC_NAME.test(name)) {
			report('R1', path, 'RFC file name must be NNNN-kebab-title.md')
			continue
		}

		const translation = path.replace(/\.md$/, '.zh-tw.md')
		if (!existsSync(join(root, translation))) {
			report('R2', path, `missing translation ${translation}`)
		} else if (translationHeader(readFileSync(join(root, translation), 'utf8')) !== sha256(text)) {
			report('R2', translation, `stale: source-sha256 does not match ${path}`)
		}

		if (!fields || REQUIRED_FIELDS.some((field) => !(field in fields))) {
			report('R3', path, `front-matter needs ${REQUIRED_FIELDS.join(', ')}`)
			continue
		}
		if (!(fields.status in TRANSITIONS)) {
			report('R3', path, `unknown status "${fields.status}"`)
		}
		if ('gates' in fields && !GATES.includes(fields.gates)) {
			report('R3', path, `gates must be one of: ${GATES.join(' | ')}`)
		}
		if (fields.rfc !== number) {
			report('R3', path, `rfc: ${fields.rfc} does not match the file number ${number}`)
		}

		for (const reference of listField(fields.references)) {
			if (reference >= number && number !== TEMPLATE) {
				report('R4', path, `references RFC ${reference}, which is not older`)
			}
		}
		for (const target of linksOf(text)) {
			const linked = target.match(/^(?:\.\/)?(\d{4})-[^/]*\.md(?:#.*)?$/)?.[1]
			if (linked && linked >= number && linked !== number) {
				report('R4', path, `links to RFC ${linked}, which is not older`)
			}
		}

		if (number === TEMPLATE) {
			continue
		}

		const requirements = requirementsOf(text)
		const seen = new Set()
		for (const { id } of requirements) {
			if (seen.has(id)) {
				report('R7', path, `duplicate requirement ${id}`)
			}
			seen.add(id)
		}

		if ([ 'accepted', 'implemented' ].includes(fields.status) && !fields.retroactive) {
			for (const { id, manual } of requirements) {
				if (!manual && !new RegExp(`RFC-${number}/${id}(?!\\d)`).test(testsText)) {
					report('R14', path, `RFC-${number}/${id} has no citing test`)
				}
			}
		}

		const published = publishedBase ? tryGit(root, 'show', `${publishedBase}:${path}`) : null
		if (published !== null) {
			const from = parseFrontMatter(`${published}\n`)?.status
			if (from in TRANSITIONS && !TRANSITIONS[from].includes(fields.status)) {
				report('R5', path, `status ${from} → ${fields.status} is not allowed`)
			}
			const before = withoutMutableFields(`${published}\n`)
			const after = withoutMutableFields(text)
			const nonBlank = (lines) => lines.filter((line) => line.trim() !== '')
			if (from === 'accepted' && !isSubsequence(nonBlank(before), nonBlank(after))) {
				report('R6', path, 'a published accepted RFC may only grow (additions only)')
			}
			if ([ 'implemented', 'rejected', 'withdrawn', 'superseded' ].includes(from) && beforeErrata(before) !== beforeErrata(after)) {
				report('R6', path, `a published ${from} RFC may only change status, superseded-by and Errata`)
			}
		}
	}

	if (publishedBase) {
		const publishedNames = (tryGit(root, 'ls-tree', '--name-only', publishedBase, `${RFC_DIR}/`) ?? '')
			.split('\n')
			.map((path) => path.slice(RFC_DIR.length + 1))
			.filter((name) => RFC_NAME.test(name))
		for (const name of publishedNames) {
			if (!rfcs.some((rfc) => rfc.name === name)) {
				report('R6', `${RFC_DIR}/${name}`, 'a published RFC cannot be removed')
			}
		}
	}

	// R19: generated index
	if (rfcs.length > 0) {
		const indexPath = `${RFC_DIR}/README.md`
		const index = existsSync(join(root, indexPath)) ? readFileSync(join(root, indexPath), 'utf8') : null
		if (index?.match(INDEX_PATTERN)?.[0] !== indexBlock(rfcs)) {
			report('R19', indexPath, 'RFC index is missing or stale; run npm run docs:index')
		}
	}

	// R14: translations of human docs
	const humanDocs = files.filter(
		(path) =>
			(path === 'README.md' || (path.startsWith('docs/') && path.endsWith('.md'))) &&
			!path.endsWith('.zh-tw.md') &&
			!rfcs.some((rfc) => rfc.path === path),
	)
	for (const path of humanDocs) {
		const translation = path.replace(/\.md$/, '.zh-tw.md')
		if (!existsSync(join(root, translation))) {
			report('R14', path, `missing translation ${translation}`)
		} else if (translationHeader(readFileSync(join(root, translation), 'utf8')) !== sha256(readFileSync(join(root, path)))) {
			report('R14', translation, `stale: source-sha256 does not match ${path}`)
		}
	}

	// R14: links and @path imports
	const linkedDocs = files.filter(
		(path) =>
			/^README(\.zh-tw)?\.md$/.test(path) ||
			(path.startsWith('docs/') && path.endsWith('.md')) ||
			path === 'AGENTS.md' ||
			(path.startsWith('.agents/') && path.endsWith('.md')) ||
			(path.startsWith(`${SKILLS_DIR}/`) && path.endsWith('.md')),
	)
	for (const path of linkedDocs) {
		const text = readFileSync(join(root, path), 'utf8')
		for (const target of linksOf(text)) {
			if (!existsSync(resolveLink(root, path, target))) {
				report('R14', path, `broken link ${target}`)
			}
		}
		for (const target of importsOf(text)) {
			if (!existsSync(resolveLink(root, path, target))) {
				report('R14', path, `broken import @${target}`)
			}
		}
	}

	// R9: skills are discoverable by name and description
	for (const path of skills) {
		const fields = parseFrontMatter(readFileSync(join(root, path), 'utf8'))
		if (fields?.name !== path.split('/').at(-2) || !fields?.description) {
			report('R9', path, 'skill front-matter needs name (equal to its folder) and description')
		}
	}

	// R9: one agent file under two names; every topic file imported, every skill linked
	const hasAgents = existsSync(join(root, 'AGENTS.md'))
	const claude = join(root, 'CLAUDE.md')
	const claudeStat = existsSync(claude) || isBrokenLink(claude) ? lstatSync(claude) : null
	if (hasAgents || claudeStat) {
		if (!claudeStat?.isSymbolicLink() || readlinkSync(claude) !== 'AGENTS.md') {
			report('R9', 'CLAUDE.md', 'must be a symlink to AGENTS.md')
		}
	}
	if (hasAgents) {
		const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8')
		if (importsOf(agents).includes('CLAUDE.md') || linksOf(agents).includes('CLAUDE.md')) {
			report('R9', 'AGENTS.md', 'must not reference CLAUDE.md')
		}
		const imported = new Set(importsOf(agents).map((target) => relative(root, resolveLink(root, 'AGENTS.md', target))))
		for (const path of files.filter((file) => file.startsWith('.agents/') && file.endsWith('.md'))) {
			if (!imported.has(path)) {
				report('R9', path, 'not imported by AGENTS.md (add @' + path + ')')
			}
		}
		const linked = new Set(linksOf(agents).map((target) => relative(root, resolveLink(root, 'AGENTS.md', target))))
		for (const path of skills.filter((skill) => !linked.has(skill))) {
			report('R9', path, 'skill not linked from AGENTS.md')
		}

		// R23: only a human can invoke the gate skill
		const gate = existsSync(join(root, GATE_SKILL)) ? parseFrontMatter(readFileSync(join(root, GATE_SKILL), 'utf8')) : null
		if (gate?.['disable-model-invocation'] !== 'true') {
			report('R23', GATE_SKILL, 'rfc-cascade skill must exist with disable-model-invocation: true')
		}
	}

	return problems
}

const isBrokenLink = (path) => {
	try {
		return lstatSync(path).isSymbolicLink()
	} catch {
		return false
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
	const args = process.argv.slice(2)
	if (args.includes('--index')) {
		console.log(`docs:index: wrote ${relative(root, await writeRfcIndex(root))}`)
	} else {
		const baseIndex = args.indexOf('--base')
		const problems = await checkRepository(root, baseIndex === -1 ? {} : { base: args[baseIndex + 1] })
		for (const { rule, file, message } of problems) {
			console.error(`RFC-0001/${rule} ${file}: ${message}`)
		}
		console.log(problems.length === 0 ? 'docs:check: ok' : `docs:check: ${problems.length} problem(s)`)
		process.exitCode = problems.length === 0 ? 0 : 1
	}
}
