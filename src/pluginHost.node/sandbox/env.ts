import { env } from 'node:process'

import { permitEnv } from '@/common/permittedEnv'

/**
 * Permitted environment variables
 *
 * This will also revert environment variables that changed by Electron,
 * and unset ELECTRON_RUN_AS_NODE so that the child process can use node/electron based applications.
 *
 * @see https://www.electronjs.org/docs/latest/api/environment-variables#set-by-electron
 */
export const permittedEnv = (() => {
	const originalEnv = { ...env }

	if (originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP) {
		originalEnv.XDG_CURRENT_DESKTOP = originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP
		delete originalEnv.ORIGINAL_XDG_CURRENT_DESKTOP
	}

	delete originalEnv.ELECTRON_RUN_AS_NODE

	return permitEnv(originalEnv)
})()
