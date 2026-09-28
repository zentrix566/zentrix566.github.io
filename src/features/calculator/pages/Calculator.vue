<template>
  <section class="section page-section calc-page">
    <div class="container">
      <div class="calc-panel">
        <header>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Calculator</p>
          <h1>实用计算器</h1>
          <p class="calc-subtitle">常用计算与换算合集，点击上方标签切换计算方式。</p>
        </header>

        <nav class="mode-tabs" aria-label="计算方式">
          <button
            v-for="m in modes"
            :key="m.id"
            type="button"
            class="mode-tab"
            :class="{ active: mode === m.id }"
            @click="mode = m.id"
          >
            <span class="tab-emoji">{{ m.emoji }}</span>{{ m.name }}
          </button>
        </nav>

        <!-- 基础计算：加减乘除 + 可复用的历史记录 -->
        <div v-if="mode === 'basic'" class="mode-body">
          <div class="basic-layout">
            <div class="basic-calc">
              <div class="calc-display" :class="{ 'has-error': error }">
                <div class="display-sub">
                  <template v-if="justEvaluated">{{ submittedExpr }} =</template>
                  <template v-else-if="basicPreview !== null">= {{ formatNumber(basicPreview) }}</template>
                  <template v-else>&nbsp;</template>
                </div>
                <div class="display-main" :class="{ compact: displayText.length > 16 }">{{ displayText }}</div>
              </div>
              <p v-if="error" class="calc-error">{{ error }}</p>

              <div class="keypad">
                <button type="button" class="key fn" @click="clearAll">C</button>
                <button type="button" class="key fn" @click="inputParen('(')">(</button>
                <button type="button" class="key fn" @click="inputParen(')')">)</button>
                <button type="button" class="key fn" @click="backspace">⌫</button>

                <button type="button" class="key" @click="inputDigit('7')">7</button>
                <button type="button" class="key" @click="inputDigit('8')">8</button>
                <button type="button" class="key" @click="inputDigit('9')">9</button>
                <button type="button" class="key op" @click="inputOp('÷')">÷</button>

                <button type="button" class="key" @click="inputDigit('4')">4</button>
                <button type="button" class="key" @click="inputDigit('5')">5</button>
                <button type="button" class="key" @click="inputDigit('6')">6</button>
                <button type="button" class="key op" @click="inputOp('×')">×</button>

                <button type="button" class="key" @click="inputDigit('1')">1</button>
                <button type="button" class="key" @click="inputDigit('2')">2</button>
                <button type="button" class="key" @click="inputDigit('3')">3</button>
                <button type="button" class="key op" @click="inputOp('-')">−</button>

                <button type="button" class="key fn" @click="negate">±</button>
                <button type="button" class="key" @click="inputDigit('0')">0</button>
                <button type="button" class="key" @click="inputDot">.</button>
                <button type="button" class="key op" @click="inputOp('+')">+</button>

                <button type="button" class="key fn" @click="inputPercent">%</button>
                <button type="button" class="key equals wide" @click="evaluateNow">=</button>
              </div>

              <p class="form-hint">
                支持键盘输入：数字与 + - * / ( ) %，Enter 求值，Backspace 退格，Esc 清空。点击右侧历史里的结果可带入当前算式，点击灰色算式可载入重新修改。
              </p>
            </div>

            <aside class="history-panel">
              <div class="history-head">
                <strong>历史<span v-if="history.length">（{{ history.length }}）</span></strong>
                <button type="button" class="history-clear" :disabled="!history.length" @click="clearHistory">清空</button>
              </div>
              <p v-if="!history.length" class="history-empty">暂无历史。每次按「=」后自动记录，结果可反复带入运算。</p>
              <ul v-else class="history-list">
                <li v-for="item in history" :key="item.ts" class="history-item">
                  <div class="history-row">
                    <button
                      type="button"
                      class="history-expr"
                      :title="`载入算式：${item.expr}`"
                      @click="loadHistoryExpr(item)"
                    >{{ item.expr }}</button>
                    <button type="button" class="history-del" title="删除该条" @click="removeHistory(item)">✕</button>
                  </div>
                  <button
                    type="button"
                    class="history-value"
                    title="把结果带入当前算式"
                    @click="insertHistoryValue(item)"
                  >{{ formatNumber(Number(item.value)) }}</button>
                </li>
              </ul>
            </aside>
          </div>
        </div>

        <!-- 字节换算：输入一个数值并选择单位，按 1024 进制换算成其余单位 -->
        <div v-if="mode === 'bytes'" class="mode-body">
          <form class="calc-form" @submit.prevent>
            <label class="field">
              数值
              <input v-model="byteInput" type="number" min="0" step="any" inputmode="decimal" placeholder="例如 1073741824">
            </label>
            <label class="field">
              输入单位
              <select v-model="byteUnit">
                <option v-for="u in byteUnits" :key="u.id" :value="u.id">{{ u.name }}（{{ u.id }}）</option>
              </select>
            </label>
          </form>

          <div class="byte-results">
            <article
              v-for="u in byteUnits"
              :key="u.id"
              class="byte-card"
              :class="{ source: u.id === byteUnit }"
            >
              <div class="byte-unit">
                {{ u.name }} {{ u.id }}
                <small v-if="u.id === byteUnit">输入</small>
              </div>
              <strong>{{ u.id === byteUnit ? formatNumber(byteResults[u.id]) : formatSigFigs(byteResults[u.id]) }}</strong>
            </article>
          </div>

          <p class="form-hint">
            按 1024 进制换算：字节 → KB 除以 1024，KB → MB 再除以 1024，也就是「字节换成兆 = 连除两次 1024」，往上 GB、TB 依此类推。换算结果保留 2 位有效数字，输入单位所在卡片按原值显示。
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatNumber, formatSigFigs } from '../utils/format.js'
import { evaluateExpression } from '../utils/evaluate.js'

