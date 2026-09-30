<template>
  <section class="section page-section dm-page">
    <div class="container">
      <header class="dm-header">
        <div>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Donkey Mill</p>
          <h1>🫏 驴拉磨</h1>
          <p class="dm-sub">
            你是磨坊小掌柜：添谷物、催驴、赶订单。驴有体力也有脾气，哄好它才出面粉。
          </p>
        </div>
        <div class="dm-actions">
          <button class="btn ghost" @click="toggleMute">{{ muted ? '🔇 音效关' : '🔊 音效开' }}</button>
          <button class="btn ghost" @click="restartAll">↻ 重新开始</button>
        </div>
      </header>

      <div class="dm-stats card">
        <div class="stat"><span>订单</span><strong>{{ flourInt }} / {{ target }} 袋</strong></div>
        <div class="stat"><span>剩余时间</span><strong :class="{ danger: timeDisp <= 10 && status === 'playing' }">{{ timeDisp }} 秒</strong></div>
        <div class="stat"><span>钱袋</span><strong>{{ money }} 文</strong></div>
        <div class="stat"><span>轮数</span><strong>第 {{ round }} 轮</strong></div>
        <div class="stat"><span>最远纪录</span><strong>第 {{ bestRound }} 轮</strong></div>
      </div>

      <div class="dm-main">
        <div class="dm-scene card">
          <canvas ref="canvasEl" @click="onCanvasClick"></canvas>
          <div v-if="hint && status === 'playing'" class="dm-hint">{{ hint }}</div>

          <div v-if="status === 'intro'" class="overlay">
            <div class="dm-box card">
              <p class="dm-face">🫏</p>
              <h2>驴拉磨 · 磨坊小掌柜</h2>
              <ul class="dm-rules">
                <li>点<b>【添谷物】</b>把谷物添进磨眼，驴每转一圈磨出 1 袋面粉，磨眼空了就是干转白费劲。</li>
                <li><b>鞭策</b>（空格 / 直接点驴）让驴提速，但驴会掉心情；心情见底驴就<b>罢工</b>，没体力就<b>趴窝</b>。</li>
                <li><b>喂胡萝卜</b>（C）回体力又哄心情，<b>摸驴头</b>（P）白嫖一点心情。</li>
                <li>限时完成订单赚钱，钱能买升级；订单一轮比一轮紧。</li>
              </ul>
              <button class="btn primary" @click="startRun">开工！</button>
            </div>
          </div>

          <div v-else-if="status === 'result'" class="overlay">
            <div class="dm-box card">
              <p class="dm-face">🎉</p>
              <h2>订单完成！</h2>
              <p class="dm-earn">
                面粉 {{ lastResult.bags }} 袋 × 3 文 = {{ lastResult.base }} 文
                ＋ 时间奖励 {{ lastResult.bonus }} 文
              </p>
              <p class="dm-earn-total">本轮共赚 <b>{{ lastResult.total }}</b> 文</p>
              <p class="dm-say">驴：「{{ lastResult.line }}」</p>
              <div class="dm-shop">
                <button
                  v-for="u in upgrades"
                  :key="u.key"
                  class="shop-item"
                  :disabled="money < price(u) || u.lv >= u.max"
                  @click="buy(u)"
                >
                  <span class="shop-icon">{{ u.icon }}</span>
                  <span class="shop-name">{{ u.name }} <em>Lv.{{ u.lv }}</em></span>
                  <span class="shop-desc">{{ u.desc }}</span>
                  <span class="shop-price">{{ u.lv >= u.max ? '已满级' : `${price(u)} 文` }}</span>
                </button>
              </div>
              <button class="btn primary" @click="nextRound">开始第 {{ round + 1 }} 轮</button>
            </div>
          </div>

          <div v-else-if="status === 'fail'" class="overlay">
            <div class="dm-box card">
              <p class="dm-face">😵</p>
              <h2>时间到…</h2>
              <p>
                只磨出 <b>{{ flourInt }}</b> / {{ target }} 袋，还差 {{ target - flourInt }} 袋，
                客人背着空袋子走了。
              </p>
              <p class="dm-say">驴：「{{ FAIL_LINE }}」</p>
              <p class="dm-keep">钱袋和升级都保留，重整旗鼓再来。</p>
              <button class="btn primary" @click="retry">再试一次</button>
            </div>
          </div>
        </div>

        <aside class="dm-panel card">
          <div class="panel-block">
            <div class="panel-title">
              <span>磨眼</span>
              <em>{{ hopDisp }} / {{ hopCap }} 瓢</em>
            </div>
            <div class="bar"><i class="bar-fill grain" :style="{ width: hopPct + '%' }"></i></div>
            <button class="btn act grain-btn" @click="grain">🫓 添谷物（G）</button>
          </div>

          <div class="panel-block">
            <div class="panel-title">
              <span>驴的体力</span>
              <em>{{ Math.round(st) }}</em>
            </div>
            <div class="bar"><i class="bar-fill stamina" :class="{ low: st < 25 }" :style="{ width: stPct + '%' }"></i></div>
            <div class="panel-title">
              <span>驴的心情</span>
              <em>{{ Math.round(mo) }}</em>
            </div>
            <div class="bar"><i class="bar-fill mood" :class="{ low: mo < 25 }" :style="{ width: moPct + '%' }"></i></div>
            <p class="dm-state">驴现在：{{ stateText }}</p>
          </div>

          <div class="panel-block dm-ops">
            <button class="btn act whip" @click="whip">🪄 鞭策（空格）</button>
            <button class="btn act" :disabled="money < 2" @click="carrot">🥕 喂胡萝卜（2 文）</button>
            <button class="btn act" :disabled="petCd > 0" @click="pet">🖐️ 摸驴头{{ petCd > 0 ? `（${petCd.toFixed(1)}s）` : '' }}</button>
          </div>

          <p class="dm-msg" v-if="msg">{{ msg }}</p>
        </aside>
      </div>

      <p class="dm-help">
        键盘党：<b>空格</b> 鞭策 · <b>G</b> 添谷物 · <b>C</b> 喂胡萝卜 · <b>P</b> 摸驴头。
        鞭策会掉心情、连续猛抽掉得更多；心情归零驴当场罢工，只能摸头或喂胡萝卜哄回来。
        体力归零驴趴窝，也得起胡萝卜伺候。磨眼空了驴空转不出面，记得勤添谷物。
        完成订单结算面粉钱和剩余时间奖励，钱用来买四项升级，看你能赶到第几轮。
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

