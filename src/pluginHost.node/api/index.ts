import * as API from 'einstein'

import { methods } from './methods'

export const generateAPI = () => ({
	// import constants
	...API,

	// eslint-disable-next-line global-require
	version: require('@/../package.json').version as string,

	...methods,
})
