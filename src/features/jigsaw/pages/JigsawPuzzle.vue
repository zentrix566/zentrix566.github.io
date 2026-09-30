<template>
  <section class="page page--wide">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <header class="jz-head">
      <p class="eyebrow">Jigsaw · 拼图</p>
      <h1 class="page-title">🧩 拼图游戏</h1>
      <p class="page-subtitle">
        选一张预设画、掷骰子生成新画，或上传自己的照片，打碎成带凹凸咬口的碎片后拖回原位，拼完整幅图。
      </p>
    </header>

    <div class="jz-toolbar card">
      <div class="jz-group">
        <span class="jz-label">图源</span>
        <button
          v-for="t in themes"
          :key="t.id"
          type="button"
          class="jz-theme"
          :class="{ active: source === t.id }"
          :title="`${t.name}（预设图）`"
          @click="useTheme(t)"
        >
          <canvas :ref="(el) => setThumb(t.id, el)" width="120" height="80"></canvas>
          <span>{{ t.emoji }} {{ t.name }}</span>
        </button>
        <button type="button" class="jz-theme" :class="{ active: source === 'random' }" @click="randomPainting">
          <span class="jz-thumb-flat">🎲</span>
          <span>生成新图</span>
        </button>
        <button type="button" class="jz-theme" :class="{ active: source === 'custom' }" @click="pickFile">
          <span class="jz-thumb-flat">🖼️</span>
          <span>我的照片</span>
        </button>
        <input ref="fileInput" type="file" accept="image/*" class="jz-file" @change="onFile" />
      </div>
      <div class="jz-group">
        <span class="jz-label">难度</span>
        <select v-model.number="grid" class="jz-select" @change="onGridChange">
          <option :value="3">3 × 3 · 入门</option>
          <option :value="4">4 × 4 · 进阶</option>
          <option :value="5">5 × 5 · 挑战</option>
          <option :value="6">6 × 6 · 大师</option>
        </select>
      </div>
      <div class="jz-group">
        <button class="btn" type="button" @click="previewOn = true">👁 预览</button>
        <button class="btn" type="button" :class="{ on: hint }" @click="hint = !hint">💡 提示</button>
        <button class="btn" type="button" @click="restart">🔀 重新开始</button>
        <button class="btn" type="button" :title="soundOn ? '关闭音效' : '开启音效'" @click="soundOn = !soundOn">
          {{ soundOn ? '🔊' : '🔇' }}
        </button>
      </div>
    </div>

    <div ref="stage" class="jz-stage" @contextmenu.prevent>
      <div ref="boardEl" class="jz-board" :class="{ ghost: hint }">
        <canvas ref="ghostCanvas" class="jz-ghost"></canvas>
      </div>
      <div class="jz-chips">
        <span class="jz-chip">⏱ {{ timeStr }}</span>
        <span class="jz-chip">🧩 {{ placedCount }}/{{ total }}</span>
        <span class="jz-chip">👣 {{ moves }}</span>
        <span class="jz-chip">🏆 {{ bestStr }}</span>
      </div>
      <transition name="jz-fade">
        <div v-if="won" class="jz-win">
          <div class="jz-win-card">
            <h2>🎉 完成！</h2>
            <p>用时 <b>{{ timeStr }}</b> · {{ moves }} 步 · {{ grid }}×{{ grid }} 块碎片</p>
            <p v-if="newRecord" class="jz-record">✨ 新纪录！</p>
            <div class="jz-win-actions">
              <button class="btn primary" type="button" @click="restart">再来一局</button>
              <button class="btn" type="button" @click="randomPainting">换一张图</button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <transition name="jz-fade">
      <div v-if="previewOn" class="jz-preview" @click="previewOn = false">
        <canvas ref="previewCanvas"></canvas>
        <p>点击任意位置关闭</p>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PAINT_H, PAINT_W, THEMES, mulberry32 } from '../utils/paintings.js'

const themes = THEMES
const stage = ref(null)
const boardEl = ref(null)
const ghostCanvas = ref(null)
const previewCanvas = ref(null)
const fileInput = ref(null)