// ---------- 常量 ----------
const BEST_KEY = 'donkey-mill:best-round'
const MUTE_KEY = 'donkey-mill:muted'

const SIZE = 480            // 画布逻辑边长
const CX = 240
const CY = 248
const ORBIT = 128           // 驴的轨道半径
const LAP_TIME = 3.0        // 满速一圈秒数
const OMEGA_MAX = (Math.PI * 2) / LAP_TIME
const SPOUT_ANGLE = 0.62    // 出面口固定朝向（右下）
const CARROT_COST = 2
const BAG_PRICE = 3

const WHIP_LINES = ['嗯啊！', '又打！', '疼疼疼！', '鞭子换胡萝卜行不行？', '我记仇了啊']
const CARROT_LINES = ['嗯——香！', '这就对了嘛～', '再来一根？', '懂不懂驴的辛苦～']
const PET_LINES = ['蹭蹭～', '再摸会儿…', '舒服。', '就冲你这儿，再转两圈']
const STRIKE_LINES = ['罢工！先上胡萝卜！', '心里没我，腿上没劲', '哼！', '驴也有驴权！']
const EMPTY_LINES = ['磨眼空啦！干转呢！', '没粮怎么磨面？']
const SUCCESS_LINES = ['今晚加餐不？', '面磨完了，胡萝卜呢？', '掌柜的，结账！']
const FAIL_LINE = '实在…转不动了…'

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ---------- 音效（WebAudio 合成） ----------
let actx = null
let master = null
let grindGain = null

function ensureAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    actx = new AC()
    master = actx.createGain()
    master.gain.value = muted.value ? 0 : 1
    master.connect(actx.destination)
    startGrindLoop()
  }
  if (actx.state === 'suspended') actx.resume()
  return actx
}

