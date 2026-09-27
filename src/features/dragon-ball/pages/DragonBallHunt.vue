<template>
  <section class="section page-section db-page">
    <div class="container">
      <header class="db-header">
        <div>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Dragon Ball Radar</p>
          <h1>🐉 找寻七龙珠</h1>
          <p class="db-sub">
            打开龙珠雷达扫描原野，读数越小离龙珠越近。在体力耗尽前挖出全部七颗，召唤神龙！
          </p>
        </div>
        <div class="db-actions">
          <button class="btn ghost" @click="toggleMute">{{ muted ? '🔇 音效关' : '🔊 音效开' }}</button>
          <button class="btn ghost" @click="restart">↻ 重新开始</button>
        </div>
      </header>

      <div class="db-stats card">
        <div class="stat"><span>轮数</span><strong>第 {{ round }} 轮</strong></div>
        <div class="stat"><span>体力</span><strong :class="{ danger: energy <= 5 }">{{ energy }}</strong></div>
        <div class="stat"><span>已收集</span><strong>{{ foundCount }} / 7</strong></div>
        <div class="stat"><span>分数</span><strong>{{ score }}</strong></div>
        <div class="stat"><span>最高分</span><strong>{{ best }}</strong></div>
      </div>

      <div class="db-tray card" aria-label="龙珠收集栏">
        <div v-for="n in 7" :key="n" class="slot" :class="{ filled: starFound(n) }">
          <span v-if="starFound(n)" class="mini-ball"><i v-for="s in n" :key="s">★</i></span>
          <span v-else>{{ n }}★</span>
        </div>
      </div>

      <div class="db-field card">
        <div class="db-grid" :style="{ '--cols': gridW }">
          <button
            v-for="(cell, i) in grid"
            :key="i"
            class="cell"
            :class="[cell.terrain, { dug: cell.scanned, ball: cell.hasBall }]"
            :disabled="cell.scanned || status !== 'playing'"
            :aria-label="`格子 ${i + 1}`"
            @click="scan(i)"
          >
            <span v-if="cell.hasBall" class="ball-sprite"><i v-for="s in cell.stars" :key="s">★</i></span>
            <template v-else-if="cell.dist !== null">
              <b :class="cell.heatCls">{{ cell.dist }}</b>
              <em>{{ cell.heat }}</em>
            </template>
            <span v-else class="deco">{{ cell.deco }}</span>
          </button>
        </div>
      </div>

      <p class="db-help">
        读数 = 该格与最近一颗<b>未找到</b>龙珠的曼哈顿距离（上下左右步数）：
        <span class="h1">1-2 灼热</span> · <span class="h2">3-4 炎热</span> ·
        <span class="h3">5-7 温热</span> · <span class="h4">8+ 冰凉</span>。
        每次扫描消耗 1 体力；挖到龙珠免费并回复 6 体力、+100 分。集齐七颗召唤神龙，
        剩余体力 ×10 计入分数。读数是扫描那一刻的快照，挖走一颗后旧读数可能变化，要重新推算哦。
      </p>

      <div v-if="status === 'shenron'" class="overlay">
        <div class="shenron-box">
          <div class="shenron-dragon">🐉</div>
          <h2>出来吧，神龙！</h2>
          <p class="shenron-line">
            第 {{ round }} 轮完成！剩余体力 {{ lastBonus.energy }} ×10 = <b>+{{ lastBonus.gain }}</b> 分
          </p>
          <p class="shenron-lead">神龙：「说吧，你的愿望是什么？」</p>
          <div class="wish-list">
            <button v-for="w in wishList" :key="w.key" class="wish" @click="chooseWish(w)">
              <span class="wish-icon">{{ w.icon }}</span>
              <strong>{{ w.name }}</strong>
              <em>{{ w.desc }}</em>
            </button>
          </div>
        </div>
      </div>

      <div v-if="status === 'gameover'" class="overlay">
        <div class="over-box card">
          <p class="over-face">😖</p>
          <h2>体力耗尽…</h2>
          <p>本轮只找到 <b>{{ foundCount }}</b> / 7 颗龙珠，还差 {{ 7 - foundCount }} 颗才能召唤神龙。</p>
          <p class="over-score">
            本次得分 <b>{{ score }}</b> ｜ 最高分 <b>{{ best }}</b>
            <span v-if="recordBroken" class="record">🎉 新纪录</span>
          </p>
          <button class="btn primary" @click="restart">再来一次</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const BALL_COUNT = 7
