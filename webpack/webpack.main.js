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
				'einstein': './src/api',
			},
		}]
	],
};

module.exports = {
	name: 'main',
	cache: true,
	mode: 'production',
	entry: {
		main: rel('src/main/index.ts'),
	},
	resolve: {
		alias: {
			'@': rel('src'),
			'einstein': rel('src/api'),
		},
	},
	devtool: 'source-map',
	output: {
		path: rel('dist/main'),
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
					options: babelOptions,
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
	target: 'electron-main',
};
