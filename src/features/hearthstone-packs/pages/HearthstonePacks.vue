<template>
  <section class="packs-page"><div class="packs-container">
    <RouterLink class="back packs-back" to="/">← 返回主页</RouterLink>
    <header class="hero">
      <p class="eyebrow">Hearthstone Pack Tracker</p>
      <h1>{{ expansion.name }} · 开包进度</h1>
      <p>这里只列还没开到的卡；哪张开到了点一下标记来源（开包 / 合成 / 活动），它就划掉、总进度自动往前走。</p>
    </header>

    <section class="summary-grid" aria-label="收集进度">
      <article class="summary-card total-card">
        <div class="total-info">
          <span>总进度</span>
          <strong>{{ gotCount }}<small>/{{ expansion.total }}</small></strong>
          <small>{{ percent }}% · 还差 {{ missCount }} 张</small>
        </div>
        <div class="progress"><i :style="{ width: percent + '%' }"></i></div>
        <div class="mode-switch" role="group" aria-label="汇总显示方式">
          <button type="button" :class="{ on: statMode === 'count' }" @click="statMode = 'count'">张数</button>
          <button type="button" :class="{ on: statMode === 'dust' }" @click="statMode = 'dust'">粉尘</button>
        </div>
      </article>
      <article class="summary-card stat-card" :class="{ active: rarityFilter === 'all' }" role="button" tabindex="0" @click="rarityFilter = 'all'" @keydown.enter.prevent="rarityFilter = 'all'">
        <span>总计</span>
        <strong v-if="statMode === 'count'">{{ missCount }}</strong>
        <strong v-else>{{ fmtDust(totalDust) }}<small> 尘</small></strong>
        <small v-if="statMode === 'count'">还没开到</small>
        <small v-else>合成所需粉尘</small>
      </article>
      <article v-for="rarity in mainRarities" :key="rarity.key" class="summary-card stat-card" :style="{ '--rarity-color': rarity.color }" :class="{ active: rarityFilter === rarity.key }" role="button" tabindex="0" @click="rarityFilter = rarity.key" @keydown.enter.prevent="rarityFilter = rarity.key">
        <span>{{ rarity.label }}</span>
        <strong v-if="statMode === 'count'">{{ rarityMiss[rarity.key] }}</strong>
        <strong v-else>{{ fmtDust(rarityDust[rarity.key]) }}<small> 尘</small></strong>
        <small v-if="statMode === 'count'">缺失{{ rarity.label }}</small>
        <small v-else>合成需粉尘</small>
      </article>
      <article v-for="c in classStats" :key="c.key" class="summary-card" :class="{ 'has-miss': c.missing }">
        <span>{{ c.emoji }} {{ c.label }}</span>
        <strong>{{ c.got }}<small>/{{ c.total }}</small></strong>
        <small v-if="c.missing" class="miss-note">缺失 {{ c.missing }} 张</small>
        <small v-else>已集齐 🎉</small>
      </article>
    </section>

    <nav class="filter-tabs" aria-label="职业筛选">
      <button type="button" class="filter-toggle" :class="{ open: classPanelOpen }" @click="classPanelOpen = !classPanelOpen">
        🗂 职业：{{ classFilterLabel }}<small v-if="classFilter !== 'all'">还差 {{ classMiss(classFilter) }}</small><i class="chev">{{ classPanelOpen ? '▴' : '▾' }}</i>
      </button>
    </nav>
    <nav v-show="classPanelOpen" class="filter-tabs class-panel-tabs" aria-label="职业列表">
      <button type="button" :class="{ active: classFilter === 'all' }" @click="classFilter = 'all'">全部 <small>{{ missCount }}</small></button>
      <button v-for="c in classStats" :key="c.key" type="button" :class="{ active: classFilter === c.key }" @click="classFilter = c.key">{{ c.emoji }} {{ c.label }} <small>{{ c.missing }}</small></button>
    </nav>
    <nav class="filter-tabs" aria-label="稀有度筛选">
      <button type="button" :class="{ active: rarityFilter === 'all' }" @click="rarityFilter = 'all'">全部稀有度</button>
      <button v-for="rarity in mainRarities" :key="rarity.key" type="button" :class="{ active: rarityFilter === rarity.key }" :style="{ '--rarity-color': rarity.color }" @click="rarityFilter = rarity.key">{{ rarity.label }}</button>
    </nav>

    <section class="cards-panel">
      <div class="panel-heading">
        <div><h2>还没开到的卡</h2><p>点卡面放大看图 · 点卡片登记「开到了」：✅ 开包 / 合成 / 活动，标错点「还没开到」恢复。</p></div>
      </div>
      <section v-for="group in displayGroups" :key="group.key" class="class-section" :class="{ 'fav-section': group.fav }">
        <header class="class-head">
          <h3>{{ group.emoji }} {{ group.label }}</h3>
          <small v-if="group.fav">最想开到的 {{ group.cards.length }} 张</small>
          <small v-else-if="group.missing">缺失 {{ group.missing }}/{{ group.total }}</small>
          <small v-else>已集齐 🎉</small>
        </header>
        <div class="cards-grid">
          <article v-for="card in group.cards" :key="card.id" class="pack-card" :class="card.rarity" role="button" tabindex="0" @click="openEditor(card)" @keydown.enter.prevent="openEditor(card)">
            <div class="frame" title="点击放大" @click.stop="zoom = card">
              <img v-if="resolveImage(card.image)" :src="resolveImage(card.image)" :alt="card.name">
              <div v-else class="placeholder"><span>🖼️</span><small>图片待补</small></div>
              <em class="gem"></em>
              <span v-if="card.fav" class="fav-badge">⭐</span>
              <span class="zoom-hint">🔍</span>
            </div>
            <h3 class="card-name">{{ card.name }}</h3>
            <div class="badges">
              <b class="badge rarity-chip">{{ rarityLabel(card.rarity) }}</b>
              <b v-if="card.revived" class="badge miss-badge">↩ 从回顾区移回</b>
            </div>
          </article>
        </div>
      </section>
      <p v-if="!visibleCards.length" class="empty">这里空空如也，全部开到了 🎉</p>
    </section>

    <section class="cards-panel got-panel">
      <div class="panel-heading">
        <div><h2>已开到的卡</h2><p>留档回顾：来源与日期记录在数据文件里，按时间倒序。</p></div>
        <button class="got-toggle" type="button" @click="gotOpen = !gotOpen">{{ gotOpen ? '收起 ▴' : '展开 ▾' }} {{ gotRecords.length }}</button>
      </div>
      <div v-show="gotOpen" class="cards-grid">
        <article v-for="card in gotRecords" :key="card.id" class="pack-card got" :class="card.rarity" role="button" tabindex="0" @click="openEditor(card)" @keydown.enter.prevent="openEditor(card)">
          <div class="frame" title="点击放大" @click.stop="zoom = card">
            <img v-if="resolveImage(card.image)" :src="resolveImage(card.image)" :alt="card.name">
            <div v-else class="placeholder"><span>🖼️</span><small>图片待补</small></div>
            <em class="gem"></em>
            <span class="zoom-hint">🔍</span>
          </div>
          <h3 class="card-name">{{ card.name }}</h3>
          <div class="badges">
            <b class="badge rarity-chip">{{ rarityLabel(card.rarity) }}</b>
            <b class="badge got-badge">✅ {{ sourceLabel(card) }}<i v-if="gotDate(card)"> · {{ gotDate(card) }}</i></b>
          </div>
        </article>
      </div>
      <p v-if="gotOpen && !gotRecords.length" class="empty">还没有开卡记录：点上面的缺失卡登记后，会先以临时标记出现在这里。</p>
      <p v-if="gotOpen && removedArchive.length" class="removed-note">
        已在本机移除 {{ removedArchive.length }} 条留档记录（数据文件仍保留，换设备会重新出现）
        <button type="button" @click="restoreArchive">全部恢复</button>
      </p>
    </section>

    <div v-if="editing" class="editor-mask" @click.self="editing = null">
      <div class="editor">
        <header><b>{{ editing.name }}</b><button class="close" type="button" aria-label="关闭" @click="editing = null">×</button></header>
        <template v-if="editingInMissing && editing.revived">
          <p class="record-line">↩ 已从回顾区移回「还没开到」</p>
          <div class="editor-actions">
            <button class="btn act-clear" type="button" @click="restoreOne(editing)">↩ 回到已开到记录</button>
          </div>
          <p class="editor-hint">这条留档记录还在数据文件里，只是本机把它移回了缺失清单；点上面按钮可撤销。</p>
        </template>
        <template v-else-if="editingInMissing">
          <label class="date-row">开到日期 <input v-model="editDate" type="date"></label>
          <div class="editor-actions" :class="isTempGot(editing) ? 'four' : 'three'">
            <button class="btn act-pack" type="button" @click="mark('pack')">📦 开包</button>
            <button class="btn act-craft" type="button" @click="mark('craft')">🔨 合成</button>
            <button class="btn act-event" type="button" @click="mark('event')">🎁 活动</button>
            <button v-if="isTempGot(editing)" class="btn act-clear" type="button" @click="unmark">↩ 还没开到</button>
          </div>
          <p class="editor-hint">标记先存本机浏览器；想长期留档进回顾区，把卡名和来源告诉我挪进数据文件即可。</p>
        </template>
        <template v-else>
          <p class="record-line">✅ {{ sourceLabel(editing) }}<i v-if="gotDate(editing)"> · {{ gotDate(editing) }}</i></p>
          <div class="editor-actions">
            <button class="btn act-clear" type="button" @click="removeFromArchive(editing)">🗑 移出回顾区</button>
          </div>
          <p class="editor-hint">留档记录存在数据文件里；「移出回顾区」只在本机隐藏这条记录，换设备会重新出现。</p>
        </template>
      </div>
    </div>

    <div v-if="zoom" class="zoom-mask" @click="zoom = null">
      <figure>
        <img :src="resolveImage(zoom.image)" :alt="zoom.name">
        <figcaption>{{ zoom.name }}<small>{{ rarityLabel(zoom.rarity) }}</small></figcaption>
      </figure>
    </div>
  </div></section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { expansion, classes, rarities } from '../data/expansion.js'

