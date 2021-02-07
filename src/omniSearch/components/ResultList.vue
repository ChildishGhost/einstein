<template>
<ResultItem />
<ResultItem />
<ResultItem />
<ResultItem />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ResultItem from '@/omniSearch/components/ResultItem.vue'

export default defineComponent({
	components: {
		ResultItem,
	},
})
</script>
