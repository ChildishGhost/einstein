<template>
<ResultItem v-for="(result, idx) in results" :key="idx" :result="result" />
</template>

<script lang="ts">
import { defineComponent, toRefs, watch } from 'vue'
import ResultItem from '@/omniSearch/components/ResultItem.vue'

export default defineComponent({
	components: {
		ResultItem,
	},
	props: {
		results: {
			type: Array,
			default: () => [] as any[],
		},
	},
	setup(props) {
		const { results } = toRefs(props)

		watch(results, (v) => console.log(v))
	},
})
</script>