const source = ref('random')
const grid = ref(4)
const hint = ref(false)
const soundOn = ref(localStorage.getItem('jigsaw:sound') !== '0')
const previewOn = ref(false)
const won = ref(false)
const newRecord = ref(false)
const timeStr = ref('00:00')
const moves = ref(0)
const placedCount = ref(0)
const bestStr = ref('--:--')
const total = computed(() => grid.value * grid.value)

// —— 游戏内部状态（非响应式，直接操作 DOM 才能拖得顺滑）——
const G = {
  R: 4,
  C: 4,
  bw: 0, // 底板显示宽（CSS px）
  bh: 0,
  boardX: 0, // 底板在舞台内的位置
  boardY: 0,
  cellW: 0,
  cellH: 0,
  pad: 0, // 碎片画布四周留白（容纳凸出的咬口）
  snap: 0, // 吸附判定距离
  stageW: 0,
  stageH: 0,
  dpr: 1,
  paint: null, // 1500×1000 原画
  src: null, // 按底板尺寸缩放后的原图（用于切片）
  edgesH: [], // 水平网格线咬口参数 eH[r][c]
  edgesV: [], // 垂直网格线咬口参数 eV[c][r]
  pieces: [],
  placed: 0,
  moves: 0,
  zTop: 20,
  seed: (Math.random() * 1e9) | 0,
  elapsed: 0,
  startAt: 0,
  running: false,
  timer: null,
  customImg: null
}
let drag = null

watch(soundOn, (v) => localStorage.setItem('jigsaw:sound', v ? '1' : '0'))

// ============================== 音效 ==============================
let audioCtx = null
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      audioCtx = null
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
}
function tone(freq, delay, dur, type = 'sine', gain = 0.14) {
  if (!soundOn.value || !audioCtx) return
  const t0 = audioCtx.currentTime + delay
  const osc = audioCtx.createOscillator()
  const g = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(audioCtx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}
function snapSound() {
  tone(560, 0, 0.07, 'triangle', 0.16)
  tone(840, 0.05, 0.09, 'triangle', 0.12)
}
function winSound() {
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 0.28, 'sine', 0.15))
}

// ============================== 原画与底板 ==============================
function makePainting(reseed) {
  G.paint = G.paint || document.createElement('canvas')
  G.paint.width = PAINT_W
  G.paint.height = PAINT_H
  const ctx = G.paint.getContext('2d')
  if (source.value === 'custom' && G.customImg) {
    const img = G.customImg
    const s = Math.max(PAINT_W / img.width, PAINT_H / img.height)
    const dw = img.width * s
    const dh = img.height * s
    ctx.fillStyle = '#dde5f2'
    ctx.fillRect(0, 0, PAINT_W, PAINT_H)
    ctx.drawImage(img, (PAINT_W - dw) / 2, (PAINT_H - dh) / 2, dw, dh)
    return
  }
  const theme = themes.find((t) => t.id === source.value)
  if (theme) G.seed = theme.seed
  else if (reseed || !G.seed) G.seed = (Math.random() * 1e9) | 0
  const draw = theme ? theme.draw : themes[(Math.random() * themes.length) | 0].draw
  draw(ctx, PAINT_W, PAINT_H, mulberry32(G.seed))
}

function buildBoard() {
  const rect = stage.value.getBoundingClientRect()
  G.stageW = rect.width
  G.stageH = rect.height
  const narrow = rect.width < 700
  let bw = narrow ? rect.width - 24 : Math.min(rect.width * 0.56, rect.height * 1.32)
  let bh = bw / 1.5
  if (bh > rect.height - 24) {
    bh = rect.height - 24
    bw = bh * 1.5
  }
  G.bw = bw
  G.bh = bh
  G.boardX = (rect.width - bw) / 2
  G.boardY = (rect.height - bh) / 2
  G.cellW = bw / G.C
  G.cellH = bh / G.R
  G.pad = Math.min(G.cellW, G.cellH) * 0.34
  G.snap = Math.max(G.cellW, G.cellH) * 0.34
  G.dpr = Math.min(window.devicePixelRatio || 1, 2)
  Object.assign(boardEl.value.style, {
    left: `${G.boardX}px`,
    top: `${G.boardY}px`,
    width: `${bw}px`,
    height: `${bh}px`
  })
  // 底板尺寸下的原图与提示底图
  G.src = document.createElement('canvas')
  G.src.width = Math.round(bw * G.dpr)
  G.src.height = Math.round(bh * G.dpr)
  G.src.getContext('2d').drawImage(G.paint, 0, 0, G.src.width, G.src.height)
  const ghost = ghostCanvas.value
  ghost.width = G.src.width
  ghost.height = G.src.height
  ghost.getContext('2d').drawImage(G.src, 0, 0)
}