function startGrindLoop() {
  // 磨盘隆隆声：循环噪声过低通，音量随转速与磨眼有无实时调
  const len = actx.sampleRate * 1.5
  const buf = actx.createBuffer(1, len, actx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = actx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const low = actx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 160
  grindGain = actx.createGain()
  grindGain.gain.value = 0
  src.connect(low).connect(grindGain).connect(master)
  src.start()
}

function tone(freq, dur, type, vol, slideTo) {
  if (!actx) return
  const t0 = actx.currentTime
  const osc = actx.createOscillator()
  const g = actx.createGain()
  osc.type = type || 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(vol || 0.15, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noiseBurst(dur, vol, filterType, freq) {
  if (!actx) return
  const t0 = actx.currentTime
  const len = Math.max(1, Math.floor(actx.sampleRate * dur))
  const buf = actx.createBuffer(1, len, actx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = actx.createBufferSource()
  src.buffer = buf
  const f = actx.createBiquadFilter()
  f.type = filterType || 'lowpass'
  f.frequency.value = freq || 800
  const g = actx.createGain()
  g.gain.value = vol || 0.2
  src.connect(f).connect(g).connect(master)
  src.start(t0)
}

const sfx = {
  hoof() { noiseBurst(0.06, 0.12, 'lowpass', 260) },
  whip() { noiseBurst(0.07, 0.32, 'highpass', 2200); tone(700, 0.1, 'square', 0.06, 180) },
  ding() { tone(880, 0.14, 'triangle', 0.16); tone(1320, 0.2, 'sine', 0.08) },
  pour() { noiseBurst(0.18, 0.14, 'bandpass', 900) },
  munch() { noiseBurst(0.09, 0.16, 'lowpass', 500); setTimeout(() => actx && noiseBurst(0.09, 0.14, 'lowpass', 420), 130) },
  pet() { tone(520, 0.16, 'sine', 0.08, 640) },
  bray() { tone(430, 0.28, 'sawtooth', 0.14, 620); setTimeout(() => actx && tone(330, 0.5, 'sawtooth', 0.14, 160), 240) },
  sad() { tone(320, 0.3, 'sawtooth', 0.12, 200); setTimeout(() => actx && tone(240, 0.45, 'sawtooth', 0.1, 140), 280) },
  coin() { tone(988, 0.1, 'square', 0.1); setTimeout(() => actx && tone(1319, 0.18, 'square', 0.1), 90) },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => actx && tone(f, 0.22, 'triangle', 0.14), i * 130)) }
}

// ---------- 状态 ----------
// S 是模拟用可变对象（不走响应式，每帧读写）；HUD 数值镜像到 ref
const S = {
  angle: -Math.PI / 2,
  walkPhase: 0,
  stepAcc: 0,
  stepSide: 0,
  st: 100,
  mo: 70,
  hopper: 8,
  flour: 0,
  timeLeft: 74,
  whipGlow: 0,
  whipFlash: 0,
  lastWhip: -9,
  prevWhip: -9,
  state: 'walk', // walk | strike | lying
  bubble: null,
  floats: [],
  prints: [],
  dust: [],
  dustAcc: 0,
  bagPulse: 0,
  bubbleCd: 0
}

const status = ref('intro') // intro | playing | result | fail
const round = ref(1)
const money = ref(8)
const muted = ref(false)
const bestRound = ref(1)
const st = ref(100)
const mo = ref(70)
const hopNow = ref(8)
const timeDisp = ref(74)
const flourInt = ref(0)
const msg = ref('')
const petCdRef = ref(0)
const lastResult = ref({ bags: 0, base: 0, bonus: 0, total: 0, line: '' })
const canvasEl = ref(null)

const upgrades = reactive([
  { key: 'hopper', icon: '🫗', name: '宽磨眼', desc: '磨眼容量 +6 瓢', lv: 0, base: 6, max: 5 },
  { key: 'yield', icon: '⚙️', name: '润磨盘', desc: '每圈多磨 20% 的面', lv: 0, base: 8, max: 5 },
  { key: 'carrot', icon: '🥕', name: '香胡萝卜', desc: '胡萝卜回复 +50%', lv: 0, base: 8, max: 5 },
  { key: 'soft', icon: '🍬', name: '甜话术', desc: '鞭策掉的心情 -40%', lv: 0, base: 6, max: 5 }
])

const lv = (key) => upgrades.find((u) => u.key === key).lv
const price = (u) => Math.round(u.base * Math.pow(1.7, u.lv))
const hopCap = computed(() => 12 + 6 * lv('hopper'))
const target = computed(() => 6 + 2 * round.value)
const roundTime = computed(() => Math.max(40, 78 - 4 * round.value))
const carrotGain = computed(() => 35 * (1 + 0.5 * lv('carrot')))
const whipPen = computed(() => 7 * Math.pow(0.6, lv('soft')))

const stPct = computed(() => Math.max(0, Math.min(100, st.value)))
const moPct = computed(() => Math.max(0, Math.min(100, mo.value)))
const hopPct = computed(() => (hopCap.value ? (hopNow.value / hopCap.value) * 100 : 0))
const hopDisp = computed(() => Math.ceil(hopNow.value))
const stateText = computed(() => (S.state === 'strike' ? '罢工中（气鼓鼓）' : S.state === 'lying' ? '趴窝中（腿软）' : '拉磨中'))
const petCd = petCdRef

const hint = computed(() => {
  if (S.state === 'lying') return '驴趴窝了！喂根胡萝卜扶起来'
  if (S.state === 'strike') return '驴罢工了！摸摸头或喂胡萝卜哄好它'
  if (hopNow.value <= 0) return '磨眼空了，干转不出面！点【添谷物】'
  if (st.value < 25) return '驴快没力气了，喂根胡萝卜？'
  if (mo.value < 25) return '驴很不高兴，摸摸它吧'
  return ''
})

// ---------- 本地存储 ----------
function loadStore() {
  try {
    bestRound.value = Number(localStorage.getItem(BEST_KEY)) || 1
    muted.value = localStorage.getItem(MUTE_KEY) === '1'
  } catch (e) { /* 隐私模式下忽略 */ }
}
function saveBest() {
  try { localStorage.setItem(BEST_KEY, String(bestRound.value)) } catch (e) { /* 忽略 */ }
}
function toggleMute() {
  muted.value = !muted.value
  if (master) master.gain.value = muted.value ? 0 : 1
  try { localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0') } catch (e) { /* 忽略 */ }
}

// ---------- 小工具 ----------
function say(text, force) {
  if (!force && S.bubbleCd > 0) return
  S.bubble = { text, born: performance.now() / 1000 }
  S.bubbleCd = 1.6
}
function addFloat(x, y, text, color) {
  S.floats.push({ x, y, text, color: color || '#6b4f2a', age: 0 })
}

// ---------- 操作 ----------
function whip() {
  if (status.value !== 'playing') return
  ensureAudio()
  if (S.state === 'lying') { say('鞭子有啥用，拿胡萝卜来！'); return }
  if (S.state === 'strike') {
    S.mo = Math.max(0, S.mo - 3)
    say(pick(['打也没用！', '越打越气！']), true)
    if (actx) sfx.bray()
    return
  }
  const now = performance.now() / 1000
  S.whipGlow = 1
  S.whipFlash = 1
  if (now - S.prevWhip < 0.6) S.mo = Math.max(0, S.mo - 4) // 连抽激怒
  S.prevWhip = now
  S.lastWhip = now
  S.st = Math.max(0, S.st - 1)
  S.mo = Math.max(0, S.mo - whipPen.value)
  if (actx) sfx.whip()
  if (S.mo < 30 && Math.random() < 0.5) { say(pick(WHIP_LINES)); if (actx) sfx.bray() }
}

function grain() {
  if (status.value !== 'playing') return
  ensureAudio()
  const before = S.hopper
  S.hopper = Math.min(hopCap.value, S.hopper + 4)
  if (S.hopper > before) {
    if (actx) sfx.pour()
    if (before <= 0) say('来了来了！')
  } else {
    msg.value = '磨眼满着呢'
    setTimeout(() => { if (msg.value === '磨眼满着呢') msg.value = '' }, 1500)
  }
}

function carrot() {
  if (status.value !== 'playing' || money.value < CARROT_COST) return
  ensureAudio()
  money.value -= CARROT_COST
  S.st = Math.min(100, S.st + carrotGain.value)
  S.mo = Math.min(100, S.mo + 18)
  if (actx) sfx.munch()
  say(pick(CARROT_LINES), true)
  if (S.state === 'strike' && S.mo >= 30) { S.state = 'walk'; say('哼，看在胡萝卜份上', true) }
  if (S.state === 'lying' && S.st >= 25) { S.state = 'walk'; say('缓过来啦，接着干', true) }
}

function pet() {
  if (status.value !== 'playing' || petCdRef.value > 0) return
  ensureAudio()
  petCdRef.value = 2.5
  S.mo = Math.min(100, S.mo + 8)
  if (actx) sfx.pet()
  say(pick(PET_LINES))
  if (S.state === 'strike' && S.mo >= 30) { S.state = 'walk'; say('这还差不多', true) }
}

function onCanvasClick(e) {
  if (status.value !== 'playing') return
  const rect = canvasEl.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * SIZE
  const y = ((e.clientY - rect.top) / rect.height) * SIZE
  const dx = CX + ORBIT * Math.cos(S.angle)
  const dy = CY + ORBIT * Math.sin(S.angle)
  if (Math.hypot(x - dx, y - dy) < 40) whip()
  else if (Math.hypot(x - CX, y - CY) < 52) grain()
}

function onKey(e) {
  if (e.repeat) return
  const k = e.key.toLowerCase()
  if (k === ' ') { e.preventDefault(); whip() }
  else if (k === 'g') grain()
  else if (k === 'c') carrot()
  else if (k === 'p') pet()
}

// ---------- 回合流程 ----------
function startRound() {
  S.angle = -Math.PI / 2
  S.st = 100
  S.mo = 70
  S.hopper = Math.min(hopCap.value, 8)
  S.flour = 0
  S.timeLeft = roundTime.value
  S.whipGlow = 0
  S.whipFlash = 0
  S.state = 'walk'
  S.bubble = null
  S.floats = []
  S.prints = []
  S.dust = []
  msg.value = ''
  st.value = 100
  mo.value = 70
  hopNow.value = S.hopper
  flourInt.value = 0
  timeDisp.value = S.timeLeft
  status.value = 'playing'
}

function startRun() {
  ensureAudio()
  startRound()
}

function retry() { startRound() }

function restartAll() {
  round.value = 1
  money.value = 8
  upgrades.forEach((u) => { u.lv = 0 })
  status.value = 'intro'
}

function nextRound() {
  round.value += 1
  if (round.value > bestRound.value) { bestRound.value = round.value; saveBest() }
  startRound()
}

function buy(u) {
  const p = price(u)
  if (money.value < p || u.lv >= u.max) return
  money.value -= p
  u.lv += 1
  ensureAudio()
  if (actx) sfx.coin()
}

function finishRound() {
  const bags = Math.floor(S.flour)
  const base = bags * BAG_PRICE
  const bonus = Math.max(0, Math.round(S.timeLeft * 0.5))
  money.value += base + bonus
  lastResult.value = { bags, base, bonus, total: base + bonus, line: pick(SUCCESS_LINES) }
  // 提前 return 不走循环末尾的镜像同步，这里补上，避免订单栏停在 7/8
  flourInt.value = bags
  timeDisp.value = Math.ceil(S.timeLeft)
  status.value = 'result'
  if (actx) sfx.win()
}

// ---------- 模拟 ----------
function sim(dt, now) {
  if (S.bubbleCd > 0) S.bubbleCd -= dt
  if (petCdRef.value > 0) petCdRef.value = Math.max(0, petCdRef.value - dt)
  S.whipGlow = Math.max(0, S.whipGlow - dt / 1.2)
  S.whipFlash = Math.max(0, S.whipFlash - dt / 0.35)
  S.bagPulse = Math.max(0, S.bagPulse - dt * 3)

  let omega = 0
  if (S.state === 'lying') {
    S.st = Math.min(100, S.st + 6 * dt)
    if (S.st >= 25) { S.state = 'walk'; say('缓过来啦，接着干', true) }
  } else if (S.state === 'strike') {
    // 只等安抚，速度为 0
  } else {
    const staminaF = 0.3 + 0.7 * (S.st / 100)
    const moodF = 0.55 + 0.45 * (S.mo / 100)
    const speedF = Math.max(0, staminaF * moodF * (1 + 0.45 * S.whipGlow))
    omega = OMEGA_MAX * speedF
    if (speedF < 0.55 && S.whipGlow < 0.05 && now - S.lastWhip > 4) {
      S.st = Math.min(100, S.st + 2.5 * dt)
    } else {
      S.st = Math.max(0, S.st - 2.2 * speedF * dt)
    }
    if (now - S.lastWhip > 4 && S.mo < 70) S.mo = Math.min(70, S.mo + 0.9 * dt)
    if (S.st <= 0) {
      S.state = 'lying'
      S.mo = Math.max(0, S.mo - 5)
      say(pick(['腿软了…歇会儿…', '四条腿全是劲，可惜不是我的']), true)
      if (actx) sfx.sad()
    } else if (S.mo <= 12) {
      S.state = 'strike'
      say(pick(STRIKE_LINES), true)
      if (actx) sfx.bray()
    } else if (omega > 0 && S.hopper <= 0 && Math.random() < dt * 0.5) {
      say(pick(EMPTY_LINES))
    }
  }

  if (omega > 0) {
    const prev = S.angle
    S.angle += omega * dt
    S.walkPhase += omega * dt * (ORBIT / 10) // 步频随速度
    const lapFrac = (S.angle - prev) / (Math.PI * 2)

    // 磨面：满圈耗 2 瓢产 bagPerLap 袋，磨眼空则干转
    if (S.hopper > 0) {
      const consumed = Math.min(S.hopper, 2 * lapFrac)
      S.hopper -= consumed
      const bags = (1 + 0.2 * lv('yield')) * (consumed / 2)
      const before = Math.floor(S.flour)
      S.flour += bags
      if (Math.floor(S.flour) > before) {
        S.bagPulse = 1
        if (actx) sfx.ding()
        addFloat(CX + Math.cos(SPOUT_ANGLE) * 126, CY + Math.sin(SPOUT_ANGLE) * 126 + 6, '+1 袋', '#8a6a42')
      }
      if (Math.floor(S.flour) >= target.value) { finishRound(); return }
    }

    // 蹄印
    S.stepAcc += omega * dt
    if (S.stepAcc > Math.PI / 6) {
      S.stepAcc -= Math.PI / 6
      S.stepSide ^= 1
      if (actx) sfx.hoof()
      const px = CX + ORBIT * Math.cos(S.angle)
      const py = CY + ORBIT * Math.sin(S.angle)
      const lateral = S.stepSide ? 7 : -7
      S.prints.push({ x: px + Math.cos(S.angle + Math.PI / 2) * lateral, y: py + Math.sin(S.angle + Math.PI / 2) * lateral, a: S.angle + Math.PI / 2, age: 0 })
      if (S.prints.length > 42) S.prints.shift()
    }

    // 鞭策扬尘
    if (S.whipGlow > 0.35) {
      S.dustAcc += dt
      if (S.dustAcc > 0.09) {
        S.dustAcc = 0
        S.dust.push({ x: CX + ORBIT * Math.cos(S.angle) - Math.cos(S.angle + Math.PI / 2) * 22, y: CY + ORBIT * Math.sin(S.angle) - Math.sin(S.angle + Math.PI / 2) * 22, r: 3, age: 0 })
        if (S.dust.length > 14) S.dust.shift()
      }
    }
  }

  S.timeLeft -= dt
  if (S.timeLeft <= 0) {
    S.timeLeft = 0
    timeDisp.value = 0
    status.value = 'fail'
    if (actx) sfx.sad()
    return
  }

  // 粒子老化
  S.floats.forEach((f) => { f.age += dt; f.y -= 30 * dt })
  S.floats = S.floats.filter((f) => f.age < 1.2)
  S.prints.forEach((p) => { p.age += dt })
  S.prints = S.prints.filter((p) => p.age < 5)
  S.dust.forEach((d) => { d.age += dt; d.r += 14 * dt })
  S.dust = S.dust.filter((d) => d.age < 0.7)
  if (S.bubble && now - S.bubble.born > 2.8) S.bubble = null

  // HUD 镜像
  st.value = S.st
  mo.value = S.mo
  hopNow.value = S.hopper
  flourInt.value = Math.floor(S.flour)
  timeDisp.value = Math.ceil(S.timeLeft)
}

// ---------- 绘制 ----------
function roundRectPath(c, x, y, w, h, r) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

// 装饰物位置（避开磨道 104-152 半径圈）
const deco = [
  [70, 60, 'g'], [390, 74, 'g'], [60, 380, 'g'], [410, 396, 'g'],
  [230, 42, 'g'], [36, 220, 's'], [448, 240, 'g'], [140, 446, 's'],
  [330, 440, 'g'], [440, 140, 's']
]

function drawDonkey(c, t) {
  const dx = CX + ORBIT * Math.cos(S.angle)
  const dy = CY + ORBIT * Math.sin(S.angle)
  const facing = S.angle + Math.PI / 2 // 沿轨道切线朝向
  const walking = S.state === 'walk'
  const bob = walking ? Math.abs(Math.sin(S.walkPhase)) * 1.6 : 0
  const headDrop = S.state === 'lying' ? 3 : 0

  c.save()
  c.translate(dx, dy)
  c.scale(1.18, 1.18) // 驴整体放大一点更醒目

  c.save()
  c.rotate(facing)

  // 影子
  c.fillStyle = 'rgba(60,45,20,0.16)'
  c.beginPath()
  c.ellipse(0, 5, S.state === 'lying' ? 30 : 24, 11, 0, 0, Math.PI * 2)
  c.fill()

  // 腿
  const legSwing = walking ? Math.sin(S.walkPhase) * 0.55 : 0
  c.lineWidth = 5
  c.lineCap = 'round'
  c.strokeStyle = '#8f887c'
  if (S.state !== 'lying') {
    // 四条腿：前后各一对，对角摆动
    ;[[-13, -8, legSwing], [-13, 8, -legSwing], [12, -8, -legSwing], [12, 8, legSwing]].forEach(([lx, ly, sw]) => {
      c.beginPath()
      c.moveTo(lx, ly)
      c.lineTo(lx + Math.sin(sw) * 9, ly + Math.cos(sw) * 3)
      c.stroke()
    })
  } else {
    // 趴窝：腿摊开
    ;[[-18, -13], [-18, 13], [16, -13], [16, 13]].forEach(([lx, ly]) => {
      c.beginPath()
      c.moveTo(lx * 0.6, ly * 0.5)
      c.lineTo(lx, ly)
      c.stroke()
    })
  }

  // 尾巴
  const tailSway = Math.sin(t * 2.4) * 0.35 + (S.mo < 40 ? 0.3 : 0)
  c.strokeStyle = '#7a7266'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(-20, 0)
  c.quadraticCurveTo(-28, Math.sin(t * 2.4) * 4, -30 - Math.abs(tailSway) * 3, tailSway * 8)
  c.stroke()
  c.fillStyle = '#5f574c'
  c.beginPath()
  c.arc(-30 - Math.abs(tailSway) * 3, tailSway * 8, 3.4, 0, Math.PI * 2)
  c.fill()

  // 身体
  c.fillStyle = '#a49a8b'
  c.strokeStyle = '#6f675b'
  c.lineWidth = 1.5
  c.beginPath()
  c.ellipse(0, -bob, S.state === 'lying' ? 25 : 20, S.state === 'lying' ? 14 : 11.5, 0, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  // 背中线（驴的标志性条纹）
  c.strokeStyle = 'rgba(95,87,76,0.65)'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(-16, -bob)
  c.lineTo(14, -bob)
  c.stroke()

  // 颈 + 头
  c.fillStyle = '#a49a8b'
  c.strokeStyle = '#6f675b'
  c.lineWidth = 1.5
  c.beginPath()
  c.ellipse(22, -bob, 10, 7.5, 0.08, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  c.beginPath()
  c.ellipse(32, -bob - headDrop, 9, 6, 0, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  // 白鼻头
  c.fillStyle = '#ddd6c9'
  c.beginPath()
  c.ellipse(38, -bob - headDrop, 4.5, 4.4, 0, 0, Math.PI * 2)
  c.fill()
  // 蒙眼布
  c.fillStyle = '#b03a2e'
  c.save()
  c.translate(29, -bob - headDrop)
  roundRectPath(c, -3, -6.5, 6, 13, 2)
  c.fill()
  c.restore()
  // 耳朵：心情越差越往后背
  const spread = 0.5 + (S.mo / 100) * 0.45 + Math.sin(t * 7) * 0.06
  c.fillStyle = '#8f887c'
  ;[1, -1].forEach((side) => {
    c.save()
    c.translate(26, -bob + side * 4.5 - headDrop)
    c.rotate(-side * spread)
    c.beginPath()
    c.ellipse(0, -side * 5.5, 2.6, 6, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  })
  // 鬃毛
  c.strokeStyle = '#5f574c'
  c.lineWidth = 3.5
  c.beginPath()
  c.moveTo(15, -bob)
  c.lineTo(25, -bob)
  c.stroke()

  c.restore() // facing

  // 鞭痕闪光
  if (S.whipFlash > 0) {
    c.save()
    c.rotate(facing)
    c.strokeStyle = `rgba(255,255,255,${S.whipFlash})`
    c.lineWidth = 3
    c.beginPath()
    c.arc(-6, 0, 24, -0.9, 0.9)
    c.stroke()
    c.beginPath()
    c.arc(-6, 0, 30, -0.6, 0.6)
    c.stroke()
    c.restore()
    c.fillStyle = '#c0392b'
    c.font = 'bold 15px system-ui, sans-serif'
    c.textAlign = 'center'
    c.fillText('啪!', dx, dy - 34 - (1 - S.whipFlash) * 8)
  }

  // 提速线
  if (S.whipGlow > 0.25 && S.state === 'walk') {
    c.strokeStyle = `rgba(255,255,255,${S.whipGlow * 0.5})`
    c.lineWidth = 2
    c.save()
    c.rotate(facing)
    ;[-6, 0, 6].forEach((oy) => {
      c.beginPath()
      c.moveTo(-26, oy)
      c.lineTo(-40 - S.whipGlow * 8, oy)
      c.stroke()
    })
    c.restore()
  }

  c.restore()
}

function drawScene(t) {
  const c = ctx
  c.clearRect(0, 0, SIZE, SIZE)

  // 场院泥地
  const bg = c.createRadialGradient(CX, CY, 40, CX, CY, 320)
  bg.addColorStop(0, '#dcbf88')
  bg.addColorStop(1, '#c2a269')
  c.fillStyle = bg
  c.fillRect(0, 0, SIZE, SIZE)

  // 踩实的环形磨道
  c.strokeStyle = 'rgba(90,70,40,0.10)'
  c.lineWidth = 34
  c.beginPath()
  c.arc(CX, CY, ORBIT, 0, Math.PI * 2)
  c.stroke()

  // 蹄印
  S.prints.forEach((p) => {
    c.save()
    c.translate(p.x, p.y)
    c.rotate(p.a)
    c.fillStyle = `rgba(80,60,35,${0.16 * (1 - p.age / 5)})`
    c.beginPath()
    c.ellipse(0, 0, 4.5, 2.4, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
  })

  // 草丛与石子
  deco.forEach(([gx, gy, type]) => {
    if (type === 'g') {
      c.strokeStyle = '#7f9c5a'
      c.lineWidth = 1.6
      for (let i = -1; i <= 1; i++) {
        c.beginPath()
        c.moveTo(gx, gy)
        c.lineTo(gx + i * 4, gy - 8 + Math.abs(i) * 2)
        c.stroke()
      }
    } else {
      c.fillStyle = '#a89f92'
      c.beginPath()
      c.ellipse(gx, gy, 5, 3.5, 0.5, 0, Math.PI * 2)
      c.fill()
    }
  })

  // 磨台基座
  c.fillStyle = '#b7a98e'
  c.beginPath()
  c.arc(CX, CY, 94, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = 'rgba(90,70,40,0.25)'
  c.lineWidth = 2
  c.stroke()

  // 出面口 + 面袋
  const sx = CX + Math.cos(SPOUT_ANGLE) * 78
  const sy = CY + Math.sin(SPOUT_ANGLE) * 78
  const ex = CX + Math.cos(SPOUT_ANGLE) * 104
  const ey = CY + Math.sin(SPOUT_ANGLE) * 104
  c.strokeStyle = '#7a5c38'
  c.lineWidth = 9
  c.lineCap = 'butt'
  c.beginPath()
  c.moveTo(sx, sy)
  c.lineTo(ex, ey)
  c.stroke()
  if (status.value === 'playing' && S.state === 'walk' && S.hopper > 0) {
    c.fillStyle = 'rgba(248,244,232,0.95)'
    for (let i = 0; i < 3; i++) {
      const frac = (t * 1.6 + i / 3) % 1
      c.beginPath()
      c.arc(sx + (ex - sx) * frac, sy + (ey - sy) * frac, 1.8, 0, Math.PI * 2)
      c.fill()
    }
  }
  const bagX = CX + Math.cos(SPOUT_ANGLE) * 126
  const bagY = CY + Math.sin(SPOUT_ANGLE) * 126
  const pulse = 1 + S.bagPulse * 0.12
  c.save()
  c.translate(bagX, bagY)
  c.scale(pulse, pulse)
  c.fillStyle = '#cbb289'
  c.strokeStyle = '#8a6a42'
  c.lineWidth = 1.5
  roundRectPath(c, -13, -15, 26, 30, 6)
  c.fill()
  c.stroke()
  const fillFrac = S.flour % 1
  if (fillFrac > 0.03) {
    c.fillStyle = '#f5f1e6'
    roundRectPath(c, -10, 12 - 22 * fillFrac, 20, 22 * fillFrac, 4)
    c.fill()
  }
  c.strokeStyle = '#8a6a42'
  c.beginPath()
  c.moveTo(-9, -15)
  c.lineTo(9, -15)
  c.stroke()
  c.restore()

  // 下扇磨盘
  c.fillStyle = '#b3ab9d'
  c.beginPath()
  c.arc(CX, CY, 68, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#948b7c'
  c.lineWidth = 3
  c.stroke()

  // 上扇磨盘（随驴转动）
  c.fillStyle = '#c4bcac'
  c.beginPath()
  c.arc(CX, CY, 58, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#9d9484'
  c.lineWidth = 6
  c.stroke()
  c.save()
  c.translate(CX, CY)
  c.rotate(S.angle)
  c.strokeStyle = 'rgba(122,112,96,0.55)'
  c.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    c.rotate((Math.PI * 2) / 9)
    c.beginPath()
    c.moveTo(14, 0)
    c.lineTo(52, 0)
    c.stroke()
  }
  c.restore()
  // 磨眼与粮食
  c.fillStyle = '#4a4038'
  c.beginPath()
  c.arc(CX, CY, 9, 0, Math.PI * 2)
  c.fill()
  if (S.hopper > 0) {
    c.fillStyle = '#d9b36b'
    c.beginPath()
    c.arc(CX, CY, 4 + 4.5 * Math.sqrt(S.hopper / hopCap.value), 0, Math.PI * 2)
    c.fill()
  }

  // 磨杆：中心 → 驴
  const ddx = CX + ORBIT * Math.cos(S.angle)
  const ddy = CY + ORBIT * Math.sin(S.angle)
  c.strokeStyle = '#8a6a42'
  c.lineWidth = 8
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(CX, CY)
  c.lineTo(ddx, ddy)
  c.stroke()
  c.strokeStyle = 'rgba(60,42,22,0.4)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(CX, CY)
  c.lineTo(ddx, ddy)
  c.stroke()
  // 中心轴帽
  c.fillStyle = '#6b4f2a'
  c.beginPath()
  c.arc(CX, CY, 11, 0, Math.PI * 2)
  c.fill()

  // 扬尘
  S.dust.forEach((d) => {
    c.fillStyle = `rgba(190,160,110,${0.4 * (1 - d.age / 0.7)})`
    c.beginPath()
    c.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    c.fill()
  })

  drawDonkey(c, t)

  // 飘字
  S.floats.forEach((f) => {
    c.fillStyle = f.color
    c.globalAlpha = Math.max(0, 1 - f.age / 1.2)
    c.font = 'bold 14px system-ui, sans-serif'
    c.textAlign = 'center'
    c.fillText(f.text, f.x, f.y)
    c.globalAlpha = 1
  })

  // 驴语气泡
  if (S.bubble) {
    c.font = '13px system-ui, sans-serif'
    const w = c.measureText(S.bubble.text).width + 18
    const bx = Math.max(w / 2 + 6, Math.min(SIZE - w / 2 - 6, ddx))
    const by = Math.max(30, ddy - 58)
    c.fillStyle = 'rgba(255,255,255,0.94)'
    c.strokeStyle = '#d8cbb2'
    c.lineWidth = 1.5
    roundRectPath(c, bx - w / 2, by - 16, w, 28, 9)
    c.fill()
    c.stroke()
    c.beginPath()
    c.moveTo(ddx - 5, by + 11)
    c.lineTo(ddx + 5, by + 11)
    c.lineTo(ddx, by + 20)
    c.closePath()
    c.fillStyle = 'rgba(255,255,255,0.94)'
    c.fill()
    c.fillStyle = '#4a4038'
    c.textAlign = 'center'
    c.fillText(S.bubble.text, bx, by + 3)
  }
}

// ---------- 主循环 ----------
let ctx = null
let rafId = 0
let lastTs = 0

function loop(ts) {
  rafId = requestAnimationFrame(loop)
  const t = ts / 1000
  let dt = lastTs ? t - lastTs : 0.016
  lastTs = t
  if (dt > 0.05) dt = 0.05
  if (status.value === 'playing') sim(dt, t)
  // 磨盘声随转速
  if (grindGain && actx) {
    const goal = status.value === 'playing' && S.state === 'walk' && S.hopper > 0
      ? Math.min(0.13, 0.02 + 0.09 * S.whipGlow + 0.05 * (S.st / 100))
      : 0
    grindGain.gain.value += (goal - grindGain.gain.value) * Math.min(1, dt * 8)
  }
  if (ctx) drawScene(t)
}

onMounted(() => {
  loadStore()
  const canvas = canvasEl.value
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = SIZE * dpr
  canvas.height = SIZE * dpr
  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  window.addEventListener('keydown', onKey)
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKey)
  if (grindGain) grindGain.gain.value = 0
})
</script>

<style scoped>
.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  margin: 14px 0 2px;
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.dm-header h1 {
  margin: 0 0 6px;
}

.dm-sub {
  margin: 0;
  color: var(--muted);
}

.dm-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 6px;
}

.dm-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 26px;
  padding: 12px 18px;
  margin: 14px 0;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat span {
  color: var(--muted);
  font-size: 0.78rem;
}

.stat strong {
  font-size: 1.05rem;
}

.stat strong.danger {
  color: #c0392b;
}

.dm-main {
  display: flex;
  gap: 14px;
  align-items: stretch;
}

.dm-scene {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dm-scene canvas {
  width: 100%;
  max-width: 560px;
  aspect-ratio: 1;
  height: auto;
  border-radius: var(--radius-sm);
  touch-action: manipulation;
}

.dm-hint {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: rgba(40, 32, 20, 0.78);
  color: #ffe9c2;
  font-size: 0.86rem;
  white-space: nowrap;
  pointer-events: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 44, 26, 0.45);
  border-radius: var(--radius);
  z-index: 5;
  padding: 14px;
}

.dm-box {
  max-width: 420px;
  width: 100%;
  max-height: 100%;
  overflow: auto;
  padding: 20px 22px;
  text-align: center;
}

.dm-face {
  font-size: 2.4rem;
  margin: 0;
}

.dm-box h2 {
  margin: 4px 0 10px;
}

.dm-rules {
  text-align: left;
  margin: 0 0 14px;
  padding-left: 20px;
  color: var(--muted);
  line-height: 1.7;
  font-size: 0.9rem;
}

.dm-earn {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.dm-earn-total {
  margin: 6px 0 2px;
  font-size: 1.1rem;
}

.dm-earn-total b {
  color: #b8860b;
}

.dm-say {
  margin: 6px 0 12px;
  color: var(--muted);
  font-size: 0.88rem;
}

.dm-keep {
  color: var(--muted);
  font-size: 0.88rem;
  margin: 8px 0 12px;
}

.dm-shop {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.shop-item {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto auto;
  column-gap: 8px;
  align-items: center;
  text-align: left;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  cursor: pointer;
  font: inherit;
}

.shop-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shop-item:not(:disabled):hover {
  border-color: var(--primary);
}

.shop-icon {
  grid-row: 1 / 3;
  font-size: 1.5rem;
}

.shop-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.shop-name em {
  font-style: normal;
  color: var(--primary);
  font-size: 0.78rem;
  margin-left: 4px;
}

.shop-desc {
  grid-column: 2;
  color: var(--muted);
  font-size: 0.76rem;
}

.shop-price {
  grid-column: 2;
  color: #b8860b;
  font-size: 0.8rem;
  font-weight: 700;
}

.dm-panel {
  width: 250px;
  flex-shrink: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.86rem;
  font-weight: 700;
}

.panel-title em {
  font-style: normal;
  color: var(--muted);
  font-weight: 400;
  font-size: 0.78rem;
}

.bar {
  height: 12px;
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.15s linear;
}

.bar-fill.grain {
  background: #d9a441;
}

.bar-fill.stamina {
  background: #4c9e57;
}

.bar-fill.mood {
  background: #e08a3c;
}

.bar-fill.low {
  background: #c0392b;
  animation: dm-blink 0.9s infinite;
}

@keyframes dm-blink {
  50% { opacity: 0.55; }
}

.dm-state {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.dm-ops {
  gap: 9px;
}

.btn.act {
  padding: 10px 12px;
  font-size: 0.95rem;
}

.btn.act:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.grain-btn {
  background: #f3e2bd;
  border-color: #d9b36b;
  color: #6b4f2a;
  font-weight: 700;
}

.btn.grain-btn:hover {
  background: #eed7a8;
}

.dm-msg {
  margin: 0;
  color: #b03a2e;
  font-size: 0.82rem;
  min-height: 1.2em;
}

.dm-help {
  margin-top: 14px;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.8;
}

@media (max-width: 860px) {
  .dm-main {
    flex-direction: column;
  }

  .dm-panel {
    width: 100%;
  }

  .dm-ops {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .dm-shop {
    grid-template-columns: 1fr;
  }
}
</style>
