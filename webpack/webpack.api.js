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
				'einstein': './src/api',
			},
		}]
	],
};

const condition = {
	exclude: [
		/node_modules/,
	],
	include: [
		rel('src/api'),
	],
}

module.exports = {
	name: 'node',
	cache: true,
	mode: 'production',
	entry: rel('src/api/index.ts'),
	resolve: {
		alias: {
			'einstein': rel('src/api'),
		},
	},
	devtool: 'source-map',
	output: {
		path: rel('dist/api'),
		filename: 'index.js',
		chunkFilename: '[chunkhash].js',
		library: {
			name: 'einstein',
			type: 'umd',
		},
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
					options: {
						onlyCompileBundledFiles: true,
						compilerOptions: {
							declaration: true,
							declarationMap: true,
							outDir: rel('dist/api'),
							paths: {
								einstein: ['./src/api'],
							},
						},
					},
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
