'use strict';

const path = require('path');
const { DefinePlugin, ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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

const backendOnlyPath = [
	rel('src/main'),
	rel('src/sharedProcess'),
];

module.exports = {
	name: 'renderer',
	cache: true,
	mode: 'production',
	entry: {
		omniSearch: rel('src/omniSearch/index.ts'),
		sharedProcess: rel('src/sharedProcess/index.ts'),
	},
	resolve: {
		alias: {
			'@': rel('src'),
		},
	},
	devtool: 'source-map',
	output: {
		path: rel('dist/renderer'),
		filename: '[name].[contenthash].js',
		chunkFilename: '[name].[chunkhash].js'
	},
	optimization: {
		moduleIds: 'deterministic',
		runtimeChunk: 'single',
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					chunks: 'all',
				},
			},
		},
	},
	module: {
		rules: [ {
				test: /\.vue$/,
				use: 'vue-loader',
				exclude: backendOnlyPath,
			}, {
				test: /\.ts$/,
				exclude: /node_modules|src\/main/,
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
				exclude: /node_modules|src\/main/,
				use: {
					loader: 'babel-loader',
					options: babelOptions,
				},
			}, {
				test: /\.css$/,
				exclude: backendOnlyPath,
				oneOf: [{
					resourceQuery: /module/,
					use: [{
						loader: MiniCssExtractPlugin.loader,
					}, {
						loader: 'css-loader',
						options: { modules: {
							exportLocalsConvention: 'dashes',
						} },
					}],
				}, {
					use: [{
						loader: MiniCssExtractPlugin.loader,
					}, {
						loader: 'css-loader',
					}],
				}],
			}, {
				test: /\.s[ac]ss$/,
				exclude: backendOnlyPath,
				oneOf: [{
					resourceQuery: /module/,
					use: [{
						loader: MiniCssExtractPlugin.loader,
					}, {
						loader: 'css-loader',
						options: { modules: {
							exportLocalsConvention: 'dashes',
						} },
					}, {
						loader: 'sass-loader',
					}],
				}, {
					use: [{
						loader: MiniCssExtractPlugin.loader,
					}, {
						loader: 'css-loader',
					}, {
						loader: 'sass-loader',
					}],
				}],
			}, {
        test: /\.(png|jpg|gif)/,
        type: 'asset/resource',
      },
		],
	},
	plugins: [
		new ProgressPlugin(),
		new CleanWebpackPlugin(),
		new VueLoaderPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new DefinePlugin({
			__VUE_OPTIONS_API__: 'true',
			__VUE_PROD_DEVTOOLS__: 'false'
		}),
		new HtmlWebpackPlugin({
			filename: '[name].html',
			chunks: ['omniSearch'],
			template: 'src/omniSearch/index.html',
		}),
	],
	resolve: {
		extensions: ['.js', '.ts', '.vue'],
	},
	target: 'electron-renderer',
};