// 计算方式清单：新增一种计算时在数组里加一项，并在模板里补一个对应的面板
const modes = [
  { id: 'basic', name: '基础计算', emoji: '🔢' },
  { id: 'bytes', name: '字节换算', emoji: '💾' }
]

const mode = ref('basic')

// ==================== 基础计算 ====================

// 历史记录持久化到 localStorage，上限 100 条，最新的在前
const HISTORY_KEY = 'calculator:history'
const HISTORY_LIMIT = 100

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.slice(0, HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

const history = ref(loadHistory())
watch(history, (list) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式等写入失败时静默忽略，历史仅保留在当前会话
  }
})

// expr 是正在拼接的算式字符串（按钮显示符号 × ÷ 直接入库）；
// 按 = 后 expr 变为结果的原始字符串，justEvaluated 用来区分「展示结果」与「编辑算式」两种状态
const expr = ref('')
const submittedExpr = ref('')
const justEvaluated = ref(false)
const error = ref('')

const displayText = computed(() => {
  if (justEvaluated.value) return formatNumber(Number(expr.value))
  return expr.value || '0'
})

// 输入过程中实时预览结果；单个数字或算式尚不完整时不显示
const basicPreview = computed(() => {
  if (justEvaluated.value || !expr.value) return null
  const hasOperator = /[+×÷]/.test(expr.value)
    || expr.value.indexOf('-', 1) !== -1
    || expr.value.includes('%')
    || expr.value.includes(')')
  if (!hasOperator) return null
  try {
    return evaluateExpression(expr.value)
  } catch {
    return null
  }
})

const TRAILING_NUMBER = /(\d+\.?\d*|\.\d+)$/

function inputDigit(digit) {
  error.value = ''
  if (justEvaluated.value) {
    expr.value = digit
    justEvaluated.value = false
    return
  }
  expr.value += digit
}

function inputDot() {
  error.value = ''
  if (justEvaluated.value) {
    expr.value = '0.'
    justEvaluated.value = false
    return
  }
  const match = expr.value.match(TRAILING_NUMBER)
  if (match && match[0].includes('.')) return
  const last = expr.value.slice(-1)
  expr.value += expr.value === '' || '+-×÷('.includes(last) ? '0.' : '.'
}

function inputOp(op) {
  error.value = ''
  if (justEvaluated.value) {
    justEvaluated.value = false
    expr.value += op
    return
  }
  if (expr.value === '') {
    if (op === '-') expr.value = '-'
    return
  }
  const last = expr.value.slice(-1)
  if (last === '-' && (expr.value.length === 1 || '+-×÷('.includes(expr.value.slice(-2, -1)))) {
    // 结尾是一元负号：再按运算符时先去掉负号，再走替换逻辑
    expr.value = expr.value.slice(0, -1)
  }
  const prev = expr.value.slice(-1)
  if ('+-×÷'.includes(prev)) {
    // 连续按运算符：「-」追加成一元负号（如 5×-3），其余替换前一个运算符
    if (op === '-' && prev !== '-') {
      expr.value += op
    } else {
      expr.value = expr.value.slice(0, -1) + op
    }
    return
  }
  if (prev === '(' && op !== '-') return
  expr.value += op
}