// ============================== 咬口曲线与切片 ==============================
// 每条内部网格线随机生成一个咬口参数：m 为咬口中心位置，h 为方向×高度（相对 min(cellW,cellH)）
function makeEdges() {
  const rng = mulberry32(G.seed + 1)
  const one = () => ({ m: 0.5 + (rng() - 0.5) * 0.12, h: (0.24 + rng() * 0.07) * (rng() < 0.5 ? 1 : -1) })
  G.edgesH = Array.from({ length: G.R + 1 }, () => Array.from({ length: G.C }, one))
  G.edgesV = Array.from({ length: G.C + 1 }, () => Array.from({ length: G.R }, one))
}

// 沿一条网格线生成咬口的贝塞尔锚点（画板坐标）。
// O 为边起点，(ux,uy) 为边方向，(nx,ny) 为咬口偏移方向，e 为该线的咬口参数。
function buildEdge(ox, oy, ux, uy, nx, ny, e, L, S) {
  const P = (t, k) => [ox + ux * t * L + nx * k * S, oy + uy * t * L + ny * k * S]
  return {
    start: P(0, 0),
    pre: P(e.m - 0.11, 0),
    segs: [
      { c1: P(e.m - 0.02, 0), c2: P(e.m - 0.16, e.h), p: P(e.m, e.h) },
      { c1: P(e.m + 0.16, e.h), c2: P(e.m + 0.02, 0), p: P(e.m + 0.11, 0) }
    ],
    end: P(1, 0)
  }
}
function traceForward(path, E) {
  path.lineTo(E.pre[0], E.pre[1])
  path.bezierCurveTo(E.segs[0].c1[0], E.segs[0].c1[1], E.segs[0].c2[0], E.segs[0].c2[1], E.segs[0].p[0], E.segs[0].p[1])
  path.bezierCurveTo(E.segs[1].c1[0], E.segs[1].c1[1], E.segs[1].c2[0], E.segs[1].c2[1], E.segs[1].p[0], E.segs[1].p[1])
  path.lineTo(E.end[0], E.end[1])
}
// 逆序描同一条曲线（控制点反转），保证相邻碎片严丝合缝
function traceBackward(path, E) {
  path.lineTo(E.segs[1].p[0], E.segs[1].p[1])
  path.bezierCurveTo(E.segs[1].c2[0], E.segs[1].c2[1], E.segs[1].c1[0], E.segs[1].c1[1], E.segs[0].p[0], E.segs[0].p[1])
  path.bezierCurveTo(E.segs[0].c2[0], E.segs[0].c2[1], E.segs[0].c1[0], E.segs[0].c1[1], E.pre[0], E.pre[1])
  path.lineTo(E.start[0], E.start[1])
}

function piecePath(r, c) {
  const x0 = c * G.cellW
  const y0 = r * G.cellH
  const x1 = x0 + G.cellW
  const y1 = y0 + G.cellH
  const S = Math.min(G.cellW, G.cellH)
  const eh = (rh, cc) => buildEdge(cc * G.cellW, rh * G.cellH, 1, 0, 0, 1, G.edgesH[rh][cc], G.cellW, S)
  const ev = (cv, rr) => buildEdge(cv * G.cellW, rr * G.cellH, 0, 1, -1, 0, G.edgesV[cv][rr], G.cellH, S)
  const path = new Path2D()
  path.moveTo(x0, y0)
  if (r === 0) path.lineTo(x1, y0)
  else traceForward(path, eh(r, c))
  if (c === G.C - 1) path.lineTo(x1, y1)
  else traceForward(path, ev(c + 1, r))
  if (r === G.R - 1) path.lineTo(x0, y1)
  else traceBackward(path, eh(r + 1, c))
  if (c === 0) path.lineTo(x0, y0)
  else traceBackward(path, ev(c, r))
  path.closePath()
  return path
}

