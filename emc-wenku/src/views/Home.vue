<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import Pagination from '../components/Pagination.vue'
import SideBar from '../components/SideBar.vue'
import { categories, periods } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const router = useRouter()
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
const hasActiveFilters = computed(() =>
  Boolean(searchKeyword.value.trim() || selectedCategory.value || selectedPeriod.value),
)
const activeCategoryName = computed(
  () => categories.find((item) => item.id === selectedCategory.value)?.name ?? '',
)
const activePeriodName = computed(
  () => periods.find((item) => item.id === selectedPeriod.value)?.name ?? '',
)

function clearFilters() {
  searchKeyword.value = ''
  selectedCategory.value = ''
  selectedPeriod.value = ''
  filtersOpen.value = false
  if (route.query.q) router.replace({ name: 'home' })
}
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
        aria-controls="home-filter-panel"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        {{ filtersOpen ? '收起筛选' : '分类与时期筛选' }}
      </button>
      <SideBar
        id="home-filter-panel"
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
      <div class="catalogue-toolbar" aria-live="polite">
        <p class="muted">
          共找到 <strong>{{ filteredList.length }}</strong> 篇文献
          <span v-if="hasActiveFilters">（筛选条件已生效）</span>
        </p>
        <button v-if="hasActiveFilters" class="text-button" type="button" @click="clearFilters">
          清除全部筛选
        </button>
      </div>
      <div v-if="hasActiveFilters" class="active-filters" aria-label="当前筛选条件">
        <span v-if="searchKeyword.trim()" class="tag">搜索：{{ searchKeyword.trim() }}</span>
        <span v-if="activeCategoryName" class="tag">分类：{{ activeCategoryName }}</span>
        <span v-if="activePeriodName" class="tag">时期：{{ activePeriodName }}</span>
      </div>
      <div v-if="paginatedList.length" class="literature-grid">
        <LitCard v-for="item in paginatedList" :key="item.id" :lit-item="item" />
      </div>
      <div v-else class="empty-state">
        <h2>暂时没有文献</h2>
        <p>
          {{
            hasActiveFilters
              ? '没有符合当前筛选条件的结果。'
              : '文库暂时为空，可以在后台添加文献或导入数据。'
          }}
        </p>
        <button v-if="hasActiveFilters" class="button" type="button" @click="clearFilters">
          清除筛选条件
        </button>
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
