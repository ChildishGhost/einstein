import globals from "globals"

import root from "../eslint.config.mjs"

// A nested config replaces the root one, and globals merge, so browser globals are swapped out rather than overridden.
export default [ ...root.map((config) => config.languageOptions?.globals ? {
	...config,
	languageOptions: { ...config.languageOptions, globals: { ...globals.node } },
} : config), {
	files: [ "**/*.ts" ],

	settings: {
		"import/core-modules": [ "einstein", "fuse.js" ],
	},
} ]
