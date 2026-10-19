<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import Pagination from '../components/Pagination.vue'
import SideBar from '../components/SideBar.vue'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const { literatureList, searchKeyword } = useAppStore()
const selectedCategory = ref('')
const selectedPeriod = ref('')
const currentPage = ref(1)
const filtersOpen = ref(false)
const pageSize = 9

watch(
  () => route.query.q,
  (value) => {
    searchKeyword.value = typeof value === 'string' ? value : ''
  },
  { immediate: true },
)

const filteredList = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase()
  return literatureList.value.filter((item) => {
    const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value
    const matchesPeriod = !selectedPeriod.value || item.period === selectedPeriod.value
    const matchesKeyword =
      !keyword ||
      `${item.title} ${item.author} ${item.summary}`.toLocaleLowerCase().includes(keyword)
    return matchesCategory && matchesPeriod && matchesKeyword
  })
})
const paginatedList = computed(() =>
  filteredList.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize),
)
watch([searchKeyword, selectedCategory, selectedPeriod], () => (currentPage.value = 1))
watch(
  () => filteredList.value.length,
  (length) => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(length / pageSize)))
  },
)
</script>

<template>
  <section class="home-layout">
    <div class="filter-column">
      <button
        class="button filter-toggle"
        type="button"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        {{ filtersOpen ? '收起筛选' : '分类与时期筛选' }}
      </button>
      <SideBar
        :class="{ 'filter-panel-closed': !filtersOpen }"
        :selected-category="selectedCategory"
        :selected-period="selectedPeriod"
        @update:category="selectedCategory = $event"
        @update:period="selectedPeriod = $event"
      />
    </div>
    <div class="catalogue">
      <div class="page-heading">
        <div>
          <p class="eyebrow">EARTHMC CHINESE COMMUNITY ARCHIVE</p>
          <h1>玩家文库</h1>
          <p class="muted">整理与检索 EarthMC 国区玩家的历史文献。</p>
        </div>
      </div>
      <p class="muted">共找到 {{ filteredList.length }} 篇文献</p>
      <div v-if="paginatedList.length" class="literature-grid">
        <LitCard v-for="item in paginatedList" :key="item.id" :lit-item="item" />
      </div>
      <div v-else class="empty-state">
        <h2>暂时没有文献</h2>
        <p>可以更换筛选条件，或在后台添加文献。</p>
      </div>
      <Pagination
        :total="filteredList.length"
        :page-size="pageSize"
        :current-page="currentPage"
        @change-page="currentPage = $event"
      />
    </div>
  </section>
</template>
