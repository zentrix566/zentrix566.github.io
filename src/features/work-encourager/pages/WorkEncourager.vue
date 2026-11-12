<template>
  <section class="section page-section we-page">
    <div class="container">
      <div class="we-panel">
        <header>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Work Encourager</p>
          <h1>上班鼓励器</h1>
          <p class="we-subtitle">输入上班、下班时间与月工资，看着今天的钱一分一秒到账。</p>
        </header>

        <div class="we-layout">
          <form class="we-form" @submit.prevent>
            <label class="field">
              上班时间
              <input v-model="startText" type="time" step="60">
            </label>

            <label class="field">
              下班时间
              <input v-model="endText" type="time" step="60">
            </label>

            <label class="field">
              月工资（元）
              <input
                v-model.number="salary"
                type="number"
                inputmode="decimal"
                min="1"
                step="100"
                placeholder="如 15000"
              >
            </label>

            <label class="field">
              月计薪天数
              <input
                v-model.number="payDays"
                type="number"
                inputmode="decimal"
                min="1"
                max="31"
                step="0.25"
              >
            </label>

            <p v-if="formError" class="form-error">{{ formError }}</p>
            <p v-else class="form-hint">
              日工资 = 月工资 ÷ 月计薪天数（法定口径 21.75 天），再按秒摊进每个班次；下班时间早于上班时间按跨夜班次计算。配置自动保存在本地浏览器。
            </p>
          </form>

          <div v-if="!formError" class="we-result">
            <div class="we-status">
              <span class="we-badge" :class="`is-${phase}`">{{ statusLabel }}</span>
              <p class="we-countdown">{{ countdownText }}</p>
            </div>

            <div class="we-money-card">
              <p class="we-money-label">今日已赚</p>
              <p class="we-money">¥{{ earnedText }}</p>
              <p class="we-rates">
                每秒 ¥{{ rates.perSec }} · 每分钟 ¥{{ rates.perMin }} · 每小时 ¥{{ rates.perHour }}
              </p>
            </div>

            <div class="we-progress">
              <div class="we-progress-head">
                <span>今日工作进度</span>
                <strong>{{ progressText }}</strong>
              </div>
              <div class="we-bar">
                <div class="we-bar-fill" :style="{ width: progressText }"></div>
              </div>
              <p class="we-progress-sub">已工作 {{ workedText }} / 全程 {{ totalText }}</p>
            </div>

            <p class="we-cheer">💡 {{ cheer }}</p>

            <div class="we-month">
              <div class="we-month-row">
                <span>本月已入账（估算）</span>
                <strong>¥{{ fmtMoney(monthEarned, 2) }}</strong>
              </div>
              <div class="we-month-row">
                <span>{{ monthRestLabel }}</span>
                <strong>¥{{ fmtMoney(monthRemainEarn, 2) }}</strong>
              </div>
              <p class="we-month-hint">
                本月估算按周一至周五逐日累加日工资，未剔除法定节假日与调休；「今日已赚」按当前班次的实际秒数计算。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'

// 上班鼓励器：按秒累计今日已赚，附下班倒计时、进度与本月估算
const STORAGE_KEY = 'work-encourager:form'
const DEFAULT_PAY_DAYS = 21.75

const startText = ref('09:00')
const endText = ref('18:00')
const salary = ref(10000)
const payDays = ref(DEFAULT_PAY_DAYS)

// 恢复上次输入；结构不对就忽略，回落到默认值
function loadForm() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!data) return
    if (typeof data.startText === 'string') startText.value = data.startText
    if (typeof data.endText === 'string') endText.value = data.endText
    if (Number.isFinite(data.salary) && data.salary > 0) salary.value = data.salary
    if (Number.isFinite(data.payDays) && data.payDays > 0) payDays.value = data.payDays
  } catch {
    // 隐私模式等读取失败时使用默认值
  }
}
loadForm()

watch([startText, endText, salary, payDays], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startText: startText.value,
      endText: endText.value,
      salary: salary.value,
      payDays: payDays.value
    }))
  } catch {
    // 写入失败只影响下次记忆，本次会话照常工作
  }
})

// 每 100ms 刷新一次当前时间，让金额跳得够快；标签页从后台切回时立即校准
const now = ref(new Date())
let timer = 0
function syncNow() {
  now.value = new Date()
}
onMounted(() => {
  timer = window.setInterval(syncNow, 100)
  document.addEventListener('visibilitychange', syncNow)
})
onBeforeUnmount(() => {
  window.clearInterval(timer)
  document.removeEventListener('visibilitychange', syncNow)
  document.title = BASE_TITLE
})

