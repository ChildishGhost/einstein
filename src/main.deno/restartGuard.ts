import { fromFileUrl } from '@std/path'

const window = 60_000
const limit = 3
const denoConfig = fromFileUrl(new URL('../../deno.json', import.meta.url))

/** Decides whether an unexpectedly exited child is started again (RFC-0008/R7). */
export const createRestartGuard = (
	{ name = 'child', now = Date.now, log = console.error }: {
		name?: string
		now?: () => number
		log?: (line: string) => void
	} = {},
) => {
	let exits: number[] = []
	return {
		/** Records an unexpected exit; true when the child should be restarted. */
		exited() {
			const time = now()
			exits = [...exits.filter((exit) => time - exit < window), time]
			if (exits.length >= limit) {
				log(
					`${name} exited ${limit} times within ${window / 1000} s; not restarting it. ` +
						`Run \`einstein --restart\` (from source: \`deno task --config ${denoConfig} dev --restart\`).`,
				)
				return false
			}
			return true
		},
		reset() {
			exits = []
		},
	}
}