const BEST_KEY = 'dragon-ball:best-score'
const MUTE_KEY = 'dragon-ball:muted'

const WISHES = [
  { key: 'energy', icon: '💪', name: '体力加持', desc: '下一轮开局体力 +15' },
  { key: 'score', icon: '💰', name: '神龙赏金', desc: '立刻获得 300 分' },
  { key: 'radar', icon: '📡', name: '雷达情报', desc: '下一轮开局免费扫描 5 格' }
]

const DECO = ['🪨', '🌾', '🌲', '🍄', '💧', '🌿']

const round = ref(1)
const score = ref(0)
const energy = ref(0)
const gridW = ref(9)
const gridH = ref(7)
const grid = ref([])
const balls = ref([])
const status = ref('playing') // playing | shenron | gameover
const wishList = ref([])
const pendingWish = ref(null)
const lastBonus = ref({ energy: 0, gain: 0 })
const best = ref(Number(localStorage.getItem(BEST_KEY) || 0))
const recordBroken = ref(false)
const muted = ref(localStorage.getItem(MUTE_KEY) === '1')

const foundCount = computed(() => balls.value.filter((b) => b.found).length)

function starFound(n) {
  return balls.value.some((b) => b.found && b.stars === n)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function manhattan(a, b) {
  const w = gridW.value
  return Math.abs(Math.floor(a / w) - Math.floor(b / w)) + Math.abs((a % w) - (b % w))
}

// 每轮地图逐轮变大、体力相对收紧
function roundSpec(r) {
  const w = Math.min(9 + (r - 1) * 2, 15)
  const h = Math.min(7 + (r - 1), 10)
  return { w, h, energy: Math.max(30, Math.round(w * h * 0.62) - (r - 1) * 4) }
}

// ---- 音效：WebAudio 现场合成，无外部资源 ----
let audioCtx = null
function tone(freq, dur = 0.12, type = 'sine', vol = 0.05, delay = 0) {
  if (muted.value) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const t = audioCtx.currentTime + delay
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  } catch {
    /* 音频不可用时静默 */
  }
}

function sfxScan(dist) {
  tone(dist <= 2 ? 880 : dist <= 4 ? 660 : dist <= 7 ? 520 : 330, 0.09, 'square', 0.03)
}
function sfxFound() {
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, i * 0.09))
}
function sfxShenron() {
  tone(98, 0.9, 'sawtooth', 0.05)
  tone(147, 1.0, 'sine', 0.045, 0.12)
}
function sfxWish() {
  ;[659, 880, 1175].forEach((f, i) => tone(f, 0.22, 'triangle', 0.05, i * 0.12))
}
function sfxOver() {
  ;[392, 330, 262].forEach((f, i) => tone(f, 0.28, 'sine', 0.05, i * 0.18))
}

function toggleMute() {
  muted.value = !muted.value
  localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0')
}

function buildRound() {
  const spec = roundSpec(round.value)
  gridW.value = spec.w
  gridH.value = spec.h
  energy.value = spec.energy + (pendingWish.value === 'energy' ? 15 : 0)

  // 隐藏 7 颗龙珠：星数 1-7 各一颗，尽量让两两间距 ≥ 4，避免读数挤在一起
  const total = spec.w * spec.h
  const stars = shuffle([1, 2, 3, 4, 5, 6, 7])
  const placed = []
  let guard = 0
  while (placed.length < BALL_COUNT && guard++ < 5000) {
    const idx = Math.floor(Math.random() * total)
    if (placed.includes(idx)) continue
    const minGap = guard < 4000 ? 4 : 1
    if (placed.some((p) => manhattan(p, idx) < minGap)) continue
    placed.push(idx)
  }
  balls.value = placed.map((idx, i) => ({ idx, stars: stars[i], found: false }))

  grid.value = Array.from({ length: total }, () => ({
    terrain: `t${Math.floor(Math.random() * 4)}`,
    deco: Math.random() < 0.1 ? DECO[Math.floor(Math.random() * DECO.length)] : '',
    scanned: false,
    dist: null,
    heat: '',
    heatCls: '',
    hasBall: false,
    stars: 0
  }))

  if (pendingWish.value === 'radar') freeScans(5)
  pendingWish.value = null
}