function pieceCssW() {
  return G.cellW + G.pad * 2
}
function pieceCssH() {
  return G.cellH + G.pad * 2
}

function buildPieces() {
  for (const p of G.pieces) p.el.remove()
  G.pieces = []
  G.zTop = 20
  for (let r = 0; r < G.R; r++) {
    for (let c = 0; c < G.C; c++) {
      const el = document.createElement('canvas')
      el.className = 'jz-piece'
      el.dataset.r = r
      el.dataset.c = c
      const p = { r, c, x0: c * G.cellW, y0: r * G.cellH, el, left: 0, top: 0, placed: false, cssW: 0, cssH: 0 }
      sizePiece(p)
      el.addEventListener('pointerdown', (e) => onDown(e, p))
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
      stage.value.appendChild(el)
      G.pieces.push(p)
    }
  }
}

function sizePiece(p) {
  p.cssW = pieceCssW()
  p.cssH = pieceCssH()
  p.el.width = Math.ceil(p.cssW * G.dpr)
  p.el.height = Math.ceil(p.cssH * G.dpr)
  Object.assign(p.el.style, { width: `${p.cssW}px`, height: `${p.cssH}px` })
  renderPiece(p)
}

function renderPiece(p) {
  const ctx = p.el.getContext('2d')
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0)
  ctx.clearRect(0, 0, p.cssW, p.cssH)
  ctx.save()
  ctx.translate(G.pad - p.x0, G.pad - p.y0)
  const path = piecePath(p.r, p.c)
  ctx.clip(path)
  ctx.drawImage(G.src, 0, 0, G.bw, G.bh)
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(15,20,45,0.35)'
  ctx.stroke(path)
  ctx.restore()
}

function scatter() {
  for (const p of G.pieces) {
    let x = 0
    let y = 0
    for (let i = 0; i < 24; i++) {
      x = 4 + Math.random() * (G.stageW - p.cssW - 8)
      y = 4 + Math.random() * (G.stageH - p.cssH - 8)
      const dx = x + G.pad + G.cellW / 2 - (G.boardX + p.x0 + G.cellW / 2)
      const dy = y + G.pad + G.cellH / 2 - (G.boardY + p.y0 + G.cellH / 2)
      if (Math.hypot(dx, dy) > G.snap * 1.5) break
    }
    p.left = x
    p.top = y
    p.placed = false
    p.el.classList.remove('placed')
    p.el.style.zIndex = 2 + ((Math.random() * 60) | 0)
    applyPos(p)
  }
  G.placed = 0
}

function applyPos(p) {
  p.el.style.left = `${p.left}px`
  p.el.style.top = `${p.top}px`
}

