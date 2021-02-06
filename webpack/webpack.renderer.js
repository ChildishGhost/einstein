'use strict';

const path = require('path');
const webpack = require('webpack');
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

module.exports = {
	cache: true,
	mode: 'production',
	entry: {
		renderer: rel('src/renderer/index.ts'),
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
				test: /\.vue$/,
				use: 'vue-loader',
			}, {
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
			}, {
				test: /\.css$/,
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
		new VueLoaderPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new webpack.DefinePlugin({
			__VUE_OPTIONS_API__: 'true',
			__VUE_PROD_DEVTOOLS__: 'false'
		}),
		new HtmlWebpackPlugin({
			filename: 'renderer.html',
			chunks: ['renderer'],
			template: 'src/renderer/index.html',
		}),
	],
	resolve: {
		extensions: ['.js', '.ts', '.vue'],
	},
	target: 'electron-renderer',
};
