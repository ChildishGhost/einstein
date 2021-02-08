import Fuse from 'fuse.js'

import PluginManager from '@/sharedProcess/PluginManager'
import ExamplePlugin from '@/sharedProcess/plugins/example'
import DesktopApplicationsPlugin from '@/sharedProcess/plugins/desktop'
import useMessageChannel from '@/sharedProcess/useMessageChannel'

const pluginManager = new PluginManager()

;(async () => {
	const messageChannel = await useMessageChannel()

	await pluginManager
		.register(new ExamplePlugin())
		.register(new DesktopApplicationsPlugin())
		.setup()

	messageChannel.register('plugin:performSearch', async ({ term }) => {
		const results = await pluginManager.search(term)

		// TODO: aggregate hint and completions?
		const mergedResult = {
			suggestions: results.reduce((acc, { suggestions }) => {
				acc.push(...suggestions)
				return acc
			}, []),
		}

		const fuse = new Fuse(mergedResult.suggestions, {
			keys: [ 'title', 'description' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 1.0,
		})

		// use the rest of the search terms if trigger is set
		const fuzzTerm = term.includes(' ')
			? term.split(' ').slice(1).join(' ') : term

		const rankedResult = {
			suggestions: fuse.search(fuzzTerm).map(({ item }) => item),
		}

		console.log(`Fuzzing on: ${fuzzTerm}`)
		console.log(mergedResult)
		console.log(rankedResult)

		messageChannel.sendMessage('plugin:performSearch:reply', {
			term,
			result: rankedResult,
		})
	})

	messageChannel.sendMessage('plugin:initialized')
})()