function inputParen(p) {
  error.value = ''
  if (justEvaluated.value) {
    if (p !== '(') return
    expr.value = '('
    justEvaluated.value = false
    return
  }
  if (p === ')') {
    const opens = (expr.value.match(/\(/g) || []).length
    const closes = (expr.value.match(/\)/g) || []).length
    const last = expr.value.slice(-1)
    if (opens <= closes || expr.value === '' || '+-×÷('.includes(last)) return
  }
  expr.value += p
}

function inputPercent() {
  error.value = ''
  if (justEvaluated.value) {
    justEvaluated.value = false
    expr.value += '%'
    return
  }
  const last = expr.value.slice(-1)
  if (expr.value === '' || '+-×÷('.includes(last)) return
  expr.value += '%'
}

// 正负切换：翻转当前操作数的一元负号（如 12+3 ↔ 12+-3）
function negate() {
  error.value = ''
  if (justEvaluated.value) justEvaluated.value = false
  if (expr.value === '') {
    expr.value = '-'
    return
  }
  const match = expr.value.match(TRAILING_NUMBER)
  if (!match) {
    if ('+-×÷('.includes(expr.value.slice(-1))) expr.value += '-'
    return
  }
  const start = match.index
  const before = start > 0 ? expr.value[start - 1] : ''
  if (before === '-' && (start === 1 || '+-×÷('.includes(expr.value[start - 2]))) {
    expr.value = expr.value.slice(0, start - 1) + expr.value.slice(start)
  } else {
    expr.value = expr.value.slice(0, start) + '-' + expr.value.slice(start)
  }
}

function backspace() {
  error.value = ''
  if (justEvaluated.value) return
  expr.value = expr.value.slice(0, -1)
}

function clearAll() {
  expr.value = ''
  submittedExpr.value = ''
  justEvaluated.value = false
  error.value = ''
}

function evaluateNow() {
  if (!expr.value) return
  try {
    const value = evaluateExpression(expr.value)
    const raw = String(value)
    submittedExpr.value = expr.value
    expr.value = raw
    justEvaluated.value = true
    error.value = ''
    history.value = [{ expr: submittedExpr.value, value: raw, ts: Date.now() }, ...history.value]
      .slice(0, HISTORY_LIMIT)
  } catch (e) {
    error.value = e.message || '算式格式有误'
  }
}

// 点击历史结果：把该值作为当前操作数——替换正在输入的末尾数字，或接在运算符后面
function insertHistoryValue(item) {
  error.value = ''
  if (justEvaluated.value || expr.value === '') {
    expr.value = item.value
    justEvaluated.value = false
    return
  }
  const last = expr.value.slice(-1)
  const match = expr.value.match(TRAILING_NUMBER)
  if ('+-×÷('.includes(last)) {
    expr.value += item.value
  } else if (match) {
    expr.value = expr.value.slice(0, match.index) + item.value
  } else {
    // 结尾是 ) 或 %，隐式相乘接上
    expr.value += '×' + item.value
  }
}

// 点击历史算式：整条载回输入区继续修改
function loadHistoryExpr(item) {
  expr.value = item.expr
  justEvaluated.value = false
  error.value = ''
}

function removeHistory(item) {
  history.value = history.value.filter((h) => h.ts !== item.ts)
}

function clearHistory() {
  history.value = []
}

// 键盘输入：仅在基础计算模式下生效，聚焦输入框时不拦截
function onKeydown(e) {
  if (mode.value !== 'basic') return
  const tag = e.target && e.target.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const key = e.key
  if (/^[0-9]$/.test(key)) inputDigit(key)
  else if (key === '.') inputDot()
  else if (key === '+') inputOp('+')
  else if (key === '-') inputOp('-')
  else if (key === '*') inputOp('×')
  else if (key === '/') {
    e.preventDefault()
    inputOp('÷')
  } else if (key === '(' || key === ')' || key === '%') key === '%' ? inputPercent() : inputParen(key)
  else if (key === 'Enter' || key === '=') {
    e.preventDefault()
    evaluateNow()
  } else if (key === 'Backspace') {
    e.preventDefault()
    backspace()
  } else if (key === 'Escape') clearAll()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// ==================== 字节换算 ====================

// 1024 进制存储单位，相邻单位相差 1024 倍
const byteUnits = [
  { id: 'B', name: '字节' },
  { id: 'KB', name: '千字节' },
  { id: 'MB', name: '兆字节' },
  { id: 'GB', name: '吉字节' },
  { id: 'TB', name: '太字节' }
]

const byteInput = ref('')
const byteUnit = ref('B')

// 输入值折算成字节数；输入为空或非法时返回 null
const byteBytes = computed(() => {
  const raw = byteInput.value
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value)) return null
  const index = byteUnits.findIndex((u) => u.id === byteUnit.value)
  return value * 1024 ** index
})

