<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import Pagination from '../components/Pagination.vue'
import SideBar from '../components/SideBar.vue'
import { categories, politicalSubcategories } from '../utils/constants'
import { api } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const router = useRouter()
const {
  literatureList,
  searchKeyword,
  loadLiterature,
  loadOverview,
  overview,
  overviewLoaded,
  loading,
  error,
} = useAppStore()
const selectedCategory = ref('')
const selectedSubcategory = ref('')
const currentPage = ref(1)
const totalCount = ref(0)
const pageSize = 12
const filtersOpen = ref(false)
const recentItems = ref([])
const popularItems = ref([])
const showCatalogue = computed(() => route.path === '/literature')
const paginatedList = computed(() => literatureList.value)
const hasActiveFilters = computed(() =>
  Boolean(searchKeyword.value.trim() || selectedCategory.value || selectedSubcategory.value),
)
const activeCategoryName = computed(
  () => categories.find((item) => item.id === selectedCategory.value)?.name ?? '',
)
const activeSubcategoryName = computed(
  () => politicalSubcategories.find((item) => item.id === selectedSubcategory.value)?.name ?? '',
)

async function refreshList() {
  if (!showCatalogue.value) return
  try {
    const result = await loadLiterature({
      page: currentPage.value,
      pageSize,
      keyword: searchKeyword.value.trim(),
      categoryId: selectedCategory.value,
      subcategoryId: selectedSubcategory.value,
    })
    totalCount.value = result.total
  } catch {
    totalCount.value = 0
  }
}
watch(
  () => route.query.q,
  (value) => {
    searchKeyword.value = typeof value === 'string' ? value : ''
  },
  { immediate: true },
)
watch(selectedCategory, (category) => {
  if (category !== '04') selectedSubcategory.value = ''
})
watch([searchKeyword, selectedCategory, selectedSubcategory], () => {
  currentPage.value = 1
  if (showCatalogue.value) refreshList()
})
watch(currentPage, refreshList)
watch(
  () => route.path,
  async () => {
    if (showCatalogue.value) await refreshList()
    else {
      try {
        await Promise.all([
          loadOverview(),
          api.get('/home/recent-literature').then((items) => {
            recentItems.value = items
          }),
          api.get('/home/popular-literature').then((items) => {
            popularItems.value = items
          }),
        ])
      } catch {
        /* The portal keeps honest empty states while the API is unavailable. */
      }
    }
  },
  { immediate: true },
)

function clearFilters() {
  searchKeyword.value = ''
  selectedCategory.value = ''
  selectedSubcategory.value = ''
  filtersOpen.value = false
  if (route.query.q) router.replace({ name: 'home' })
}
</script>