function parseMinutes(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text || '')
  if (!m) return null
  const minutes = Number(m[1]) * 60 + Number(m[2])
  return minutes >= 0 && minutes < 1440 ? minutes : null
}

const formError = computed(() => {
  if (parseMinutes(startText.value) === null || parseMinutes(endText.value) === null) {
    return '请先选择上班与下班时间'
  }
  if (!Number.isFinite(salary.value) || salary.value <= 0) return '请填写大于 0 的月工资'
  if (!Number.isFinite(payDays.value) || payDays.value <= 0) return '月计薪天数需大于 0'
  if (startText.value === endText.value) return '上班与下班时间不能相同'
  return ''
})

const workSeconds = computed(() => {
  const start = parseMinutes(startText.value)
  const end = parseMinutes(endText.value)
  if (start === null || end === null || start === end) return 0
  return ((end - start + 1440) % 1440) * 60
})

const dailyWage = computed(() => (salary.value / payDays.value) || 0)
const perSecond = computed(() => (workSeconds.value ? dailyWage.value / workSeconds.value : 0))

// 当前班次窗口：以今天为锚点，跨夜班次另查昨天开始的窗口
function shiftWindow(baseDay) {
  const start = parseMinutes(startText.value)
  const begin = new Date(baseDay)
  begin.setHours(Math.floor(start / 60), start % 60, 0, 0)
  return { begin, end: new Date(begin.getTime() + workSeconds.value * 1000) }
}

const schedule = computed(() => {
  if (formError.value || !workSeconds.value) return null
  const base = now.value
  const todayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const current = shiftWindow(todayStart)
  const previous = shiftWindow(new Date(todayStart.getTime() - 24 * 3600 * 1000))
  const t = base.getTime()
  if (t >= current.begin.getTime()) {
    if (t < current.end.getTime()) return { phase: 'working', window: current }
    return { phase: 'done', window: current }
  }
  if (t >= previous.begin.getTime() && t < previous.end.getTime()) {
    return { phase: 'working', window: previous }
  }
  return { phase: 'before', window: current }
})

const phase = computed(() => schedule.value ? schedule.value.phase : 'before')

// 已赚秒数：在窗口内取经过的秒数，收工后封顶为全天
const earnedSeconds = computed(() => {
  if (!schedule.value) return 0
  const t = now.value.getTime()
  const begin = schedule.value.window.begin.getTime()
  const end = schedule.value.window.end.getTime()
  return Math.min(Math.max(t - begin, 0), end - begin) / 1000
})

const earned = computed(() => earnedSeconds.value * perSecond.value)

const statusLabel = computed(() => ({
  before: '未上班',
  working: '上班中',
  done: '已下班'
}[phase.value]))