function nearestDist(idx) {
  let m = Infinity
  for (const b of balls.value) {
    if (b.found) continue
    m = Math.min(m, manhattan(idx, b.idx))
  }
  return m
}

function heatOf(d) {
  if (d <= 2) return { text: '灼热', cls: 'h1' }
  if (d <= 4) return { text: '炎热', cls: 'h2' }
  if (d <= 7) return { text: '温热', cls: 'h3' }
  return { text: '冰凉', cls: 'h4' }
}

function revealBall(cell, ball) {
  ball.found = true
  cell.scanned = true
  cell.hasBall = true
  cell.stars = ball.stars
  score.value += 100
  energy.value += 6
}

function revealReading(cell, i) {
  const d = nearestDist(i)
  const h = heatOf(d)
  cell.scanned = true
  cell.dist = d
  cell.heat = h.text
  cell.heatCls = h.cls
}

function scan(i) {
  if (status.value !== 'playing' || energy.value <= 0) return
  const cell = grid.value[i]
  if (!cell || cell.scanned) return

  const hit = balls.value.find((b) => !b.found && b.idx === i)
  if (hit) {
    revealBall(cell, hit)
    sfxFound()
    if (foundCount.value === BALL_COUNT) clearRound()
  } else {
    revealReading(cell, i)
    energy.value -= 1
    sfxScan(cell.dist)
    if (energy.value <= 0) gameOver()
  }
}

// 神龙「雷达情报」许愿：下一轮开局免费扫描 5 格
function freeScans(n) {
  const hidden = grid.value.map((c, i) => (c.scanned ? -1 : i)).filter((i) => i >= 0)
  for (const i of shuffle(hidden).slice(0, n)) {
    const cell = grid.value[i]
    const hit = balls.value.find((b) => !b.found && b.idx === i)
    if (hit) {
      revealBall(cell, hit)
      sfxFound()
    } else {
      revealReading(cell, i)
    }
  }
}

function saveBest() {
  if (score.value > best.value) {
    best.value = score.value
    recordBroken.value = true
    localStorage.setItem(BEST_KEY, String(best.value))
  }
}

function clearRound() {
  const gain = energy.value * 10
  lastBonus.value = { energy: energy.value, gain }
  score.value += gain
  saveBest()
  wishList.value = shuffle(WISHES)
  status.value = 'shenron'
  sfxShenron()
}

function chooseWish(w) {
  if (w.key === 'score') score.value += 300
  else pendingWish.value = w.key
  saveBest()
  sfxWish()
  round.value += 1
  status.value = 'playing'
  buildRound()
}

function gameOver() {
  status.value = 'gameover'
  saveBest()
  sfxOver()
}

function restart() {
  round.value = 1
  score.value = 0
  recordBroken.value = false
  pendingWish.value = null
  status.value = 'playing'
  buildRound()
}

buildRound()
</script>

