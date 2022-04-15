'use strict';

const { mkdirSync, cpSync } = require('fs');
const { DefinePlugin, ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const utils = require('./utils');

const condition = {
	exclude: [
		/node_modules/,
		/\.(main|renderer)\.(ts|js)$/,
	],
	include: [
		utils.rel('src/api'),
		utils.rel('src/common'),
		/src\/.+\.node\//,
	],
}

module.exports = Object.assign({}, utils.defaultConfig, {
	name: 'node',
	entry: {
		pluginHost: utils.rel('src/pluginHost.node/index.ts'),
	},
	output: {
		path: utils.rel('dist/node'),
		filename: '[name].js',
		chunkFilename: '[chunkhash].js'
	},
	module: {
		rules: [ {
				...condition,
				test: /\.ts$/,
				use: [{
					loader: 'babel-loader',
					options: utils.babelOptions,
				}, {
					loader: 'ts-loader',
				}],
			}, {
				...condition,
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: utils.babelOptions,
				},
			},
		],
	},
	resolve: {
		extensions: ['.js', '.ts'],
	},
	plugins: [
		new ProgressPlugin(),
		new ESLintPlugin({
			extensions: ['.js', '.ts'],
		}),
		new DefinePlugin({
			VM2_LIB_PATH: JSON.stringify('node_modules/vm2/lib/'),
		}),
		{
			// copy vm2 assets
			apply(compiler) {
				compiler.hooks.done.tap('copy vm2 assets', () => {
					mkdirSync(utils.rel('dist/node/node_modules/'), { recursive: true })
					cpSync(utils.rel('node_modules/vm2'), utils.rel('dist/node/node_modules/vm2'), { recursive: true })
				})
			}
		},
		new CleanWebpackPlugin(),
	],
	target: 'node',
	ignoreWarnings: [
		{
			module: /vm2\/lib\/compiler\.js/,
			message: /Can't resolve 'coffee-script'/,
		},
		{
			module: /vm2\/lib\/resolver-compat\.js/,
			message: /Critical dependency: the request of a dependency is an expression/,
		},
	],
});
