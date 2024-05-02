/* eslint-disable */
'use strict';

const path = require('path');
const { DefinePlugin, ProgressPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const utils = require('./utils');

const backendOnlyPath = [
	utils.rel('src/main'),
	utils.rel('src/sharedProcess'),
	/\.main\.ts$/,
];

module.exports = Object.assign({}, utils.defaultConfig, {
	name: 'renderer',
	entry: {
		omniSearch: utils.rel('src/omniSearch/index.ts'),
		sharedProcess: utils.rel('src/sharedProcess/index.ts'),
	},
	output: {
		path: utils.rel('dist/renderer'),
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
					options: utils.babelOptions,
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
					options: utils.babelOptions,
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
							namedExport: false,
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
							namedExport: false,
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
		new ESLintPlugin({
			extensions: ['.js', '.ts', '.vue'],
		}),
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
			filename: 'omniSearch.html',
			chunks: ['omniSearch'],
			template: 'src/omniSearch/index.html',
		}),
		new HtmlWebpackPlugin({
			filename: 'sharedProcess.html',
			chunks: ['sharedProcess'],
		}),
	],
	resolve: {
		extensions: ['.js', '.ts', '.vue'],
	},
	target: 'electron-renderer',
});
