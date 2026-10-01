// gpui-native events reach JS after dispatch, so `.stop` on `@key-down` cannot call stopPropagation().
// This compiler transform turns it into the input's `captureKeys` prop, which gpui-native applies natively.
// Vue's system modifiers and `.exact` read DOM fields (`ctrlKey`, …), so it also guards them on gpui's `modifiers`.
import {
	type AttributeNode,
	createCompoundExpression,
	createSimpleExpression,
	type DirectiveNode,
	type ExpressionNode,
	isFnExpression,
	isMemberExpression,
	type NodeTransform,
	NodeTypes,
	type TransformContext,
} from '@vue/compiler-core'

// Mirrors @vue/compiler-dom's resolveModifiers: everything else on a keyboard event is a key.
const notKeys = new Set([
	'stop',
	'prevent',
	'self',
	'ctrl',
	'shift',
	'alt',
	'meta',
	'exact',
	'middle',
	'passive',
	'once',
	'capture',
	'native',
])
// Vue key aliases (runtime-dom's withKeys) in gpui-native key names.
const keyNames: Record<string, string[]> = {
	esc: ['escape'],
	delete: ['delete', 'backspace'],
}

const isKeyDown = (prop: DirectiveNode) =>
	prop.name === 'on' && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
	prop.arg.isStatic &&
	['key-down', 'keyDown'].includes(prop.arg.content)
const isCaptureKeys = (name: string | undefined) => name === 'captureKeys' || name === 'capture-keys'

// Vue system modifiers in gpui-native's `EventModifiers` names.
const systemModifiers: Record<string, string> = { ctrl: 'ctrl', alt: 'alt', shift: 'shift', meta: 'cmd' }

// Runs the handler only when gpui's modifiers match, as runtime-dom's withModifiers does on DOM events.
const guardModifiers = (prop: DirectiveNode, modifiers: string[], context: TransformContext) => {
	const listed = modifiers.filter((modifier) => modifier in systemModifiers)
	const exact = modifiers.includes('exact')
	if (prop.exp?.type !== NodeTypes.SIMPLE_EXPRESSION || (!listed.length && !exact)) return
	prop.modifiers = prop.modifiers.filter(({ content }) => content !== 'exact' && !(content in systemModifiers))
	const blocked = [
		...listed.map((modifier) => `!$event.modifiers?.${systemModifiers[modifier]}`),
		...(exact ? Object.keys(systemModifiers).filter((modifier) => !listed.includes(modifier)) : [])
			.map((modifier) => `$event.modifiers?.${systemModifiers[modifier]}`),
	]
	const handler = isMemberExpression(prop.exp, context) || isFnExpression(prop.exp, context)
		? `(${prop.exp.content})($event)`
		: prop.exp.content
	prop.exp = createSimpleExpression(
		`($event) => { if (${blocked.join(' || ')}) return; ${handler} }`,
		false,
		prop.exp.loc,
	)
}

export const keyStop: NodeTransform = (node, context) => {
	if (node.type !== NodeTypes.ELEMENT) return
	let keys: string[] | 'all' | undefined
	for (const prop of node.props) {
		if (prop.type !== NodeTypes.DIRECTIVE || !isKeyDown(prop)) continue
		const modifiers = prop.modifiers.map(({ content }) => content)
		guardModifiers(prop, modifiers, context)
		if (!modifiers.includes('stop')) continue
		prop.modifiers = prop.modifiers.filter(({ content }) => content !== 'stop')
		const named = modifiers.filter((modifier) => !notKeys.has(modifier))
			.flatMap((modifier) => keyNames[modifier] ?? [modifier])
		keys = !named.length || keys === 'all' ? 'all' : [...(keys ?? []), ...named]
	}
	if (!keys) return

	const index = node.props.findIndex((prop) =>
		prop.type === NodeTypes.ATTRIBUTE ? isCaptureKeys(prop.name) : prop.name === 'bind' &&
			prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
			isCaptureKeys(prop.arg.content)
	)
	let exp: ExpressionNode = createSimpleExpression(JSON.stringify(keys))
	if (index >= 0) {
		const existing = node.props[index] as AttributeNode | DirectiveNode
		node.props.splice(index, 1)
		if (keys !== 'all') {
			const value = existing.type === NodeTypes.ATTRIBUTE
				? createSimpleExpression(JSON.stringify(existing.value?.content ?? ''))
				: existing.exp ?? createSimpleExpression('undefined')
			exp = createCompoundExpression([
				'((a, b) => a === "all" ? a : [...[a ?? []].flat(), ...b])(',
				value,
				`, ${JSON.stringify(keys)})`,
			])
		}
	}
	node.props.push({
		type: NodeTypes.DIRECTIVE,
		name: 'bind',
		rawName: ':captureKeys',
		arg: createSimpleExpression('captureKeys', true),
		exp,
		modifiers: [],
		loc: node.loc,
	})
}
