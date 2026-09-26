import assert from 'node:assert/strict'
import { readFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { cascadeSkill, commitAll, fullTranslationOf, indexText, makeRepo, readFile, rfcText, rulesFound, withAgents, writeFiles } from './helpers.mjs'
import { checkRepository, writeRfcIndex } from '../../.bin/docs-check.mjs'

const ok = { 'docs/rfc/0001-process.md': rfcText({ n: '0001' }) }
// Accepted/implemented fixtures need citing tests (R14) so that only the rule under test can fail.
const cites = { 'tests/cite.test.mjs': '// RFC-0001/R1 RFC-0001/R2 RFC-0002/R1\n' }

describe('docs:check', () => {
	it('RFC-0001/R1: a well-formed repository passes', async () => {
		assert.deepEqual(await rulesFound(makeRepo(ok)), [])
	})

	it('RFC-0001/R1: RFC files must be named NNNN-kebab-title.md', async () => {
		const root = makeRepo({ 'docs/rfc/12-Bad_Name.md': rfcText({ n: '0012' }) })
		assert.ok((await rulesFound(root)).includes('R1'))
	})

	it('RFC-0001/R2: an RFC without a translation fails, because English is not the only reader', async () => {
		const root = makeRepo(ok, { untranslated: [ 'docs/rfc/0001-process.md' ] })
		assert.ok((await rulesFound(root)).includes('R2'))
	})

	it('RFC-0001/R2: a translation of an older source revision is stale', async () => {
		const root = makeRepo(ok)
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', body: 'changed' }) }, [ 'docs/rfc/0001-process.md' ])
		assert.ok((await rulesFound(root)).includes('R2'))
	})

	it('RFC-0001/R3: missing front-matter fields or unknown status values fail', async () => {
		const missing = makeRepo({ 'docs/rfc/0001-process.md': '---\nrfc: 0001\n---\n# x\n' })
		assert.ok((await rulesFound(missing)).includes('R3'))
		const badStatus = makeRepo({ 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'done' }) })
		assert.ok((await rulesFound(badStatus)).includes('R3'))
	})

	it('RFC-0001/R3: gates must be "accept" or "accept, verify", so the number of human approvals is unambiguous', async () => {
		const withGates = (gates) => rfcText({ n: '0001' }).replace('references: []', `references: []\ngates: ${gates}`)
		assert.deepEqual(await rulesFound(makeRepo({ 'docs/rfc/0001-process.md': withGates('accept') })), [])
		assert.deepEqual(await rulesFound(makeRepo({ 'docs/rfc/0001-process.md': withGates('accept, verify') })), [])
		assert.ok((await rulesFound(makeRepo({ 'docs/rfc/0001-process.md': withGates('none') }))).includes('R3'))
	})

	it('RFC-0001/R4: referencing a higher-numbered RFC fails (front-matter and body links)', async () => {
		const front = makeRepo({
			'docs/rfc/0001-a.md': rfcText({ n: '0001', refs: [ '0002' ] }),
			'docs/rfc/0002-b.md': rfcText({ n: '0002', refs: [ '0001' ] }),
		})
		assert.deepEqual(await rulesFound(front), [ 'R4' ])
		const link = makeRepo({
			'docs/rfc/0001-a.md': rfcText({ n: '0001', body: 'See [b](0002-b.md).' }),
			'docs/rfc/0002-b.md': rfcText({ n: '0002' }),
		})
		assert.deepEqual(await rulesFound(link), [ 'R4' ])
	})

	it('RFC-0001/R5: status may only move along allowed transitions against the base ref', async () => {
		const root = makeRepo({ ...ok, ...cites })
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'implemented' }) })
		assert.ok((await rulesFound(root, 'HEAD')).includes('R5'), 'draft → implemented skips acceptance')
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'accepted' }) })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [])
	})

	it('RFC-0001/R18: an unpublished RFC is amended in place, at any status', async () => {
		const root = makeRepo({ ...ok, ...cites })
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0002-new.md': rfcText({ n: '0002', status: 'accepted', refs: [ '0001' ] }) })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [], 'absent from the published base, so nothing is shared yet')
	})

	it('RFC-0001/R6: a published draft may be rewritten freely', async () => {
		const root = makeRepo(ok)
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', reqs: [ 'R9' ], body: 'rewritten' }) })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [])
	})

	it('RFC-0001/R6: a published accepted RFC may only grow, so what reviewers approved stays readable', async () => {
		const root = makeRepo({ 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'accepted' }), ...cites })
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'accepted', reqs: [ 'R1', 'R2' ], body: 'clarified' }) })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [], 'adding a requirement and a clarification is allowed')
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'accepted', reqs: [ 'R2' ] }) })
		assert.ok((await rulesFound(root, 'HEAD')).includes('R6'), 'dropping R1 rewrites the approved text')
	})

	it('RFC-0001/R6: a published implemented RFC is frozen except status, superseded-by and Errata', async () => {
		const root = makeRepo({ 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'implemented' }), ...cites })
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0001-process.md': `${readFile(root, 'docs/rfc/0001-process.md')}\n2026-10-01: typo fixed.\n` })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [], 'appending to Errata is allowed')
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', status: 'implemented', reqs: [ 'R1', 'R2' ] }) })
		assert.ok((await rulesFound(root, 'HEAD')).includes('R6'), 'a new requirement after implementation needs a new RFC')
	})

	it('RFC-0001/R9: CLAUDE.md must be a symlink to AGENTS.md, so both names stay one file', async () => {
		const copied = makeRepo({ ...ok, 'AGENTS.md': '# Agents\n', 'CLAUDE.md': '# Agents\n' })
		assert.ok((await rulesFound(copied)).includes('R9'))
		assert.deepEqual(await rulesFound(withAgents(ok)), [])
	})

	it('RFC-0001/R9: every .agents topic file must be imported by AGENTS.md, or Claude never loads it', async () => {
		const root = withAgents({ ...ok, '.agents/a.md': 'a\n', '.agents/b.md': 'b\n' }, { extra: '@.agents/a.md\n' })
		const found = await checkRepository(root, { base: null })
		assert.deepEqual(found.map((p) => [ p.rule, p.file ]), [ [ 'R9', '.agents/b.md' ] ])
	})

	it('RFC-0001/R9: a skill needs a name matching its folder and a description, or Claude cannot discover it', async () => {
		const skill = (front) => ({ '.claude/skills/x/SKILL.md': `---\n${front}\n---\n# X\n` })
		const found = async (front) => (await checkRepository(withAgents({ ...ok, ...skill(front) }, { skills: [ 'rfc-cascade', 'x' ] }), { base: null }))
			.map((p) => [ p.rule, p.file ])
		assert.deepEqual(await found('name: x\ndescription: d'), [])
		assert.deepEqual(await found('name: y\ndescription: d'), [ [ 'R9', '.claude/skills/x/SKILL.md' ] ])
		assert.deepEqual(await found('name: x'), [ [ 'R9', '.claude/skills/x/SKILL.md' ] ])
	})

	it('RFC-0001/R9: every skill is linked from AGENTS.md, or agents other than Claude never find it', async () => {
		const root = withAgents({ ...ok, '.claude/skills/x/SKILL.md': '---\nname: x\ndescription: d\n---\n' })
		const found = await checkRepository(root, { base: null })
		assert.deepEqual(found.map((p) => [ p.rule, p.file ]), [ [ 'R9', '.claude/skills/x/SKILL.md' ] ])
	})

	it('RFC-0001/R23: rfc-cascade must exist and be human-invoked only, so no agent can pass a gate by itself', async () => {
		const missing = withAgents(ok, { skills: [] })
		assert.deepEqual(await rulesFound(missing), [ 'R23' ])
		const invocable = withAgents({ ...ok, '.claude/skills/rfc-cascade/SKILL.md': '---\nname: rfc-cascade\ndescription: d\n---\n' })
		assert.deepEqual(await rulesFound(invocable), [ 'R23' ])
	})

	it('RFC-0001/R9: only .claude/skills is checked inside .claude, which also holds worktrees', async () => {
		const root = withAgents({ ...ok, '.claude/worktrees/w/AGENTS.md': '[x](missing.md)\n', '.claude/worktrees/w/docs/a.md': '# A\n' })
		assert.deepEqual(await rulesFound(root), [])
	})

	it('RFC-0001/R7: duplicate requirement IDs in one RFC fail, because citations would be ambiguous', async () => {
		const root = makeRepo({ 'docs/rfc/0001-process.md': rfcText({ n: '0001', reqs: [ 'R1', 'R1' ] }) })
		assert.ok((await rulesFound(root)).includes('R7'))
	})

	it('RFC-0001/R14: broken Markdown links and @path imports fail', async () => {
		const root = makeRepo({ ...ok, 'AGENTS.md': '@.agents/missing.md\n', 'README.md': '[x](docs/missing.md)\n' })
		symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))
		const found = await checkRepository(root, { base: null })
		assert.ok(found.some((p) => p.rule === 'R14' && p.file === 'AGENTS.md'))
		assert.ok(found.some((p) => p.rule === 'R14' && p.file === 'README.md'))
		const inSkill = withAgents({ ...ok, '.claude/skills/rfc-cascade/SKILL.md': `${cascadeSkill}[x](missing.md)\n` })
		assert.deepEqual(await rulesFound(inSkill), [ 'R14' ], 'skills are docs too')
	})

	it('RFC-0001/R14: human docs (README.md, docs/**) need fresh translations too', async () => {
		const root = makeRepo({ ...ok, 'docs/guide.md': '# Guide\n' }, { untranslated: [ 'docs/guide.md' ] })
		assert.ok((await rulesFound(root)).includes('R14'))
	})

	it('RFC-0001/R14: every requirement of an accepted RFC needs a citing test, so approval is enforceable', async () => {
		const root = makeRepo({
			'docs/rfc/0001-a.md': rfcText({ n: '0001', status: 'accepted', reqs: [ 'R1', 'R2' ] }),
			'tests/a.test.mjs': "it('RFC-0001/R1: …')\n",
		})
		const found = await checkRepository(root, { base: null })
		assert.deepEqual(found.map((p) => p.rule), [ 'R14' ])
		assert.match(found[0].message, /RFC-0001\/R2/)
	})

	it('RFC-0001/R7: a requirement marked (manual) needs no citing test, because a reviewer checks it', async () => {
		const root = makeRepo({ 'docs/rfc/0001-a.md': rfcText({ n: '0001', status: 'accepted', reqs: [ 'R1', 'R2 (manual)' ] }), 'tests/a.test.mjs': '// RFC-0001/R1\n' })
		assert.deepEqual(await rulesFound(root), [])
	})

	it('RFC-0001/R15: CI runs docs:check, so rules hold for every change and not only locally', () => {
		const workflow = readFileSync(fileURLToPath(new URL('../../.github/workflows/build.yaml', import.meta.url)), 'utf8')
		assert.match(workflow, /npm run docs:check/)
	})

	it('RFC-0001/R16: a retroactive RFC may start as implemented and needs no citing tests', async () => {
		const root = makeRepo(ok)
		commitAll(root)
		writeFiles(root, { 'docs/rfc/0002-old.md': rfcText({ n: '0002', status: 'implemented', retroactive: 'db39f26', refs: [ '0001' ] }) })
		assert.deepEqual(await rulesFound(root, 'HEAD'), [])
	})

	it('RFC-0001/R19: the RFC index must match front-matter, which stays the only source of status', async () => {
		const root = makeRepo(ok)
		assert.deepEqual(await rulesFound(root), [], 'README.md in docs/rfc is the index, not an RFC')
		const stale = indexText(root).replace('| draft |', '| accepted |')
		writeFiles(root, { 'docs/rfc/README.md': stale })
		assert.ok((await rulesFound(root)).includes('R19'))
	})

	it('RFC-0001/R19: docs:index regenerates the table between the markers and keeps the rest', async () => {
		const root = makeRepo(ok)
		writeFiles(root, { 'docs/rfc/README.md': '# RFCs\n\nIntro.\n\n<!-- rfc-index:start -->\nold\n<!-- rfc-index:end -->\n' })
		await writeRfcIndex(root)
		const written = readFile(root, 'docs/rfc/README.md')
		assert.match(written, /^# RFCs\n\nIntro\.\n/)
		assert.ok(written.includes('| [0001](0001-process.md) | Fixture | draft |'))
		assert.ok(!written.includes('old'))
	})

	it('RFC-0001/R14: this repository passes docs:check', async () => {
		const root = fileURLToPath(new URL('../..', import.meta.url))
		assert.deepEqual(await checkRepository(root), [])
	})
})

