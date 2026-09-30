<template>
  <section class="section page-section age-page">
    <div class="container">
      <div class="age-panel">
        <header>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Age Compare</p>
          <h1>父母子女年龄对照</h1>
          <p class="age-subtitle">输入出生年份，逐年对照父母与子女的年龄变化，逢 5 岁节点自动点亮。</p>
        </header>

        <div class="age-layout">
          <form class="age-form" @submit.prevent>
            <label class="field">
              父母出生年份
              <input
                v-model.number="parentYear"
                type="number"
                inputmode="numeric"
                min="1900"
                max="2100"
                placeholder="如 1990"
              >
            </label>

            <div v-for="(child, i) in childYears" :key="i" class="child-row">
              <label class="field">
                {{ childLabel(i) }}出生年份
                <input
                  v-model.number="child.year"
                  type="number"
                  inputmode="numeric"
                  min="1900"
                  max="2100"
                  placeholder="如 2025"
                >
              </label>
              <button
                v-if="childYears.length > 1"
                type="button"
                class="child-del"
                :title="`删除${childLabel(i)}`"
                @click="removeChild(i)"
              >✕</button>
            </div>

            <button type="button" class="btn" :disabled="childYears.length >= MAX_CHILDREN" @click="addChild">
              ＋ 添加一个子女
            </button>

            <p v-if="formError" class="form-error">{{ formError }}</p>
            <p v-else class="form-hint">
              年龄按年份差计算（当年生日后的周岁，生日先后会有半年内的出入）；对照表自动显示到父母 {{ TABLE_END_AGE }} 岁，输入会保存在本地浏览器。
            </p>
          </form>

          <div v-if="!formError" class="age-result">
            <div class="stat-cards">
              <article class="stat-card">
                <h3>生孩子时父母</h3>
                <ul class="stat-lines">
                  <li v-for="(line, i) in birthGapLines" :key="i">
                    <span>{{ line.label }}</span>
                    <strong>{{ line.value }}</strong>
                  </li>
                </ul>
              </article>

              <article class="stat-card">
                <h3>今年（{{ currentYear }}）</h3>
                <ul class="stat-lines">
                  <li v-for="(line, i) in todayLines" :key="i">
                    <span>{{ line.label }}</span>
                    <strong>{{ line.value }}</strong>
                  </li>
                </ul>
              </article>

              <article class="stat-card">
                <h3>下一个节点</h3>
                <p v-if="nextNode" class="stat-next">
                  <strong>{{ nextNode.year }} 年</strong>
                  <span>{{ nextNode.events.join('、') }}</span>
                  <small>届时父母 {{ nextNode.parentAge }} 岁</small>
                </p>
                <p v-else class="stat-empty">—</p>
              </article>
            </div>

            <div class="table-wrap">
              <table class="age-table">
                <thead>
                  <tr>
                    <th class="year-col">年份</th>
                    <th class="age-col" :style="personVar(-1)">
                      父母
                      <small>{{ parentYear }} 年生</small>
                    </th>
                    <th v-for="(child, i) in validChildren" :key="i" class="age-col" :style="personVar(i)">
                      {{ childLabel(i) }}
                      <small>{{ child.year }} 年生</small>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in rows"
                    :key="row.year"
                    :class="{ 'row-hit': row.milestoneCount > 0, 'row-hit-multi': row.milestoneCount > 1 }"
                  >
                    <td class="year-col">
                      {{ row.year }}
                      <span v-if="row.year === currentYear" class="today-badge">今年</span>
                    </td>
                    <td :style="personVar(-1)">
                      <span class="age" :class="{ pill: row.parent.milestone }">{{ row.parent.age }}</span>
                    </td>
                    <td v-for="(cell, i) in row.children" :key="i" :style="personVar(i)">
                      <span v-if="cell.birth" class="birth-badge">👶 出生</span>
                      <span v-else-if="cell.unborn" class="unborn">未出生</span>
                      <span v-else class="age" :class="{ pill: cell.milestone }">{{ cell.age }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="form-hint">
              行底加深的是逢 5 节点（5、10、15……岁）：谁到了节点，谁的年龄就变成对应颜色的徽标；同一行两人及以上逢 5 时整行再加深一档；👶 为出生年。父母与每位子女各固定一种颜色，与表头对应。
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

// 父母子女年龄对照：输入双方出生年份，逐年对照年龄并点亮逢 5 节点
const STORAGE_KEY = 'age-compare:form'
const MAX_CHILDREN = 6
const TABLE_END_AGE = 90

const PARENT_COLOR = '#2f6fed'
const CHILD_COLORS = ['#0f766e', '#b45309', '#7e57c2', '#d81b60', '#00838f', '#5d4037']
const ORDINALS = ['大', '二', '三', '四', '五', '六']

const currentYear = new Date().getFullYear()

function isValidYear(value) {
  return Number.isInteger(value) && value >= 1900 && value <= 2100
}

// 恢复上次输入；结构不对就忽略，回落到示例数据
function loadForm() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!data || !isValidYear(data.parentYear)) return null
    const children = (Array.isArray(data.children) ? data.children : [])
      .filter((year) => isValidYear(year))
      .map((year) => ({ year }))
    return children.length ? { parentYear: data.parentYear, children } : null
  } catch {
    return null
  }
}

