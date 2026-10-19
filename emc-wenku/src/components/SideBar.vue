<script setup>
import { categories, periods } from '../utils/constants'

defineProps({
  selectedCategory: { type: String, default: '' },
  selectedPeriod: { type: String, default: '' },
})

const emit = defineEmits(['update:category', 'update:period'])
</script>

<template>
  <aside class="sidebar" aria-label="文献筛选">
    <section>
      <h2>文献分类</h2>
      <button
        type="button"
        class="filter-option"
        :aria-pressed="!selectedCategory"
        @click="emit('update:category', '')"
      >
        全部分类
      </button>
      <button
        v-for="item in categories"
        :key="item.id"
        type="button"
        class="filter-option"
        :aria-pressed="selectedCategory === item.id"
        @click="emit('update:category', item.id)"
      >
        {{ item.name }}
      </button>
    </section>
    <section>
      <h2>历史时期</h2>
      <button
        type="button"
        class="filter-option"
        :aria-pressed="!selectedPeriod"
        @click="emit('update:period', '')"
      >
        全部时期
      </button>
      <button
        v-for="item in periods"
        :key="item.id"
        type="button"
        class="filter-option"
        :aria-pressed="selectedPeriod === item.id"
        @click="emit('update:period', item.id)"
      >
        {{ item.name }}
      </button>
    </section>
  </aside>
</template>
