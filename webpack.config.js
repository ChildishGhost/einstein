const buildConfigs = [
	require('./webpack/webpack.api'),
	require('./webpack/webpack.main'),
	require('./webpack/webpack.renderer'),
	require('./webpack/webpack.node'),
	require('./webpack/webpack.plugins'),
]

module.exports = buildConfigs