describe('rfc scripts', () => {
	const createRfc = async (...args) => (await import('../../.bin/rfc.mjs')).createRfc(...args)
	const setStatus = async (...args) => (await import('../../.bin/rfc.mjs')).setStatus(...args)
	const repoFile = (path) => readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8')
	const template = {
		'docs/rfc/0000-template.md': repoFile('docs/rfc/0000-template.md'),
		'docs/rfc/0000-template.zh-tw.md': repoFile('docs/rfc/0000-template.zh-tw.md'),
	}

	it('RFC-0001/R24: rfc:new creates the next-numbered draft from the template, failing R2 until translated', async () => {
		const root = makeRepo({ ...template, ...ok })
		const path = await createRfc(root, 'plugin-sandbox', { today: '2026-09-27' })
		assert.equal(path, 'docs/rfc/0002-plugin-sandbox.md')
		assert.match(readFile(root, path), /^---\nrfc: 0002\ntitle: Plugin sandbox\nstatus: draft\ncreated: 2026-09-27\nreferences: \[0001\]\n/)
		assert.ok(!/null|#/.test(readFile(root, path).split('\n---\n')[0]), 'no placeholder values or comments in front-matter')
		const found = await checkRepository(root, { base: null })
		assert.deepEqual(found.map((p) => [ p.rule, p.file ]), [ [ 'R2', 'docs/rfc/0002-plugin-sandbox.zh-tw.md' ] ], 'index and its translation stay current')
		await assert.rejects(createRfc(root, 'Not Kebab'))
	})

	it('RFC-0001/R24: rfc:status updates the RFC, its translation and the index in one step', async () => {
		const source = rfcText({ n: '0001' })
		const root = makeRepo({ ...cites, 'docs/rfc/0001-process.md': source }, { untranslated: [ 'docs/rfc/0001-process.md' ] })
		writeFiles(root, { 'docs/rfc/0001-process.zh-tw.md': fullTranslationOf(source) })
		await setStatus(root, '0001', 'accepted')
		assert.match(readFile(root, 'docs/rfc/0001-process.md'), /^status: accepted$/m)
		assert.match(readFile(root, 'docs/rfc/0001-process.zh-tw.md'), /^status: accepted$/m)
		assert.match(readFile(root, 'docs/rfc/README.zh-tw.md'), /\| accepted \|/)
		assert.deepEqual(await rulesFound(root), [])
	})

	it('RFC-0001/R24: rfc:status never re-stamps a translation that was already stale, which would hide it', async () => {
		const root = makeRepo({ ...cites, ...ok })
		writeFiles(root, { 'docs/rfc/0001-process.md': rfcText({ n: '0001', body: 'changed' }) }, [ 'docs/rfc/0001-process.md' ])
		await setStatus(root, '0001', 'accepted')
		assert.ok((await rulesFound(root)).includes('R2'))
	})

	it('RFC-0001/R24: rfc:status refuses transitions R5 forbids', async () => {
		const root = makeRepo(ok)
		await assert.rejects(setStatus(root, '0001', 'implemented'), /draft → implemented/)
		assert.match(readFile(root, 'docs/rfc/0001-process.md'), /^status: draft$/m)
	})
})