// 「开到了」的标记存 localStorage，key 里带版本号；改结构时升 vN 避免读到旧格式
const STORAGE_KEY = 'hearthstone-packs:owned-v1'
const images = import.meta.glob('../assets/*', { eager: true, query: '?url', import: 'default' })
const cards = expansion.cards

function loadOwned() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
const owned = ref(loadOwned())
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(owned.value)) }

// 从回顾区移除的留档记录（只在本机隐藏，数据文件不动，可一键恢复）
const REMOVED_KEY = 'hearthstone-packs:archive-removed-v1'
function loadRemoved() {
  try { return JSON.parse(localStorage.getItem(REMOVED_KEY)) || [] } catch { return [] }
}
const removedArchive = ref(loadRemoved())
function persistRemoved() { localStorage.setItem(REMOVED_KEY, JSON.stringify(removedArchive.value)) }
function removeFromArchive(card) {
  if (!removedArchive.value.includes(card.id)) removedArchive.value.push(card.id)
  persistRemoved()
  editing.value = null
}
function restoreArchive() {
  removedArchive.value = []
  persistRemoved()
}

const today = () => new Date().toISOString().slice(0, 10)
// 留档记录（数据文件 obtained）+ 本机临时标记。
// 被移出回顾区的留档卡视作「重新回到没开到」，并回缺失池参与一切统计。
const obtainedRecords = expansion.obtained ?? []
const bakedIds = new Set(obtainedRecords.map((c) => c.id))
const missingPool = computed(() => [
  ...expansion.cards.filter((card) => !bakedIds.has(card.id)),
  ...obtainedRecords
    .filter((record) => removedArchive.value.includes(record.id))
    .map((record) => ({ ...record, revived: true }))
])
const isTempGot = (card) => !card.revived && Boolean(owned.value[card.id])
const SOURCE_LABELS = { pack: '开包', craft: '合成', event: '活动' }
// 缺失卡读 localStorage 标记，留档记录读自身字段
const sourceLabel = (card) => SOURCE_LABELS[owned.value[card.id]?.source ?? card.source] || '开包'
const gotDate = (card) => owned.value[card.id]?.date ?? card.date
const resolveImage = (name) => images[`../assets/${name}`] || null
const rarityLabel = (key) => rarities.find((r) => r.key === key)?.label || key

