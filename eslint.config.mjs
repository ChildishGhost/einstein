import path from "node:path"
import { fileURLToPath } from "node:url"

import { fixupConfigRules, fixupPluginRules } from "@eslint/compat"
import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import _import from "eslint-plugin-import"
import tsdoc from "eslint-plugin-tsdoc"
import vue from "eslint-plugin-vue"
import globals from "globals"
import parser from "vue-eslint-parser"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
})

export default [ ...fixupConfigRules(compat.extends(
	"plugin:@typescript-eslint/eslint-recommended",
	"plugin:vue/vue3-essential",
	"prettier",
)), {
	plugins: {
		vue: fixupPluginRules(vue),
		"@typescript-eslint": fixupPluginRules(typescriptEslint),
		tsdoc,
		import: fixupPluginRules(_import),
	},

	languageOptions: {
		globals: {
			...globals.browser,
		},

		parser: parser,
		ecmaVersion: 12,
		sourceType: "module",

		parserOptions: {
			parser: "@typescript-eslint/parser",

			parserOptions: {
				project: "./tsconfig.json",
			},
		},
	},

	settings: {
		"import/core-modules": [ "electron" ],
		"import/internal-regex": "^@/",

		"import/resolver": {
			node: {
				extensions: [ ".js", ".ts", ".vue" ],
				moduleDirectory: [ "node_modules", "src" ],
			},

			alias: {
				extensions: [ ".ts", ".js", ".vue" ],
				map: [ [ "@", "./src" ], [ "einstein", "./src/api" ] ],
			},
		},
	},

	rules: {
		"no-unused-vars": "off",

		"@typescript-eslint/no-unused-vars": [ "error", {
			argsIgnorePattern: "^_",
		} ],

		"import/order": [ "error", {
			groups: [ "builtin", "external", "internal" ],

			pathGroups: [ {
				pattern: "einstein",
				group: "external",
			} ],

			"newlines-between": "always",

			alphabetize: {
				order: "asc",
				caseInsensitive: true,
			},
		} ],

		"no-restricted-imports": [ "error", {
			paths: [ {
				name: "@/api",
				message: "Please import from 'einstein' instead.",
			} ],

			patterns: [ "@/api/*" ],
		} ],

		"array-bracket-spacing": [ "warn", "always" ],
		"class-methods-use-this": "off",

		"import/extensions": [ "error", "never", {
			ignorePackages: true,

			pattern: {
				vue: "always",
			},
		} ],

		"import/newline-after-import": "off",
		"import/prefer-default-export": "off",
		indent: [ "warn", "tab" ],
		"max-classes-per-file": "off",
		"no-tabs": "off",

		semi: [ "error", "never", {
			beforeStatementContinuationChars: "always",
		} ],

		"semi-style": [ "error", "first" ],
		"tsdoc/syntax": "warn",
		"arrow-body-style": "off",
	},
}, {
	files: [ "**/*.vue", " src/**", "plugins/**" ],
},{
	ignores: [ "dist/", "node_modules/", "webpack/", "webpack.config.js" ],
} ]
