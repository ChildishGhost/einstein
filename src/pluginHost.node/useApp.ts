import { AppContext } from 'einstein'

import Environment from './Environment'

export default (): AppContext => ({
	environment: {
		platform: Environment.platform,
		homedir: Environment.userHome
	}
})
