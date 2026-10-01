/** The icon URL to draw, if any: the UI process has no network access (RFC-0008/R4). */
export const shownIcon = (url?: string) => /^(plugin|data):/i.test(url ?? '') ? url : undefined
