'use strict';

const fs = require('fs');
const { ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
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
		new CleanWebpackPlugin(),
		new CopyPlugin({
			patterns: [
				utils.rel('node_modules/file-icon/file-icon'), // file-icon native executable
			],
		}),
		{
			apply(compiler) {
				compiler.hooks.done.tap('fix permission', () => {
					fs.chmodSync(utils.rel('dist/node/file-icon'), 0o755)
				});
			},
		},
	],
	target: 'node',
});