function fmtCountdown(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${h} 时 ${pad(m)} 分 ${pad(s)} 秒`
}

const countdownText = computed(() => {
  if (!schedule.value) return ''
  const t = now.value.getTime()
  if (phase.value === 'working') return `距离下班还有 ${fmtCountdown(schedule.value.window.end.getTime() - t)}`
  if (phase.value === 'before') return `距离上班还有 ${fmtCountdown(schedule.value.window.begin.getTime() - t)}`
  // 收工后常驻倒计时：距明天的开工时间
  const nextBegin = schedule.value.window.begin.getTime() + 24 * 3600 * 1000
  return `今天已收工，距离明天 ${startText.value} 开工还有 ${fmtCountdown(nextBegin - t)}`
})

// 上班中把倒计时同步到浏览器标签页标题，切到别的标签页也能瞟一眼
const BASE_TITLE = '上班鼓励器'
const titleText = computed(() => {
  if (phase.value !== 'working' || !schedule.value) return BASE_TITLE
  const remain = Math.max(0, (schedule.value.window.end.getTime() - now.value.getTime()) / 1000)
  return `⏰ 距下班 ${fmtDuration(remain)} · ${BASE_TITLE}`
})
watchEffect(() => {
  document.title = titleText.value
})

// 金额格式：千分位 + 固定位数小数
function fmtMoney(value, digits = 2) {
  const parts = Math.max(0, value).toFixed(digits).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

const earnedText = computed(() => fmtMoney(earned.value, 4))
const rates = computed(() => ({
  perSec: fmtMoney(perSecond.value, 4),
  perMin: fmtMoney(perSecond.value * 60, 4),
  perHour: fmtMoney(perSecond.value * 3600, 2)
}))

function fmtDuration(seconds, withSeconds = true) {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const pad = (n) => String(n).padStart(2, '0')
  const m = Math.floor((total % 3600) / 60)
  return withSeconds
    ? `${h}:${pad(m)}:${pad(total % 60)}`
    : `${h}:${pad(m)}`
}

const progressText = computed(() => {
  const ratio = workSeconds.value ? earnedSeconds.value / workSeconds.value : 0
  return `${(ratio * 100).toFixed(1)}%`
})
const workedText = computed(() => fmtDuration(earnedSeconds.value))
const totalText = computed(() => fmtDuration(workSeconds.value, false))

// 打气文案：固定语句轮播——「再上 X 分钟/小时，就可以买 Y」
const CHEER_ITEMS = [
  { name: '肥宅快乐水', unit: '瓶', price: 3.5 },
  { name: '豆浆油条套餐', unit: '份', price: 6 },
  { name: '煎饼果子', unit: '份', price: 8 },
  { name: '瑞幸咖啡', unit: '杯', price: 9.9 },
  { name: '奶茶', unit: '杯', price: 15 },
  { name: '炸鸡', unit: '份', price: 25 },
  { name: '汉堡套餐', unit: '份', price: 35 },
  { name: '电影票', unit: '张', price: 45 },
  { name: '盲盒', unit: '个', price: 59 },
  { name: '外卖大餐', unit: '顿', price: 88 },
  { name: '蓝牙耳机', unit: '副', price: 149 },
  { name: '机械键盘', unit: '把', price: 199 },
  { name: 'Steam 大作', unit: '款', price: 268 },
  { name: '球鞋', unit: '双', price: 399 },
  { name: '显卡', unit: '块', price: 799 },
  { name: '演唱会门票', unit: '张', price: 1280 },
  { name: '自行车', unit: '辆', price: 1599 },
  { name: 'Switch 主机', unit: '台', price: 2099 },
  { name: '手机', unit: '部', price: 5999 },
  { name: 'MacBook', unit: '台', price: 9999 }
]

// 小时 + 分钟文本，分钟进位到小时时自动归零；不足 1 小时只显示分钟
function fmtHourMinute(totalMinutes) {
  let h = Math.floor(totalMinutes / 60)
  let m = Math.round(totalMinutes % 60)
  if (m === 60) {
    h += 1
    m = 0
  }
  if (!h) return `${m} 分`
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

// 把「需要上的班时长」写成人类可读文本：秒 / 分钟 / 小时；超过一个工作日换算成「X 天 Y 小时」
function fmtWait(minutes, workMinutes) {
  if (minutes >= workMinutes) {
    const days = Math.floor(minutes / workMinutes)
    const rest = minutes % workMinutes
    return rest >= 1 ? `${days} 天 ${fmtHourMinute(rest)}` : `${days} 天`
  }
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} 秒`
  if (minutes < 60) return `${Math.round(minutes)} 分钟`
  return fmtHourMinute(minutes)
}

