const path = require('path');

const rel = path.resolve.bind(null, __dirname, '..');

module.exports = {
	rel,
	babelOptions: {
		sourceMap: true,
		plugins: [
			['module-resolver', {
				alias: {
					'@': './src',
					'einstein': './src/api',
				},
			}]
		],
	},
	defaultConfig: {
		cache: true,
		mode: 'production',
		resolve: {
			alias: {
				'@': rel('src'),
				'einstein': rel('src/api'),
			},
		},
		devtool: 'source-map',
	},
}
