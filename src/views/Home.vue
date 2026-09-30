<template>
  <div class="page home">
    <h1 class="page-title">
      zentrix566 的小玩具
      <span class="count-badge">{{ homeCards.length }}</span>
    </h1>
    <p class="page-subtitle">按用途整理的小玩具，点开即玩。</p>
    <nav class="category-nav" aria-label="首页分类">
      <a v-for="category in visibleCategories" :key="category.key" :href="`#${category.key}`">{{ category.name }}</a>
    </nav>
    <section v-for="category in visibleCategories" :id="category.key" :key="category.key" class="category-section">
      <div class="category-heading">
        <span>{{ category.emoji }}</span>
        <h2>{{ category.name }}</h2>
        <small>{{ category.cards.length }} 项</small>
      </div>
      <div class="cards">
        <RouterLink
          v-for="f in category.cards"
          :key="f.slug"
          class="card"
          :to="f.routes[0].path"
        >
          <div class="emoji">{{ f.emoji }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.description }}</p>
        </RouterLink>
      </div>
    </section>
    <section class="category-section">
      <div class="category-heading">
        <span>📋</span>
        <h2>项目记录</h2>
      </div>
      <div class="cards">
      <RouterLink class="card" to="/changelog">
        <div class="emoji">📋</div>
        <h3>更新日志 · Changelog</h3>
        <p>项目主要功能与数据更新记录，按提交日期整理，每天一条。</p>
      </RouterLink>
      </div>
    </section>
    <transition name="btt">
      <button v-if="showBackTop" class="back-top" type="button" aria-label="回到顶部" @click="toTop">↑</button>
    </transition>
  </div>
</template>

<script setup>
// 首页：各子项目入口卡片由 registry 的 homeCards 自动生成，
// 新增子项目无需在此手写卡片，只需在其 index.js 的 manifest 里填好
// emoji / title / description（card:false 可隐藏卡片但保留路由）。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { homeCards } from '../features/registry.js'

// 首页分类特意在这里静态维护：调整归属只需改 slug，不影响 feature 的自动注册和路由。
const categories = [
  { key: 'favorites', name: '收藏', emoji: '★', slugs: ['calculator', 'imbue-mage', 'history-timeline', 'biography', 'dynasty-map', 'subway', 'weight-tracker', 'running-dashboard', 'marathon-results'] },
  { key: 'personal', name: '个人', emoji: '🏃', slugs: ['weight-tracker', 'running-dashboard', 'marathon-results', 'hearthstone-legends'] },
  { key: 'history', name: '历史', emoji: '🏛️', slugs: ['virtual-museum', 'officials', 'career-roles', 'contemporary-figures', 'jiangyin', 'xifengkou'] },
  { key: 'games', name: '游戏', emoji: '🎮', slugs: ['shanghai', 'donkey-mill', 'jigsaw', 'jungle-chess', 'huapian', 'game-show', 'card-battle', 'emperor', 'minister', 'pet', 'stick-fight', 'fight', 'world-cup', 'canghai', 'domino', 'sand-pit', 'driving', 'transformer', '3d-project', 'dragon-ball', 'pipes'] },
  { key: 'life-tools', name: '生活与工具', emoji: '🧰', slugs: ['age-compare', 'interval-training', 'countdown', 'creator-hall', 'secure-storage', 'calligraphy', 'nexus', 'office-chat', 'world-map'] }
]

// 固定置顶的四个老项目，不参与「最近」计算
const PINNED_SLUGS = ['history-timeline', 'biography', 'dynasty-map', 'subway']
// 「最近」分类展示的最新项目数量
const RECENT_COUNT = 4

const visibleCategories = computed(() => {
  const cards = new Map(homeCards.map((card) => [card.slug, card]))
  const assigned = new Set(categories.flatMap((category) => category.slugs))
  // 「最近」：置顶四强之外按 order 升序（order 越小越是新加的）取前 4 个，自动跟随新增项目更新
  const recentCards = homeCards.filter((card) => !PINNED_SLUGS.includes(card.slug)).slice(0, RECENT_COUNT)
  const recentSlugs = new Set(recentCards.map((card) => card.slug))
  const grouped = categories
    .map((category) => ({ ...category, cards: category.slugs.map((slug) => cards.get(slug)).filter(Boolean) }))
    .filter((category) => category.cards.length)
  // 「最近」固定插在「收藏」下方
  const favIndex = grouped.findIndex((category) => category.key === 'favorites')
  grouped.splice(favIndex + 1, 0, { key: 'recent', name: '最近', emoji: '🕒', cards: recentCards })
  const remaining = homeCards.filter((card) => !assigned.has(card.slug) && !recentSlugs.has(card.slug))
  return remaining.length ? [...grouped, { key: 'other', name: '其他', emoji: '🧩', cards: remaining }] : grouped
})

// 下滑超过一屏后显示「回到顶部」悬浮按钮
const showBackTop = ref(false)
function onScroll() {
  showBackTop.value = window.scrollY > window.innerHeight
}
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary-dark);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0;
}

.category-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.category-nav a {
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  padding: 6px 11px;
  text-decoration: none;
}

.category-nav a:hover {
  background: var(--primary-soft);
  color: var(--primary-dark);
}

.back-top {
  position: fixed;
  right: 26px;
  bottom: 34px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.back-top:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}

.btt-enter-active,
.btt-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.category-section {
  margin-top: 34px;
  scroll-margin-top: 20px;
}

.category-heading {
  align-items: center;
  display: flex;
  gap: 8px;
}

.category-heading h2 {
  font-size: 1.22rem;
  margin: 0;
}

.category-heading small {
  color: var(--muted);
  font-size: 0.78rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.card .emoji {
  font-size: 36px;
}

.card h3 {
  font-size: 18px;
  margin: 12px 0 8px;
}

.card p {
  color: var(--muted);
  font-size: 14px;
  margin: 0;
}
</style>