<style scoped>
.db-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.db-sub {
  color: var(--muted);
  margin: 4px 0 0;
  max-width: 560px;
}
.db-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.db-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  align-items: center;
  padding: 12px 18px;
  margin: 14px 0;
}
.stat {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.stat span {
  font-size: 12px;
  color: var(--muted);
}
.stat strong {
  font-size: 20px;
}
.stat strong.danger {
  color: var(--danger);
}

.db-tray {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 12px;
  margin-bottom: 14px;
}
.slot {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px dashed var(--line);
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 12px;
}
.slot.filled {
  border: none;
}
.mini-ball {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, #ffd54f, #ff9800 55%, #e65100);
  box-shadow: 0 2px 6px rgba(230, 81, 0, 0.5);
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  padding: 4px;
  line-height: 1;
  gap: 1px;
}
.mini-ball i,
.ball-sprite i {
  font-style: normal;
  color: #fff8e1;
  font-size: 8px;
  text-shadow: 0 1px 2px rgba(183, 28, 28, 0.6);
}

.db-field {
  padding: 14px;
}
.db-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: 4px;
  max-width: 820px;
  margin: 0 auto;
}
.cell {
  position: relative;
  aspect-ratio: 1;
  border: none;
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s, filter 0.12s, box-shadow 0.12s;
}
.cell:not(.dug):not(:disabled):hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.18);
}
.cell:disabled {
  cursor: default;
}
.t0 {
  background: #d8e8bd;
}
.t1 {
  background: #cfe3ad;
}
.t2 {
  background: #e2eac4;
}
.t3 {
  background: #d3e2b8;
}
.cell.dug {
  background: #e9dcb8;
  box-shadow: inset 0 2px 5px rgba(120, 90, 40, 0.2);
}
.cell.dug b {
  font-weight: 700;
  font-size: clamp(11px, 2.4vw, 16px);
  line-height: 1;
}
.cell.dug em {
  font-style: normal;
  font-size: 9px;
  margin-top: 2px;
  opacity: 0.85;
}
.h1 {
  color: #d43a2f;
}
.h2 {
  color: #d97706;
}
.h3 {
  color: #a16207;
}
.h4 {
  color: #2f6fdd;
}
.deco {
  font-size: clamp(10px, 2vw, 14px);
  opacity: 0.6;
  pointer-events: none;
}

.cell.ball {
  background: radial-gradient(circle at 32% 30%, #ffe082, #ffa726 55%, #ef6c00);
  box-shadow: 0 0 12px rgba(255, 152, 0, 0.8);
  animation: db-pop 0.35s ease;
}
.ball-sprite {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  padding: 0 4px;
  gap: 1px;
  line-height: 1;
  font-size: clamp(8px, 1.6vw, 11px);
}
@keyframes db-pop {
  from {
    transform: scale(0.4);
  }
  to {
    transform: scale(1);
  }
}

.db-help {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.9;
  margin: 14px 2px;
}
.db-help .h1,
.db-help .h2,
.db-help .h3,
.db-help .h4 {
  font-weight: 600;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(10, 14, 25, 0.82);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.shenron-box {
  text-align: center;
  color: #f5f0d8;
  max-width: 640px;
  width: 100%;
}
.shenron-dragon {
  font-size: clamp(72px, 14vw, 120px);
  filter: drop-shadow(0 0 24px rgba(255, 214, 64, 0.9));
  animation: db-rise 0.8s ease;
}
.shenron-box h2 {
  font-size: clamp(22px, 4vw, 32px);
  margin: 8px 0 4px;
  color: #ffd94d;
  text-shadow: 0 0 18px rgba(255, 217, 77, 0.5);
}
.shenron-line {
  margin: 0;
  opacity: 0.9;
}
.shenron-line b {
  color: #ffd94d;
}
.shenron-lead {
  margin: 14px 0 18px;
  font-size: 17px;
  color: #ffe9a8;
}
.wish-list {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.wish {
  width: 168px;
  padding: 18px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 217, 77, 0.4);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font: inherit;
  transition: transform 0.12s, background 0.12s, box-shadow 0.12s;
}
.wish:hover {
  transform: translateY(-4px);
  background: rgba(255, 217, 77, 0.12);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
}
.wish-icon {
  font-size: 30px;
}
.wish strong {
  font-size: 16px;
  color: #ffd94d;
}
.wish em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.5;
}
@keyframes db-rise {
  from {
    transform: translateY(40px) scale(0.6);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

.over-box {
  text-align: center;
  padding: 28px 32px;
  max-width: 420px;
}
.over-face {
  font-size: 44px;
  margin: 0;
}
.over-box h2 {
  margin: 6px 0 8px;
}
.over-score {
  margin: 12px 0 18px;
  color: var(--muted);
}
.over-score b {
  color: var(--text);
  font-size: 18px;
}
.record {
  color: #d97706;
  font-weight: 600;
  margin-left: 6px;
}

@media (max-width: 560px) {
  .db-header {
    flex-direction: column;
  }
  .db-actions {
    flex-direction: row;
  }
  .db-stats {
    gap: 10px 18px;
  }
}
</style>