// 缺失卡只有传说和史诗，稀有/普通不再展示
const mainRarities = rarities.filter((r) => r.key === 'legendary' || r.key === 'epic')

// 合成定价（炉石标准）：传说 1600、史诗 400，稀有/普通备用
const CRAFT_COST = { legendary: 1600, epic: 400, rare: 100, common: 40 }
const dustOf = (card) => CRAFT_COST[card.rarity] || 0
const fmtDust = (n) => n.toLocaleString('en-US')

// 总进度 = 全版本 135 − 缺失池里仍未开到的张数；划掉一张它就自动 +1
const missCount = computed(() => missingPool.value.filter((card) => !isTempGot(card)).length)
const gotCount = computed(() => expansion.total - missCount.value)
const percent = computed(() => Math.round((gotCount.value / expansion.total) * 1000) / 10)

const classStats = computed(() => classes.map((c) => {
  const missing = missingPool.value.filter((card) => card.class === c.key && !isTempGot(card)).length
  return { ...c, missing, got: c.total - missing }
}))
const rarityMiss = computed(() => Object.fromEntries(mainRarities.map((r) => [r.key, missingPool.value.filter((card) => card.rarity === r.key && !isTempGot(card)).length])))
// 汇总卡「张数 / 粉尘」两种显示；粉尘 = 把还没开到的卡全部合成所需的尘
const statMode = ref('count')
const totalDust = computed(() => missingPool.value.filter((card) => !isTempGot(card)).reduce((sum, card) => sum + dustOf(card), 0))
const rarityDust = computed(() => Object.fromEntries(mainRarities.map((r) => [r.key, missingPool.value.filter((card) => card.rarity === r.key && !isTempGot(card)).reduce((sum, card) => sum + dustOf(card), 0)])))

