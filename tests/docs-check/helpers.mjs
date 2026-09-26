import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { checkRepository } from '../../.bin/docs-check.mjs'

export const rfcText = ({ n, status = 'draft', refs = [], retroactive, reqs = [ 'R1' ], body = '' }) =>
	[
		'---',
		`rfc: ${n}`,
		'title: Fixture',
		`status: ${status}`,
		'created: 2026-09-26',
		`references: [${refs.join(', ')}]`,
		...(retroactive ? [ `retroactive: ${retroactive}` ] : []),
		'---',
		'',
		`# RFC ${n}: Fixture`,
		'',
		'## Requirements',
		// 'R2 (manual)' → review-only requirement (RFC-0001/R7)
		...reqs.map((r) => {
			const [ id, manual ] = r.split(' ')
			return `- **${id}**${manual ? ' *(manual)*' : ''} — requirement`
		}),
		'',
		body,
		'',
		'## Errata',
		'',
	].join('\n')

const stampOf = (source) => `<!-- source-sha256: ${createHash('sha256').update(source).digest('hex')} -->\n`

export const translationOf = (source) => `${stampOf(source)}\n翻譯\n`

/** A translation that keeps the source's front-matter and index block, as real ones do. */
export const fullTranslationOf = (source) => `${stampOf(source)}\n> 翻譯\n\n${source}`

/** Writes files into a fresh directory; every `.md` that needs a translation gets a fresh one unless listed in `untranslated`. */
export const makeRepo = (files, { untranslated = [] } = {}) => {
	const root = mkdtempSync(join(tmpdir(), 'docs-check-'))
	writeFiles(root, files, untranslated)
	return root
}

export const writeFiles = (root, files, untranslated = []) => {
	for (const [ path, content ] of Object.entries(files)) {
		const full = join(root, path)
		mkdirSync(dirname(full), { recursive: true })
		writeFileSync(full, content)
		const needsTranslation = /^(docs\/.*|README)\.md$/.test(path) && !path.endsWith('.zh-tw.md')
		if (needsTranslation && !untranslated.includes(path)) {
			writeFileSync(full.replace(/\.md$/, '.zh-tw.md'), translationOf(content))
		}
	}
	if (!('docs/rfc/README.md' in files)) {
		writeIndex(root)
	}
}

/** Expected RFC index (RFC-0001/R19), built independently of the code under test. */
export const indexText = (root) => {
	const dir = join(root, 'docs/rfc')
	const rows = existsSync(dir)
		? readdirSync(dir)
			.filter((name) => /^\d{4}-[a-z0-9-]+\.md$/.test(name))
			.sort()
			.map((name) => {
				const text = readFileSync(join(dir, name), 'utf8')
				const field = (key) => text.match(new RegExp(`^${key}: (.*)$`, 'm'))?.[1] ?? ''
				return `| [${field('rfc')}](${name}) | ${field('title')} | ${field('status')} |`
			})
		: []
	return [ '# RFCs', '', '<!-- rfc-index:start -->', '| RFC | Title | Status |', '|---|---|---|', ...rows, '<!-- rfc-index:end -->', '' ].join('\n')
}

const writeIndex = (root) => {
	if (!existsSync(join(root, 'docs/rfc'))) {
		return
	}
	const text = indexText(root)
	writeFileSync(join(root, 'docs/rfc/README.md'), text)
	writeFileSync(join(root, 'docs/rfc/README.zh-tw.md'), fullTranslationOf(text))
}

export const readFile = (root, path) => readFileSync(join(root, path), 'utf8')

export const git = (root, ...args) =>
	execFileSync('git', [ '-c', 'user.name=t', '-c', 'user.email=t@t', ...args ], { cwd: root, stdio: 'pipe' })

export const commitAll = (root) => {
	git(root, 'init', '-q')
	git(root, 'add', '-A')
	git(root, 'commit', '-q', '-m', 'base')
}

export const cascadeSkill = '---\nname: rfc-cascade\ndescription: d\ndisable-model-invocation: true\n---\n'

/**
 * A repository with agent docs: AGENTS.md linking each of `skills`, CLAUDE.md symlinked to it,
 * and the rfc-cascade skill (RFC-0001/R23) when listed. `extra` is appended to AGENTS.md.
 */
export const withAgents = (files, { skills = [ 'rfc-cascade' ], extra = '' } = {}) => {
	const links = skills.map((name) => `- [${name}](.claude/skills/${name}/SKILL.md)\n`).join('')
	const root = makeRepo({
		...(skills.includes('rfc-cascade') ? { '.claude/skills/rfc-cascade/SKILL.md': cascadeSkill } : {}),
		'AGENTS.md': `# Agents\n${links}${extra}`,
		...files,
	})
	symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))
	return root
}

/** Rule ids of all problems found. */
export const rulesFound = async (root, base = null) =>
	(await checkRepository(root, { base })).map((problem) => problem.rule)
