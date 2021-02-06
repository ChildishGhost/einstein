'use strict';

const path = require('path');

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

module.exports = {
	cache: true,
	mode: 'production',
	entry: {
		main: rel('src/main/index.ts'),
	},
	resolve: {
		alias: {
			'@': rel('src'),
		},
	},
	devtool: 'source-map',
	output: {
		path: rel('dist'),
		filename: '[name].js',
		chunkFilename: '[chunkhash].js'
	},
	module: {
		rules: [ {
				test: /\.ts$/,
				exclude: /node_modules/,
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
				exclude: /(node_modules)/,
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
	target: 'electron-main',
};
