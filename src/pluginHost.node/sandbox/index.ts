import { NodeVM } from 'vm2'

import { permittedEnv } from './env'

type CreateVMOptions = {
	injectModules?: { [key: string]: any }
	injectGlobals?: { [key: string]: any }
}

// eslint-disable-next-line import/prefer-default-export
export const createVM = (options: CreateVMOptions = {}) =>
	new NodeVM({
		sandbox: options.injectGlobals || {},
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
				'fuse.js': require('fuse.js'),

				...(options.injectModules || {}),
			},
		},
		env: { ...permittedEnv },
	})
