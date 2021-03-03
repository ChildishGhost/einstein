'use strict';

const { ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const utils = require('./utils');

module.exports = Object.assign({}, utils.defaultConfig, {
	name: 'main',
	entry: {
		main: utils.rel('src/main/index.ts'),
	},
	output: {
		path: utils.rel('dist/main'),
		filename: '[name].js',
		chunkFilename: '[chunkhash].js'
	},
	module: {
		rules: [ {
				test: /\.ts$/,
				exclude: /node_modules|\.renderer\.ts$/,
				include: /src\/(main|common)/,
				use: [{
					loader: 'babel-loader',
					options: utils.babelOptions,
				}, {
					loader: 'ts-loader',
					options: {
						appendTsSuffixTo: [/\.vue$/],
					},
				}],
			}, {
				test: /\.js$/,
				exclude: /node_modules|\.renderer\.js$/,
				include: /src\/(main|common)/,
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
	target: 'electron-main',
});