const saved = loadForm()
const parentYear = ref(saved ? saved.parentYear : 1990)
const childYears = ref(saved ? saved.children : [{ year: 2025 }])

watch([parentYear, childYears], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      parentYear: parentYear.value,
      children: childYears.value.map((c) => c.year)
    }))
  } catch {
    // 隐私模式等写入失败时静默忽略，仅本次会话生效
  }
}, { deep: true })

function addChild() {
  if (childYears.value.length < MAX_CHILDREN) childYears.value.push({ year: '' })
}

function removeChild(index) {
  childYears.value.splice(index, 1)
}

// 只有一个子女时不带排行，多个时按出生先后叫老大、老二……
function childLabel(index) {
  if (childYears.value.length === 1) return '子女'
  return `老${ORDINALS[index] ?? index + 1}`
}

const formError = computed(() => {
  if (!isValidYear(parentYear.value)) return '请先填写有效的父母出生年份（1900–2100）'
  const filled = childYears.value.filter((c) => c.year !== '' && c.year !== null && c.year !== undefined)
  if (!filled.length) return '请至少填写一位子女的出生年份'
  if (filled.some((c) => !isValidYear(c.year))) return '子女出生年份需在 1900–2100 之间'
  if (filled.some((c) => c.year <= parentYear.value)) return '子女出生年份需晚于父母出生年份'
  return ''
})

const validChildren = computed(() =>
  childYears.value.filter((c) => isValidYear(c.year) && c.year > parentYear.value)
)

// 逐年对照：从最早的子女出生年起到父母 TABLE_END_AGE 岁，逢 5 岁记为节点
const rows = computed(() => {
  const parentY = parentYear.value
  const kids = validChildren.value.map((c) => c.year)
  if (!isValidYear(parentY) || !kids.length) return []
  const list = []
  for (let year = Math.min(...kids); year <= parentY + TABLE_END_AGE; year++) {
    const parent = { age: year - parentY, milestone: (year - parentY) > 0 && (year - parentY) % 5 === 0 }
    const children = kids.map((kidYear) => {
      const age = year - kidYear
      return {
        age,
        birth: age === 0,
        unborn: age < 0,
        milestone: age > 0 && age % 5 === 0
      }
    })
    const milestoneCount = (parent.milestone ? 1 : 0) + children.filter((c) => c.milestone).length
    list.push({ year, parent, children, milestoneCount })
  }
  return list
})

const birthGapLines = computed(() =>
  validChildren.value.map((c, i) => ({ label: childLabel(i), value: `${c.year - parentYear.value} 岁` }))
)

const todayLines = computed(() => {
  const lines = [{ label: '父母', value: `${currentYear - parentYear.value} 岁` }]
  validChildren.value.forEach((c, i) => {
    const age = currentYear - c.year
    lines.push({ label: childLabel(i), value: age >= 0 ? `${age} 岁` : `${c.year} 年出生` })
  })
  return lines
})