// 物品标价：最多两位小数，去掉无意义的末尾 0（3.5 → 3.5，1280 → 1,280）
function fmtPrice(value) {
  const [int, frac] = value.toFixed(2).replace(/\.?0+$/, '').split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

// 中文名称直接连量词，英文名称（Steam 大作、MacBook 等）补一个空格
function itemLabel(it) {
  const gap = /^[A-Za-z0-9]/.test(it.name) ? ' ' : ''
  return `一${it.unit}${gap}${it.name}`
}

// 上班中轮播的固定语句：每件物品一条（标注价格），按时长从小到大
function buildCheerLines(perSec, workMinutes) {
  if (!perSec || !workMinutes) return []
  const entries = CHEER_ITEMS.map((it) => ({
    minutes: it.price / perSec / 60,
    label: itemLabel(it),
    price: it.price
  }))
  entries.sort((a, b) => a.minutes - b.minutes)
  return entries.map(({ minutes, label, price }) =>
    `再上 ${fmtWait(minutes, workMinutes)}，就可以买${label}（¥${fmtPrice(price)}）。`
  )
}

// 每 6 秒轮换一条；语句只依赖时薪配置，轮播期间内容保持固定
const cheer = computed(() => {
  if (phase.value === 'before') {
    return `还有 ${countdownText.value.replace('距离上班还有 ', '')} 开工，先把咖啡续上，坐等开始赚钱。`
  }
  if (phase.value === 'done') {
    return `今天 ¥${fmtMoney(dailyWage.value, 2)} 已全额到账，收工快乐，明天 ${startText.value} 继续。`
  }
  const lines = buildCheerLines(perSecond.value, workSeconds.value / 60)
  return lines[Math.floor(now.value.getTime() / 6000) % lines.length]
})

// 本月估算：1 号数到昨天，周一至周五各记一份日工资，再加今天已赚
const monthEarned = computed(() => {
  if (formError.value) return 0
  const d = now.value
  let weekdays = 0
  for (let day = 1; day < d.getDate(); day++) {
    const dow = new Date(d.getFullYear(), d.getMonth(), day).getDay()
    if (dow >= 1 && dow <= 5) weekdays++
  }
  return weekdays * dailyWage.value + earned.value
})

const monthRestLabel = computed(() => {
  if (formError.value) return '本月剩余'
  const d = now.value
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  let rest = 0
  for (let day = d.getDate() + 1; day <= lastDay; day++) {
    const dow = new Date(d.getFullYear(), d.getMonth(), day).getDay()
    if (dow >= 1 && dow <= 5) rest++
  }
  return rest ? `本月还剩 ${rest} 个工作日，预计再赚` : '今天就是本月最后一个工作日，预计再赚'
})

const monthRemainEarn = computed(() => {
  if (formError.value) return 0
  const d = now.value
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  let rest = 0
  for (let day = d.getDate() + 1; day <= lastDay; day++) {
    const dow = new Date(d.getFullYear(), d.getMonth(), day).getDay()
    if (dow >= 1 && dow <= 5) rest++
  }
  return rest * dailyWage.value
})
</script>

<style scoped>
.we-page {
  padding-bottom: 40px;
  padding-top: 24px;
}

.we-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  gap: 18px;
  padding: 18px;
}

.we-panel h1 {
  font-size: clamp(1.7rem, 3.2vw, 2.3rem);
  margin: 6px 0 4px;
}

.we-subtitle {
  color: var(--muted);
  margin: 0;
}

.we-layout {
  display: grid;
  gap: 18px;
}

@media (min-width: 920px) {
  .we-layout {
    align-items: start;
    grid-template-columns: 290px minmax(0, 1fr);
  }

  .we-form {
    border-right: 1px solid var(--line);
    padding-right: 18px;
  }
}

.we-form {
  display: grid;
  gap: 12px;
}

.we-form label {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 650;
}

.form-error {
  color: var(--danger);
  font-size: 0.88rem;
  margin: 0;
}

.we-result {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.we-status {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.we-badge {
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 3px 12px;
}

.we-badge.is-working {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.4);
  color: #0f766e;
}

.we-badge.is-done {
  background: rgba(180, 83, 9, 0.1);
  border-color: rgba(180, 83, 9, 0.4);
  color: #b45309;
}

.we-countdown {
  color: var(--primary-dark);
  font-size: 1.3rem;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  margin: 0;
}

.we-money-card {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 18px 16px 14px;
  text-align: center;
}

.we-money-label {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
}

.we-money {
  font-size: clamp(2.2rem, 6vw, 3.2rem);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
}

.we-rates {
  color: var(--muted);
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  margin: 8px 0 0;
}

.we-progress {
  display: grid;
  gap: 6px;
}

.we-progress-head {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.we-progress-head span {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.we-progress-head strong {
  font-variant-numeric: tabular-nums;
}

.we-bar {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  height: 12px;
  overflow: hidden;
}

.we-bar-fill {
  background: #0f766e;
  border-radius: var(--radius-pill);
  height: 100%;
  min-width: 0;
  transition: width 0.6s linear;
}

.we-progress-sub {
  color: var(--muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  margin: 0;
}

.we-cheer {
  background: rgba(47, 111, 237, 0.06);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-variant-numeric: tabular-nums;
  margin: 0;
  padding: 10px 14px;
}

.we-month {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: 6px;
  padding: 12px 14px;
}

.we-month-row {
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.we-month-row span {
  color: var(--muted);
  font-size: 0.9rem;
}

.we-month-row strong {
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.we-month-hint {
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
  margin: 2px 0 0;
  padding-top: 8px;
}
</style>
