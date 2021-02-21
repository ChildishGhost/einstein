const buildConfigs = [
	require('./webpack/webpack.main'),
	require('./webpack/webpack.renderer'),
	require('./webpack/webpack.node'),
]

module.exports = buildConfigs
