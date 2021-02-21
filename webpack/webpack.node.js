'use strict';

const path = require('path');
const { ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const rel = path.resolve.bind(null, __dirname, '..');

const babelOptions = {
	presets: [['@babel/preset-env', {
		corejs: 3,
		useBuiltIns: 'usage',
	}]],
	sourceMap: true,
	plugins: [
		['module-resolver', {
			alias: {
				'@': './src',
			},
		}]
	],
};

const condition = {
	exclude: [
		/node_modules/,
		/\.(main|renderer)\.(ts|js)$/,
	],
	include: [
		rel('src/api'),
		rel('src/common'),
		/src\/.+\.node\//,
	],
}

module.exports = {
	name: 'node',
	cache: true,
	mode: 'production',
	entry: {
		pluginHost: rel('src/pluginHost.node/index.ts'),
	},
	resolve: {
		alias: {
			'@': rel('src'),
		},
	},
	devtool: 'source-map',
	output: {
		path: rel('dist/node'),
		filename: '[name].js',
		chunkFilename: '[chunkhash].js'
	},
	module: {
		rules: [ {
				...condition,
				test: /\.ts$/,
				use: [{
					loader: 'babel-loader',
					options: babelOptions,
				}, {
					loader: 'ts-loader',
				}],
			}, {
				...condition,
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: babelOptions,
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
};