const classPanelOpen = ref(false)
const classFilterLabel = computed(() => (classFilter.value === 'all' ? '全部' : classes.find((c) => c.key === classFilter.value)?.label || '全部'))
const classMiss = (key) => classStats.value.find((c) => c.key === key)?.missing ?? 0
const zoom = ref(null)

// 已开到回顾：数据文件里的留档记录（obtained）+ 本机临时标记，按日期倒序
const gotOpen = ref(false)
const gotRecords = computed(() => {
  const records = obtainedRecords
    .filter((record) => !removedArchive.value.includes(record.id))
    .map((c) => ({ ...c, baked: true }))
  for (const card of expansion.cards) {
    if (owned.value[card.id] && !bakedIds.has(card.id)) records.push({ ...card, baked: false })
  }
  return records
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const classFilter = ref('all')
const rarityFilter = ref('all')
// 缺失清单只显示还没开到的；标掉的卡进「已开到的卡」回顾区
const visibleCards = computed(() => missingPool.value.filter((card) => !isTempGot(card) &&
  (classFilter.value === 'all' || card.class === classFilter.value) &&
  (rarityFilter.value === 'all' || card.rarity === rarityFilter.value)
))
const groupedCards = computed(() => classStats.value
  .map((c) => ({ ...c, cards: visibleCards.value.filter((card) => card.class === c.key) }))
  .filter((group) => group.cards.length))
// 收藏的重点卡前排展示：缺失清单最上面单独一排（不受筛选影响），开到后自动撤下
const favCards = computed(() => missingPool.value.filter((card) => card.fav && !isTempGot(card)))
const displayGroups = computed(() => {
  const groups = groupedCards.value
  if (favCards.value.length) {
    groups.unshift({ key: 'fav', emoji: '⭐', label: '重点关注', fav: true, cards: favCards.value })
  }
  return groups
})

const editing = ref(null)
const editDate = ref(today())
// 编辑的卡是否在缺失池里且还没标记（不在说明是留档记录，只读；revived 是被移出回顾区回到缺失的）
const editingInMissing = computed(() => Boolean(editing.value && missingPool.value.some((card) => card.id === editing.value.id && !isTempGot(card))))
function openEditor(card) {
  editing.value = card
  editDate.value = owned.value[card.id]?.date || card.date || today()
}
function mark(source) {
  owned.value[editing.value.id] = { source, date: editDate.value || today() }
  persist()
  editing.value = null
}
function unmark() {
  delete owned.value[editing.value.id]
  persist()
  editing.value = null
}
// 被移出回顾区的留档卡：一键回到留档记录（撤销移出）
function restoreOne(card) {
  removedArchive.value = removedArchive.value.filter((id) => id !== card.id)
  persistRemoved()
  editing.value = null
}
</script>

<style scoped>
.packs-page { min-height: calc(100vh - var(--header-h)); padding: 48px 20px 70px; background: radial-gradient(circle at 8% 4%, #3a2c12 0, transparent 24rem), radial-gradient(circle at 90% 22%, #3d2340 0, transparent 26rem), #131520; color: #f5f1e8; }
.packs-container { max-width: 1160px; margin: auto; }
.packs-back { color: #b9b5ca; }
.packs-back:hover { color: #fff; }
.eyebrow { color: #eebd65; }
.hero h1 { font-size: clamp(2rem, 5vw, 3.3rem); margin: 4px 0 10px; letter-spacing: -.04em; }
.hero > p { margin: 0; color: #c3becc; }

.summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 30px 0 20px; }
.summary-card { display: flex; min-height: 112px; padding: 14px; flex-direction: column; border: 1px solid rgba(234, 213, 174, .16); border-radius: 14px; background: rgba(26, 28, 43, .82); box-shadow: 0 18px 38px rgba(0, 0, 0, .2); }
.summary-card span, .summary-card small { color: #aaa5b8; font-size: .84rem; }
.summary-card strong { margin: 4px 0; color: #f3d28a; font-size: 1.45rem; line-height: 1.2; }
.summary-card strong small { color: #8f8a9d; font-size: .92rem; font-weight: 600; }
.summary-card .miss-note { color: #df8893; }
.summary-card.has-miss { border-color: rgba(211, 109, 126, .26); }
.stat-card { grid-column: span 2; cursor: pointer; }
.stat-card strong { color: var(--rarity-color, #f3d28a); font-size: 1.7rem; }
.stat-card:hover, .stat-card:focus-visible { border-color: var(--rarity-color, rgba(234, 213, 174, .45)); }
.stat-card.active { border-color: var(--rarity-color, #efc96f); background: linear-gradient(145deg, color-mix(in srgb, var(--rarity-color, #edc96f) 16%, transparent), rgba(255, 255, 255, .03)); }
.total-card { grid-column: 1 / -1; flex-direction: row; align-items: center; gap: 18px; min-height: 0; padding: 16px 18px; background: linear-gradient(135deg, rgba(102, 72, 24, .5), rgba(30, 37, 59, .92)); }
.total-info { display: flex; align-items: baseline; gap: 12px; white-space: nowrap; }
.total-card strong { margin: 0; font-size: 2.1rem; }
.total-card .progress { flex: 1; margin: 0; }
.mode-switch { display: inline-flex; overflow: hidden; flex: none; border: 1px solid rgba(237, 201, 111, .35); border-radius: 999px; }
.mode-switch button { padding: 6px 14px; border: 0; background: transparent; color: #b9b5ca; font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; }
.mode-switch button.on { background: #edc96f; color: #17141d; }
.progress { margin-top: auto; height: 10px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, .1); }
.progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #d88b28, #f3d28a); transition: width .3s ease; }

.filter-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
.filter-tabs + .filter-tabs { margin-top: -4px; }
.filter-tabs button { border: 1px solid rgba(255, 255, 255, .15); border-radius: 999px; padding: 8px 14px; background: rgba(255, 255, 255, .05); color: #c8c3d0; font: inherit; font-weight: 700; cursor: pointer; }
.filter-tabs button.active { border-color: var(--rarity-color, #efc96f); background: var(--rarity-color, #edc96f); color: #17141d; }
.filter-tabs small { opacity: .72; margin-left: 3px; }
.filter-toggle { border-color: rgba(237, 201, 111, .4); color: #f0d9a8; }
.filter-toggle .chev { font-style: normal; margin-left: 6px; opacity: .8; }
.filter-toggle.open { border-color: #efc96f; background: rgba(237, 201, 111, .12); }
.class-panel-tabs { margin-top: -4px; padding: 10px 12px; border: 1px dashed rgba(237, 201, 111, .25); border-radius: 12px; }

.cards-panel { padding: 22px; margin-top: 8px; border: 1px solid rgba(234, 213, 174, .16); border-radius: 14px; background: rgba(26, 28, 43, .82); box-shadow: 0 18px 38px rgba(0, 0, 0, .2); }
.panel-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 20px; }
.panel-heading h2 { margin: 0 0 4px; font-size: 1.2rem; }
.panel-heading p { margin: 0; color: #aaa5b8; font-size: .9rem; }
.class-section + .class-section { margin-top: 26px; }
.fav-section { padding: 14px; border: 1px dashed rgba(237, 201, 111, .4); border-radius: 12px; background: rgba(237, 201, 111, .05); }
.fav-section .class-head h3 { color: #f3d28a; }
.fav-badge { position: absolute; top: 6px; left: 6px; font-size: .82rem; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, .7)); }
.class-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.class-head h3 { margin: 0; font-size: 1.08rem; }
.class-head small { color: #9b96a8; font-size: .8rem; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.pack-card { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid rgba(255, 255, 255, .09); border-radius: 12px; background: rgba(255, 255, 255, .025); cursor: pointer; transition: transform .15s ease, border-color .15s ease, opacity .15s ease; }
.pack-card:hover, .pack-card:focus-visible { transform: translateY(-3px); border-color: var(--rarity-color, rgba(255, 255, 255, .3)); }
.pack-card.legendary { --rarity-color: #ff8000; }
.pack-card.epic { --rarity-color: #a335ee; }
.pack-card.rare { --rarity-color: #0070dd; }
.pack-card.common { --rarity-color: #9d9d9d; }
.pack-card.got { border-color: rgba(103, 178, 106, .4); background: linear-gradient(145deg, rgba(46, 84, 48, .28), rgba(255, 255, 255, .03)); opacity: .78; }
.frame { position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 404 / 558; border: 1px solid rgba(255, 255, 255, .12); background: linear-gradient(160deg, #2b2436, #191622); cursor: zoom-in; }
.frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.placeholder { display: flex; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--rarity-color); background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--rarity-color) 26%, transparent) 0, transparent 62%); }
.placeholder span { font-size: 1.9rem; }
.placeholder small { color: #9b96a8; font-size: .72rem; }
.gem { position: absolute; right: 6px; bottom: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--rarity-color); box-shadow: 0 0 10px var(--rarity-color); }
.zoom-hint { position: absolute; top: 6px; right: 6px; padding: 2px 6px; border-radius: 999px; background: rgba(10, 9, 14, .62); font-size: .72rem; opacity: 0; transition: opacity .15s ease; }
.frame:hover .zoom-hint { opacity: 1; }
.pack-card .card-name { margin: 0; font-size: .92rem; line-height: 1.3; }
.badges { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: auto; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255, 255, 255, .07); color: #9b96a8; font-size: .72rem; font-weight: 700; }
.badge i { font-style: normal; font-weight: 500; opacity: .8; }
.rarity-chip { color: var(--rarity-color); background: color-mix(in srgb, var(--rarity-color) 14%, transparent); }
.got-badge { background: rgba(103, 178, 106, .16); color: #9fd3a3; }
.empty { margin: 8px 0 0; color: #666474; }
.got-panel { margin-top: 16px; }
.got-toggle { padding: 7px 14px; border: 1px solid rgba(237, 201, 111, .4); border-radius: 999px; background: rgba(237, 201, 111, .08); color: #f0d9a8; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
.got-toggle:hover { border-color: #efc96f; }

.editor-mask { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(10, 9, 14, .66); }
.editor { width: min(420px, 100%); padding: 20px; border: 1px solid rgba(234, 213, 174, .22); border-radius: 14px; background: #1d1f30; box-shadow: 0 24px 60px rgba(0, 0, 0, .5); }
.editor header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
.editor header b { font-size: 1.05rem; }
.editor .close { border: 0; background: none; color: #9b96a8; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.editor .close:hover { color: #fff; }
.date-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: #aaa5b8; font-size: .9rem; }
.date-row input { flex: 1; padding: 7px 10px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 8px; background: rgba(255, 255, 255, .05); color: #f5f1e8; font: inherit; color-scheme: dark; }
.editor-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.editor-actions.four { grid-template-columns: repeat(2, 1fr); }
.editor-actions .btn { padding: 9px 6px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 9px; background: rgba(255, 255, 255, .05); color: #e7e2ee; font-size: .85rem; font-weight: 700; cursor: pointer; }
.editor-actions .btn:hover { border-color: #efc96f; }
.act-pack:hover { background: rgba(237, 201, 111, .18); }
.act-craft:hover { background: rgba(163, 53, 238, .22); }
.act-event:hover { background: rgba(103, 178, 106, .2); }
.act-clear:hover { background: rgba(255, 255, 255, .1); }
.editor-hint { margin: 12px 0 0; color: #8f8a9d; font-size: .78rem; }
.record-line { margin: 4px 0 10px; color: #9fd3a3; font-size: 1.05rem; font-weight: 700; }
.record-line i { font-style: normal; font-weight: 500; opacity: .85; }
.editor-actions + .editor-hint { margin-top: 12px; }
.removed-note { margin: 14px 0 0; color: #8f8a9d; font-size: .8rem; }
.removed-note button { margin-left: 8px; padding: 3px 10px; border: 1px solid rgba(255, 255, 255, .2); border-radius: 999px; background: rgba(255, 255, 255, .05); color: #c8c3d0; font: inherit; font-size: .78rem; cursor: pointer; }
.removed-note button:hover { border-color: #efc96f; color: #f0d9a8; }

.zoom-mask { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(8, 7, 12, .82); cursor: zoom-out; }
.zoom-mask figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.zoom-mask img { max-height: 76vh; max-width: min(80vw, 480px); border-radius: 14px; border: 1px solid rgba(234, 213, 174, .25); box-shadow: 0 30px 80px rgba(0, 0, 0, .6); }
.zoom-mask figcaption { color: #f0d9a8; font-size: 1.05rem; font-weight: 700; }
.zoom-mask figcaption small { margin-left: 8px; color: #9b96a8; font-size: .8rem; font-weight: 500; }

@media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } .stat-card { grid-column: span 2; } }
@media (max-width: 580px) {
  .packs-page { padding: 28px 14px 50px; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .summary-card { min-height: 96px; padding: 12px; }
  .summary-card strong { font-size: 1.3rem; }
  .total-card { flex-wrap: wrap; }
  .total-info { flex-wrap: wrap; }
  .total-card .progress { flex-basis: 100%; }
  .mode-switch { flex-basis: 100%; justify-content: center; }
  .cards-panel { padding: 15px; }
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px; }
  .editor-actions, .editor-actions.four { grid-template-columns: 1fr; }
}
</style>