// 今天之后的第一个节点：逢 5 岁或子女出生，取最早的一年
const nextNode = computed(() => {
  for (const row of rows.value) {
    if (row.year < currentYear) continue
    const events = []
    if (row.parent.milestone) events.push(`父母满 ${row.parent.age} 岁`)
    row.children.forEach((cell, i) => {
      if (cell.birth) events.push(`${childLabel(i)}出生`)
      else if (cell.milestone) events.push(`${childLabel(i)}满 ${cell.age} 岁`)
    })
    if (events.length) return { year: row.year, events, parentAge: row.parent.age }
  }
  return null
})

// 父母与每位子女各固定一种颜色，表头与表格里的节点徽标共用
function personVar(index) {
  return { '--person': index < 0 ? PARENT_COLOR : CHILD_COLORS[index % CHILD_COLORS.length] }
}
</script>

<style scoped>
.age-page {
  padding-bottom: 40px;
  padding-top: 24px;
}

.age-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  gap: 18px;
  padding: 18px;
}

.age-panel h1 {
  font-size: clamp(1.7rem, 3.2vw, 2.3rem);
  margin: 6px 0 4px;
}

.age-subtitle {
  color: var(--muted);
  margin: 0;
}

.age-layout {
  display: grid;
  gap: 18px;
}

@media (min-width: 920px) {
  .age-layout {
    align-items: start;
    grid-template-columns: 290px minmax(0, 1fr);
  }

  .age-form {
    border-right: 1px solid var(--line);
    padding-right: 18px;
  }
}

.age-form {
  display: grid;
  gap: 12px;
}

.age-form label {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 650;
}

.child-row {
  align-items: end;
  display: flex;
  gap: 8px;
}

.child-row .field {
  flex: 1;
  min-width: 0;
}

.child-del {
  background: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  flex: 0 0 auto;
  height: 41px;
  width: 42px;
}

.child-del:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.form-error {
  color: var(--danger);
  font-size: 0.88rem;
  margin: 0;
}

.age-result {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.stat-cards {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.stat-card {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}

.stat-card h3 {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  margin: 0 0 8px;
}

.stat-lines {
  display: grid;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.stat-lines li {
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.stat-lines span {
  color: var(--muted);
  font-size: 0.9rem;
}

.stat-lines strong {
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.stat-next {
  display: grid;
  gap: 2px;
  margin: 0;
}

.stat-next strong {
  font-size: 1.15rem;
}

.stat-next small {
  color: var(--muted);
  font-size: 0.82rem;
}

.stat-empty {
  color: var(--muted);
  margin: 0;
}

.table-wrap {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  max-height: 62vh;
  overflow: auto;
}

.age-table {
  border-collapse: collapse;
  width: 100%;
}

.age-table th,
.age-table td {
  border-bottom: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
  padding: 6px 12px;
  text-align: center;
}

.age-table thead th {
  background: var(--surface);
  box-shadow: inset 0 -1px 0 var(--line);
  color: var(--muted);
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  white-space: nowrap;
  z-index: 1;
}

.age-table thead th.age-col {
  box-shadow: inset 0 -2px 0 var(--person);
  color: var(--person);
}

.age-table thead th small {
  display: block;
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.75;
}

.age-table .year-col {
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.age-table tbody tr:hover {
  background: var(--surface-soft);
}

.age-table tr.row-hit {
  background: rgba(47, 111, 237, 0.06);
}

.age-table tr.row-hit-multi {
  background: rgba(47, 111, 237, 0.15);
}

.today-badge {
  background: var(--primary);
  border-radius: var(--radius-pill);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  margin-left: 6px;
  padding: 1px 7px;
  vertical-align: middle;
}

.age {
  display: inline-block;
  min-width: 30px;
}

.age.pill {
  background: var(--person);
  border-radius: var(--radius-pill);
  color: #fff;
  font-weight: 700;
  min-width: 40px;
  padding: 2px 10px;
}

.birth-badge {
  font-size: 0.85rem;
  white-space: nowrap;
}

.unborn {
  color: var(--muted);
  font-size: 0.78rem;
  opacity: 0.75;
}
</style>
