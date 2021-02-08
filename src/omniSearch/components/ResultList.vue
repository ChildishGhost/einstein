<template>
<ResultItem v-for="(result, idx) in results" :key="idx" :result="result" />
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import ResultItem from '@/omniSearch/components/ResultItem.vue'
import { Suggestion } from '@/api/searchEngine'

export default defineComponent({
	components: {
		ResultItem,
	},
	props: {
		results: {
			type: Array,
			default: () => [] as PropType<Suggestion[]>,
		},
	},
})
</script>
