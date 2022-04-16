import { NodeVM, NodeVMOptions } from 'vm2'

const defaultVMOptions: Partial<NodeVMOptions> = {
	compiler: 'javascript',
	require: {
		external: true,
		context: 'sandbox',
		// TODO(davy): remove dangerous node.js APIs
		builtin: [ '*' ],
		// eslint-disable-next-line camelcase
		customRequire: __non_webpack_require__,
		mock: {
			// eslint-disable-next-line global-require
			'fuse.js': require('fuse.js')
		},
	},
}

// eslint-disable-next-line import/prefer-default-export
export const createVM = (options?: { sandbox?: any }) => new NodeVM({
	...defaultVMOptions,
	...options,
})