// ============================== 拖拽与吸附 ==============================
function onDown(e, p) {
  if (p.placed || won.value) return
  e.preventDefault()
  ensureAudio()
  if (!G.running) startTimer()
  const rect = p.el.getBoundingClientRect()
  const srect = stage.value.getBoundingClientRect()
  drag = { p, dx: e.clientX - rect.left, dy: e.clientY - rect.top, sx: srect.left, sy: srect.top, moved: false }
  try {
    p.el.setPointerCapture(e.pointerId)
  } catch {
    // 合成事件（自动化测试/无有效 pointerId）下可能抛错，忽略即可
  }
  p.el.classList.add('drag')
  p.el.style.zIndex = ++G.zTop
}
function onMove(e) {
  if (!drag) return
  const p = drag.p
  const nx = Math.min(Math.max(e.clientX - drag.dx - drag.sx, 2), G.stageW - p.cssW - 2)
  const ny = Math.min(Math.max(e.clientY - drag.dy - drag.sy, 2), G.stageH - p.cssH - 2)
  if (!drag.moved && Math.hypot(nx - p.left, ny - p.top) > 4) drag.moved = true
  p.left = nx
  p.top = ny
  applyPos(p)
}
function onUp() {
  if (!drag) return
  const p = drag.p
  p.el.classList.remove('drag')
  if (drag.moved) {
    G.moves++
    moves.value = G.moves
    trySnap(p)
  }
  drag = null
}
function trySnap(p) {
  const dx = p.left + G.pad + G.cellW / 2 - (G.boardX + p.x0 + G.cellW / 2)
  const dy = p.top + G.pad + G.cellH / 2 - (G.boardY + p.y0 + G.cellH / 2)
  if (Math.hypot(dx, dy) > G.snap) return
  p.placed = true
  p.left = G.boardX + p.x0 - G.pad
  p.top = G.boardY + p.y0 - G.pad
  applyPos(p)
  p.el.style.zIndex = 1
  p.el.classList.add('placed')
  G.placed++
  placedCount.value = G.placed
  snapSound()
  if (G.placed === total.value) winGame()
}

// ============================== 计时 / 纪录 / 胜利 ==============================
function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
function startTimer() {
  G.running = true
  G.startAt = Date.now() - G.elapsed * 1000
  G.timer = setInterval(() => {
    G.elapsed = Math.floor((Date.now() - G.startAt) / 1000)
    timeStr.value = fmtTime(G.elapsed)
  }, 500)
}
function stopTimer() {
  clearInterval(G.timer)
  G.running = false
}
function bestKey() {
  return `${grid.value}x${grid.value}`
}
function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('jigsaw:best-v1')) || {}
  } catch {
    return {}
  }
}
function updateBest() {
  const b = loadBest()[bestKey()]
  bestStr.value = b ? fmtTime(b) : '--:--'
}
function winGame() {
  stopTimer()
  won.value = true
  winSound()
  const best = loadBest()
  const prev = best[bestKey()]
  if (!prev || G.elapsed < prev) {
    best[bestKey()] = G.elapsed
    localStorage.setItem('jigsaw:best-v1', JSON.stringify(best))
    newRecord.value = true
    updateBest()
  }
}

// ============================== 对外操作 ==============================
function resetRound() {
  stopTimer()
  won.value = false
  newRecord.value = false
  G.moves = 0
  moves.value = 0
  G.placed = 0
  placedCount.value = 0
  G.elapsed = 0
  timeStr.value = '00:00'
}
// 同一张图重新打乱
function restart() {
  resetRound()
  buildBoard()
  buildPieces()
  scatter()
}
// 换图（同一 seed 的预设图保持不变；随机图 reseed 时才换）
function newGame(reseed = false) {
  resetRound()
  makePainting(reseed)
  makeEdges()
  buildBoard()
  buildPieces()
  scatter()
  updateBest()
}
function useTheme(t) {
  source.value = t.id
  newGame()
}
function randomPainting() {
  source.value = 'random'
  newGame(true)
}
function onGridChange() {
  G.R = grid.value
  G.C = grid.value
  newGame()
}
function pickFile() {
  fileInput.value.click()
}
function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    if (G.customImg) URL.revokeObjectURL(G.customImg.src)
    G.customImg = img
    source.value = 'custom'
    newGame()
  }
  img.src = url
  e.target.value = ''
}

// 预览大图
watch(previewOn, async (v) => {
  if (!v || !G.paint) return
  await nextTick()
  const c = previewCanvas.value
  if (!c) return
  const maxW = Math.min(window.innerWidth * 0.86, 1000)
  const maxH = window.innerHeight * 0.7
  let w = maxW
  let h = w / 1.5
  if (h > maxH) {
    h = maxH
    w = h * 1.5
  }
  const d = Math.min(window.devicePixelRatio || 1, 2)
  c.width = Math.round(w * d)
  c.height = Math.round(h * d)
  c.style.width = `${w}px`
  c.style.height = `${h}px`
  c.getContext('2d').drawImage(G.paint, 0, 0, c.width, c.height)
})

