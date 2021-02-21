import 'source-map-support/register'

process.on('message', ({ type, _data }) => {
	if (type === 'pluginHost:exit') {
		process.exit()
	}
})
