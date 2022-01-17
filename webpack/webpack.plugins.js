'use strict';

const { chmodSync, copyFileSync, readdirSync, existsSync } = require('fs');
const { ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CreateFileWebpack = require('create-file-webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const utils = require('./utils');

const createPackage = ({ name, version, uid }) => ({
	name,
	version,
	uid,
	module: 'index.js',
});

const buildExample = !!process.env.BUILD_EXAMPLE_PLUGIN
const plugins = readdirSync(utils.rel('plugins'), { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map(({ name }) => name)
	.filter((name) => buildExample || name !== 'example')
	.filter((name) => existsSync(utils.rel(`plugins/${name}/package.json`)))
	.filter((name) => existsSync(utils.rel(`plugins/${name}/index.ts`)))

const createManifestPlugins = plugins.map((name) => new CreateFileWebpack({
	path: utils.rel(`dist/plugins/${name}`),
	fileName: 'package.json',
	content: JSON.stringify(createPackage(require(utils.rel(`plugins/${name}/package`))), null, 2),
}))

const copyAssetsPlugins = plugins
	.map((name) => [ name, require(utils.rel(`plugins/${name}/package`)) ])
	.map(([name, { __webpack_copy }]) => ({ name, __webpack_copy }))
	.filter(({ __webpack_copy }) => __webpack_copy)
	.map(({ name, __webpack_copy }) => ({
		apply(compiler) {
			compiler.hooks.done.tap('copy assets', () => {
				for (const { from, to, perm } of __webpack_copy) {
					const destination = utils.rel(`dist/plugins/${name}/${to}`)
					copyFileSync(utils.rel(`plugins/${name}/${from}`), destination)

					if (perm) {
						chmodSync(destination, Number.parseInt(perm, 8))
					}
				}
			})
		},
	}))

module.exports = Object.assign({}, utils.defaultConfig, {
	name: 'plugins',
	entry: Object.fromEntries(plugins
		.map((name) => [name, utils.rel(`plugins/${name}/index.ts`)])
	),
	output: {
		path: utils.rel('dist/plugins'),
		filename: '[name]/index.js',
		chunkFilename: '[name]/[chunkhash].js',
    libraryTarget: 'commonjs2',
	},
	externals: {
		"fuse.js": "fuse.js",
	},
	module: {
		rules: [ {
			test: /\.ts$/,
			use: [{
				loader: 'ts-loader',
				options: {
					onlyCompileBundledFiles: true,
				},
			}],
		},],
	},
	resolve: {
		extensions: ['.js', '.ts'],
		alias: {
			einstein: utils.rel('src/api'),
		},
	},
	plugins: [
		new ProgressPlugin(),
		new ESLintPlugin({
			extensions: ['.js', '.ts'],
		}),
		new CleanWebpackPlugin(),
		...createManifestPlugins,
		...copyAssetsPlugins,
	],
	target: 'node',
});
