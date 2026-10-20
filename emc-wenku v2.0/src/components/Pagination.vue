<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 9 },
  currentPage: { type: Number, default: 1 },
})
const emit = defineEmits(['change-page'])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pageNumbers = computed(() => {
  const start = Math.max(1, Math.min(props.currentPage - 2, pageCount.value - 4))
  return Array.from({ length: Math.min(5, pageCount.value) }, (_, index) => start + index)
})
</script>

<template>
  <nav v-if="pageCount > 1" class="pagination" aria-label="分页">
    <button
      class="button"
      type="button"
      :disabled="currentPage <= 1"
      @click="emit('change-page', currentPage - 1)"
    >
      上一页
    </button>
    <button
      v-for="page in pageNumbers"
      :key="page"
      class="button page-number"
      :class="{ 'page-number-current': currentPage === page }"
      type="button"
      :aria-current="currentPage === page ? 'page' : undefined"
      @click="emit('change-page', page)"
    >
      {{ page }}
    </button>
    <button
      class="button"
      type="button"
      :disabled="currentPage >= pageCount"
      @click="emit('change-page', currentPage + 1)"
    >
      下一页
    </button>
  </nav>
</template>
