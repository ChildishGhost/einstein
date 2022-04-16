import { methods } from './methods'

export const generateAPI = () => ({
	// eslint-disable-next-line global-require
	version: require('@/../package.json').version,

	...methods,
})