const byteResults = computed(() => {
  const results = {}
  byteUnits.forEach((u, index) => {
    results[u.id] = byteBytes.value === null ? null : byteBytes.value / 1024 ** index
  })
  return results
})
</script>

<style scoped>
.calc-page {
  padding-bottom: 28px;
  padding-top: 24px;
}

.calc-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  gap: 16px;
  padding: 18px;
}

.calc-panel h1 {
  font-size: clamp(1.7rem, 3.2vw, 2.3rem);
  margin: 6px 0 4px;
}

.calc-subtitle {
  color: var(--muted);
  margin: 0;
}

.mode-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-tab {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  gap: 6px;
  padding: 8px 16px;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mode-tab:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.mode-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.tab-emoji {
  font-size: 1rem;
}

.mode-body {
  display: grid;
  gap: 14px;
}

/* ---- 基础计算 ---- */

.basic-layout {
  display: grid;
  gap: 14px;
}

@media (min-width: 860px) {
  .basic-layout {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}

.basic-calc {
  display: grid;
  gap: 12px;
}

.calc-display {
  align-content: end;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 14px 16px;
}

.calc-display.has-error {
  border-color: var(--danger);
}

.display-sub {
  color: var(--muted);
  font-size: 0.9rem;
  min-height: 1.25em;
  overflow-wrap: anywhere;
  text-align: right;
}

.display-main {
  font-size: 1.7rem;
  font-weight: 800;
  overflow-wrap: anywhere;
  text-align: right;
}

.display-main.compact {
  font-size: 1.1rem;
}

.calc-error {
  color: var(--danger);
  font-size: 0.88rem;
  margin: -6px 0 0;
  text-align: right;
}

.keypad {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, 1fr);
}

.key {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 700;
  padding: 12px 0;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.key:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.key:active {
  transform: translateY(1px);
}

.key.fn {
  background: var(--surface-soft);
}

.key.op {
  color: var(--primary);
}

.key.equals {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.key.equals:hover {
  background: var(--primary-dark);
  color: #fff;
}

.key.wide {
  grid-column: span 3;
}

.basic-calc .form-hint {
  margin: 0;
}

/* ---- 历史 ---- */

.history-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  max-height: 460px;
}

.history-head {
  align-items: center;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
}

.history-clear {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 4px;
}

.history-clear:hover:not(:disabled) {
  color: var(--danger);
}

.history-clear:disabled {
  cursor: default;
  opacity: 0.5;
}

.history-empty {
  color: var(--muted);
  font-size: 0.88rem;
  padding: 16px 12px;
}

.history-list {
  list-style: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
}

.history-item {
  border-bottom: 1px dashed var(--line);
  display: grid;
  gap: 2px;
  padding: 8px 12px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-row {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.history-expr {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.82rem;
  overflow: hidden;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-expr:hover {
  color: var(--primary);
}

.history-del {
  background: none;
  border: none;
  color: var(--line);
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 0.8rem;
  padding: 0 2px;
}

.history-item:hover .history-del {
  color: var(--muted);
}

.history-del:hover {
  color: var(--danger) !important;
}

.history-value {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 800;
  overflow-wrap: anywhere;
  padding: 0;
  text-align: right;
}

.history-value:hover {
  color: var(--primary);
}

/* ---- 字节换算 ---- */

.calc-form {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

.calc-form label {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 650;
}

.byte-results {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.byte-card {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
  padding: 12px 14px;
}

.byte-card.source {
  background: var(--primary-soft);
  border-color: var(--primary);
}

.byte-unit {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.byte-unit small {
  background: var(--primary);
  border-radius: var(--radius-pill);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  margin-left: 4px;
  padding: 1px 7px;
}

.byte-card strong {
  display: block;
  font-size: 1.15rem;
  margin-top: 5px;
}

@media (max-width: 560px) {
  .calc-form {
    grid-template-columns: 1fr;
  }
}
</style>
