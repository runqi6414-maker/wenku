<script setup>
import { categories, politicalSubcategories } from '../utils/constants'

defineProps({
  selectedCategory: { type: String, default: '' },
  selectedSubcategory: { type: String, default: '' },
})

const emit = defineEmits(['update:category', 'update:subcategory'])
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
    <section v-if="selectedCategory === '04'">
      <h2>政论文书分期</h2>
      <p class="muted">仅适用于政论文书类文献</p>
      <button
        type="button"
        class="filter-option"
        :aria-pressed="!selectedSubcategory"
        @click="emit('update:subcategory', '')"
      >
        全部分期
      </button>
      <button
        v-for="item in politicalSubcategories"
        :key="item.id"
        type="button"
        class="filter-option"
        :aria-pressed="selectedSubcategory === item.id"
        @click="emit('update:subcategory', item.id)"
      >
        {{ item.name }}
      </button>
    </section>
  </aside>
</template>