<template>
  <section v-if="!showCatalogue" class="home-portal">
    <div class="portal-hero">
      <p class="eyebrow">EARTHMC CHINESE COMMUNITY ARCHIVE</p>
      <h1>保存国区历史文献<br />记录玩家社群的发展历程</h1>
      <p class="muted">围绕文献的来源、形成时间与历史背景，建立可检索、可追溯的社区资料库。</p>
      <form
        class="portal-search"
        role="search"
        @submit.prevent="
          router.push({
            name: 'literature-list',
            query: searchKeyword.trim() ? { q: searchKeyword.trim() } : {},
          })
        "
      >
        <label class="sr-only" for="portal-search">搜索文献</label
        ><input
          id="portal-search"
          v-model="searchKeyword"
          type="search"
          placeholder="搜索文献标题、作者、正文或编号"
        /><button class="button button-primary" type="submit">搜索文库</button>
      </form>
      <div class="row-actions">
        <RouterLink class="button" to="/literature">浏览文献</RouterLink
        ><RouterLink class="button button-primary" to="/submit">我要投稿</RouterLink>
      </div>
    </div>
    <section>
      <div class="page-heading">
        <div>
          <p class="eyebrow">ARCHIVE OVERVIEW</p>
          <h2>文库运行概况</h2>
        </div>
      </div>
      <div class="stats-grid">
        <article class="stat-card">
          <span class="muted">正式馆藏</span
          ><strong>{{ overviewLoaded ? overview.literatureCount : '—' }}</strong>
        </article>
        <article class="stat-card">
          <span class="muted">文献分类</span
          ><strong>{{ overviewLoaded ? overview.categoryCount : '—' }}</strong>
        </article>
        <article class="stat-card">
          <span class="muted">政论文书分期</span
          ><strong>{{ overviewLoaded ? overview.subcategoryCount : '—' }}</strong>
        </article>
        <article class="stat-card">
          <span class="muted">累计浏览</span
          ><strong>{{ overviewLoaded ? overview.viewCount.toLocaleString() : '—' }}</strong>
        </article>
      </div>
    </section>
    <section>
      <div class="page-heading">
        <div>
          <p class="eyebrow">RECENTLY ADDED</p>
          <h2>最近新增文献</h2>
        </div>
        <RouterLink to="/literature">查看目录 →</RouterLink>
      </div>
      <div v-if="recentItems.length" class="literature-grid">
        <LitCard v-for="item in recentItems" :key="item.id" :lit-item="item" />
      </div>
      <p v-else class="empty-state">暂无正式收录文献。</p>
    </section>
    <section>
      <div class="page-heading">
        <div>
          <p class="eyebrow">MOST VIEWED</p>
          <h2>热门文献</h2>
        </div>
        <RouterLink to="/literature">查看目录 →</RouterLink>
      </div>
      <div v-if="popularItems.length" class="literature-grid">
        <LitCard v-for="item in popularItems" :key="item.id" :lit-item="item" />
      </div>
      <p v-else class="empty-state">暂无足够的公开浏览数据生成榜单。</p>
    </section>
  </section>
  <section v-else class="home-layout">
    <div class="filter-column">
      <button
        class="button filter-toggle"
        type="button"
        aria-controls="home-filter-panel"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        {{ filtersOpen ? '收起筛选' : '分类与政论文书分期筛选' }}
      </button>
      <SideBar
        id="home-filter-panel"
        :class="{ 'filter-panel-closed': !filtersOpen }"
        :selected-category="selectedCategory"
        :selected-subcategory="selectedSubcategory"
        @update:category="selectedCategory = $event"
        @update:subcategory="selectedSubcategory = $event"
      />
    </div>
    <div class="catalogue">
      <div class="page-heading">
        <div>
          <p class="eyebrow">EARTHMC CHINESE COMMUNITY ARCHIVE</p>
          <h1>玩家文库</h1>
          <p class="muted">整理、检索与保存 EarthMC 国区玩家的历史文献。</p>
        </div>
      </div>
      <div class="catalogue-toolbar" aria-live="polite">
        <p class="muted">
          共找到 <strong>{{ totalCount }}</strong> 篇正式收录文献<span v-if="hasActiveFilters"
            >（筛选条件已生效）</span
          >
        </p>
        <button v-if="hasActiveFilters" class="text-button" type="button" @click="clearFilters">
          清除全部筛选
        </button>
      </div>
      <div v-if="hasActiveFilters" class="active-filters" aria-label="当前筛选条件">
        <span v-if="searchKeyword.trim()" class="tag">搜索：{{ searchKeyword.trim() }}</span
        ><span v-if="activeCategoryName" class="tag">分类：{{ activeCategoryName }}</span
        ><span v-if="activeSubcategoryName" class="tag">政论文书分期：{{ activeSubcategoryName }}</span>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="loading" class="muted" role="status">正在读取正式馆藏…</p>
      <div v-else-if="paginatedList.length" class="literature-grid">
        <LitCard v-for="item in paginatedList" :key="item.id" :lit-item="item" />
      </div>
      <div v-else class="empty-state">
        <h2>{{ hasActiveFilters ? '没有找到匹配文献' : '文库正在准备收录' }}</h2>
        <p>
          {{
            hasActiveFilters
              ? '请调整关键词、主分类或政论文书子分类后再试。'
              : '正式馆藏由用户投稿并经审核后发布。开发环境目前未载入测试馆藏。'
          }}
        </p>
        <button v-if="hasActiveFilters" class="button" type="button" @click="clearFilters">
          清除筛选条件
        </button>
      </div>
      <Pagination
        :total="totalCount"
        :page-size="pageSize"
        :current-page="currentPage"
        @change-page="currentPage = $event"
      />
    </div>
  </section>
</template>