// ============================== 缩放自适应 ==============================
let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(relayout, 180)
}
function relayout() {
  if (!G.pieces.length || !stage.value) return
  const oldW = G.stageW
  buildBoard()
  for (const p of G.pieces) {
    sizePiece(p)
    if (p.placed) {
      p.left = G.boardX + p.x0 - G.pad
      p.top = G.boardY + p.y0 - G.pad
    } else {
      const cx = (p.left + p.cssW / 2) / oldW
      const cy = (p.top + p.cssH / 2) / G.stageH
      p.left = Math.min(Math.max(cx * G.stageW - p.cssW / 2, 2), G.stageW - p.cssW - 2)
      p.top = Math.min(Math.max(cy * G.stageH - p.cssH / 2, 2), G.stageH - p.cssH - 2)
    }
    applyPos(p)
  }
}

// ============================== 生命周期 ==============================
const thumbEls = {}
function setThumb(id, el) {
  if (el) thumbEls[id] = el
}
onMounted(() => {
  G.R = grid.value
  G.C = grid.value
  for (const t of themes) {
    const c = thumbEls[t.id]
    if (c) t.draw(c.getContext('2d'), c.width, c.height, mulberry32(t.seed))
  }
  newGame()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  stopTimer()
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.jz-head {
  margin-bottom: 14px;
}
.jz-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: flex-start;
  padding: 14px 18px;
  margin-bottom: 14px;
}
.jz-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.jz-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}
.jz-theme {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 7px 6px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.jz-theme:hover {
  transform: translateY(-2px);
  border-color: rgba(47, 111, 237, 0.45);
}
.jz-theme.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
}
.jz-theme canvas {
  display: block;
  width: 60px;
  height: 40px;
  border-radius: 6px;
}
.jz-thumb-flat {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 40px;
  border-radius: 6px;
  background: linear-gradient(180deg, #eef2fb, #e2e9f6);
  font-size: 24px;
}
.jz-file {
  display: none;
}
.jz-select {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-weight: 650;
  cursor: pointer;
}
.btn.on {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.jz-stage {
  position: relative;
  height: clamp(420px, 64vh, 760px);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #eef2f9, #e0e7f3);
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.jz-board {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed rgba(60, 80, 140, 0.35);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.28);
}
.jz-ghost {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.jz-board.ghost .jz-ghost {
  opacity: 0.24;
}
.jz-chips {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 500;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: none;
}
.jz-chip {
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(23, 32, 54, 0.72);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  backdrop-filter: blur(3px);
}
.jz-win {
  position: absolute;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.3);
}
.jz-win-card {
  padding: 26px 36px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35);
  text-align: center;
}
.jz-win-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
}
.jz-win-card p {
  margin: 4px 0;
  color: var(--muted);
}
.jz-record {
  color: #d97706;
  font-weight: 700;
}
.jz-win-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
}
.jz-preview {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(10, 15, 30, 0.74);
  cursor: zoom-out;
}
.jz-preview canvas {
  border-radius: 10px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
  max-width: 86vw;
  max-height: 72vh;
}
.jz-preview p {
  color: #dbe3f5;
  font-size: 13px;
}
.jz-fade-enter-active,
.jz-fade-leave-active {
  transition: opacity 0.2s ease;
}
.jz-fade-enter-from,
.jz-fade-leave-to {
  opacity: 0;
}
@media (max-width: 720px) {
  .jz-stage {
    height: clamp(380px, 58vh, 640px);
  }
}
</style>

<!-- 碎片画布由脚本动态创建、不带 scoped 属性，样式必须放在非 scoped 块 -->
<style>
.jz-piece {
  position: absolute;
  cursor: grab;
  touch-action: none;
  filter: drop-shadow(2px 3px 4px rgba(20, 30, 60, 0.35));
}
.jz-piece.drag {
  cursor: grabbing;
  filter: drop-shadow(5px 9px 12px rgba(20, 30, 60, 0.42));
}
.jz-piece.placed {
  cursor: default;
  filter: none;
}
</style>
