import type { openUrlFn, spawnFn } from '../../api/index.ts'
import pkg from '../../../package.json' with { type: 'json' }
import type { BrokerRequest } from '../broker.ts'

export type * from '../../api/index.ts'
export { VOID_TRIGGER } from '../../api/searchEngine.ts'

export const version: string = pkg.version

const request = (message: BrokerRequest) => self.postMessage(message)

/** Carried out by the plugin host, which holds the environment allowlist (RFC-0008/R17). */
export const spawn: spawnFn = (command, options) => request({ type: 'spawn', command, options })

export const openUrl: openUrlFn = (url) => request({ type: 'openUrl', url })
