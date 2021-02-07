<template>
	<div>
		<input v-model="searchTerm" :class="style.searchBox" ref="searchBoxRef" />
	</div>
	<ResultList v-if="searchTerm !== ''" />
</template>

<script lang="ts">
import {
	defineComponent, inject, nextTick, onMounted, ref, useCssModule, watch,
} from 'vue'
import useWindowSize from '@/omniSearch/composables/useWindowSize'
import ResultList from '@/omniSearch/components/ResultList.vue'

export default defineComponent({
	components: {
		ResultList,
	},
	setup() {
		const { calculateDesiredSize } = useWindowSize(inject('$app'))
		const searchTerm = ref('')
		const searchBoxRef = ref()

		watch(() => searchTerm.value, (val, oldVal) => {
			console.log(val)
			if (val === oldVal) { return }

			nextTick(calculateDesiredSize)
		})

		onMounted(() => {
			searchBoxRef.value.focus()
		})

		return {
			style: useCssModule(),
			searchTerm,
			searchBoxRef,
		}
	},
})
</script>

<style lang="scss" module>
.search-box {
	outline: none;
	font-size: 24pt;
	color: #ffffff;
	background-color: transparent;
	border: 0;
	padding: 8px;
}
</style>
