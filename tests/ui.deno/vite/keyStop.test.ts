import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { compile, createRenderer } from 'vue'

import { keyStop } from '../../../src/ui.deno/vite/keyStop.ts'

type Host = { props: Record<string, unknown> }
type Modifiers = { ctrl?: boolean; alt?: boolean; shift?: boolean; cmd?: boolean }
// gpui-native's key-down payload: modifiers are a separate object, not DOM's `ctrlKey` fields.
type KeyEvent = { key: string; modifiers?: Modifiers }

// Renders a template, compiled with the transform, into bare host nodes and returns the root's props.
const mount = (template: string) => {
	const root: Host = { props: {} }
	const { createApp } = createRenderer<Host, Host>({
		createElement: () => ({ props: {} }),
		createText: () => ({ props: {} }),
		createComment: () => ({ props: {} }),
		setText: () => {},
		setElementText: () => {},
		insert: (child, parent) => {
			if (parent === root) root.props = child.props
		},
		remove: () => {},
		parentNode: () => null,
		nextSibling: () => null,
		patchProp: (element, key, _previous, next) => {
			element.props[key] = next
		},
	})
	const keys: string[] = []
	const render = compile(template, { nodeTransforms: [keyStop] })
	createApp({ render, setup: () => ({ keys }) }).mount(root)
	// Several `@key-down` handlers arrive as one array, as gpui-native's renderer accepts.
	const keyDown = (key: string, modifiers?: Modifiers) =>
		[root.props.onKeyDown].flat().forEach((handler) => (handler as (event: KeyEvent) => void)({ key, modifiers }))
	return { props: root.props, keys, keyDown }
}

describe('RFC 0004: key-down stop modifier', () => {
	it('RFC-0004/R9: `@key-down.tab.stop` captures Tab natively, so window focus navigation cannot swallow it before the handler', () => {
		const { props, keys, keyDown } = mount(`<input @key-down.tab.stop="keys.push($event.key)" />`)
		assertEquals(props.captureKeys, ['tab'])
		keyDown('a')
		keyDown('tab')
		assertEquals(keys, ['tab'], 'the handler still only runs for its key')
	})

	it('RFC-0004/R9: `.exact` completes on a plain Tab only, so Ctrl+Tab, Alt+Tab, Meta+Tab and Shift+Tab never replace the input', () => {
		const { props, keys, keyDown } = mount(`<input @key-down.tab.exact.stop="keys.push($event.key)" />`)
		assertEquals(props.captureKeys, ['tab'])
		for (const modifier of ['ctrl', 'alt', 'cmd', 'shift']) keyDown('tab', { [modifier]: true })
		assertEquals(keys, [], 'a modified Tab reaches the handler without Rust capture, and must not run it')
		keyDown('tab', { ctrl: false, alt: false, shift: false, cmd: false })
		assertEquals(keys, ['tab'])
	})

	it('RFC-0004/R9: system modifiers are checked against gpui-native modifiers, so `.ctrl` handlers run only with Ctrl held', () => {
		const { keys, keyDown } = mount(`<input @key-down.ctrl.n="keys.push('ctrl+n')" />`)
		keyDown('n')
		keyDown('n', { ctrl: true })
		assertEquals(keys, ['ctrl+n'])
	})

	it('RFC-0004/R9: bare `@key-down.stop` captures every key, and keys from other stop handlers or `captureKeys` are kept', () => {
		assertEquals(mount(`<input @key-down.stop="keys.push($event.key)" />`).props.captureKeys, 'all')
		const merged = mount(
			`<input :capture-keys="['escape']" @key-down.tab.stop="keys.push('tab')" @key-down.down.stop="keys.push('down')" />`,
		)
		assertEquals(merged.props.captureKeys, ['escape', 'tab', 'down'])
		merged.keyDown('down')
		assertEquals(merged.keys, ['down'])
	})

	it('RFC-0004/R9: key-down handlers without `.stop` capture nothing, so other keys keep their window bindings', () => {
		const { props, keys, keyDown } = mount(`<input @key-down.tab="keys.push($event.key)" />`)
		assertEquals('captureKeys' in props, false)
		keyDown('tab')
		assertEquals(keys, ['tab'])
	})
})
