'use strict';

const { ProgressPlugin } = require('webpack');
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
		new CleanWebpackPlugin(),
	],
	target: 'node',
});
