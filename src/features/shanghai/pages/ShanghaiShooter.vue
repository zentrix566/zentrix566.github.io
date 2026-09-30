<template>
  <section class="section page-section sh-page">
    <div class="container">
      <header class="sh-header">
        <div>
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <p class="eyebrow">Shanghai 1937 · Rail Shooter</p>
          <h1>🎖️ 血战上海滩2</h1>
          <p class="sh-sub">
            1937 年淞沪战场，鼠标就是枪。从闸北街头一路杀进虹口司令部——
            致敬目标软件 2003 年经典《血战上海滩》，主角还是那个华成龙。
          </p>
        </div>
        <div class="sh-actions">
          <button class="btn ghost" @click="toggleMute">{{ muted ? '🔇 音效关' : '🔊 音效开' }}</button>
          <button class="btn ghost" :class="{ 'cheat-on': cheatMode }" @click="toggleCheat">{{ cheatMode ? '😈 作弊开' : '😈 作弊关' }}</button>
          <button class="btn ghost" @click="togglePause" :disabled="!canPause">{{ paused ? '▶ 继续' : '⏸ 暂停' }}</button>
          <button class="btn ghost" @click="restart">↻ 重新开始</button>
        </div>
      </header>

      <div class="sh-stats card" v-if="s">
        <div class="stat"><span>关卡</span><strong>{{ s.stageIndex + 1 }} / {{ s.stageCount }}</strong></div>
        <div class="stat"><span>得分</span><strong>{{ s.score }}<em v-if="s.cheat" class="cheat-badge">😈 作弊中</em></strong></div>
        <div class="stat"><span>击杀</span><strong>{{ s.kills }}</strong></div>
        <div class="stat"><span>爆头</span><strong>{{ s.headshots }}</strong></div>
        <div class="stat"><span>命中率</span><strong>{{ accuracy }}%</strong></div>
        <div class="stat"><span>最高分</span><strong>{{ best }}<em v-if="newRecord" class="record">新纪录!</em></strong></div>
      </div>

      <div class="sh-stage card">
        <canvas
          ref="canvasEl"
          @pointermove="onMove"
          @pointerdown="onDown"
          @pointerup="onUp"
          @pointercancel="onUp"
          @pointerleave="onUp"
          @contextmenu.prevent
        ></canvas>

        <!-- 战斗 HUD -->
        <div class="hud" v-if="s && s.phase === 'combat'">
          <div class="hud-vitals">
            <div class="bar hp">
              <i :class="hpCls" :style="{ width: (s.hp / s.maxHp) * 100 + '%' }"></i>
              <span>体力 {{ s.hp }} / {{ s.maxHp }}</span>
            </div>
            <div class="bar st">
              <i :class="{ exhaust: s.exhaust }" :style="{ width: s.stamina + '%' }"></i>
            </div>
            <span v-if="s.crouch" class="tag">🛡 蹲伏中 · 松开 Space 起身</span>
            <span v-else-if="s.exhaust" class="tag warn">体力透支！</span>
            <span v-else class="tag dim">按住 Space 蹲掩体躲子弹</span>
          </div>
          <div class="hud-weapons">
            <button
              v-for="(w, i) in s.weapons"
              :key="w.id"
              class="wslot"
              :class="{ active: s.weaponIdx === i, empty: i !== 3 && w.magNow <= 0 && w.reserve <= 0 }"
              @click.stop.prevent="pickWeapon(i)"
            >
              <b>{{ i + 1 }} · {{ w.short }}</b>
              <span v-if="i === 3">× {{ s.cheat ? '∞' : s.nades }}</span>
              <span v-else-if="w.reserve < 0">{{ w.magNow }} / ∞</span>
              <span v-else>{{ w.magNow }} / {{ w.reserve }}</span>
            </button>
          </div>
        </div>

        <!-- 主菜单 -->
        <div class="overlay" v-if="s && s.phase === 'idle'">
          <div class="panel">
            <p class="p-kicker">上海 1937 · 淞沪会战</p>
            <h2>血战上海滩 <i>2</i></h2>
            <p class="p-story">
              炮火炸开了闸北的夜。日军登陆吴淞，先头部队已渗透进市区。
              华成龙带着一梭子驳壳枪弹，从街头巷尾一路打到虹口司令部——
              四关，一条街一条街地夺回来。
            </p>
            <ul class="p-tips">
              <li>🖱️ 鼠标瞄准，左键射击；冲锋枪 / 轻机枪可按住连发</li>
              <li>🔢 数字键 1-4 换武器，R 装填；打爆补给箱即拾取</li>
              <li>🛡️ 按住 Space 蹲掩体躲子弹（手榴弹与刺刀躲不了！）</li>
              <li>💣 掷弹筒扔来的手榴弹可以在半空打爆，+50 分</li>
            </ul>
            <p class="p-best">最高分 <b>{{ best }}</b></p>
            <button class="btn primary big" @click="start(0)">🎖 从第一关开始</button>
            <p class="p-select">跳关模式 · 直接从任意一关开打</p>
            <div class="p-stages">
              <button
                v-for="(st, i) in stageNames"
                :key="st"
                class="stage-pick"
                @click="start(i)"
              ><b>{{ i + 1 }}</b>{{ st }}</button>
            </div>
            <p class="p-credit">本游戏为原创致敬之作，剧情人物纯属虚构，铭记 1937。</p>
          </div>
        </div>

        <!-- 关前简报 -->
        <div class="overlay" v-if="s && s.phase === 'briefing'">
          <div class="panel">
            <p class="p-kicker">{{ s.stageDate }}</p>
            <h2>{{ s.stageFull }}</h2>
            <p class="p-story">{{ s.story }}</p>
            <button class="btn primary big" @click="begin">进入战场 →</button>
          </div>
        </div>

        <!-- 过关 -->
        <div class="overlay" v-if="s && s.phase === 'clear'">
          <div class="panel">
            <p class="p-kicker">{{ s.stageFull }} · 完成</p>
            <h2>✅ 拿下了</h2>
            <p class="p-story">
              本关击杀 <b>{{ s.stageKills }}</b> 人 · 命中率 <b>{{ accuracy }}%</b>
              · 部队休整，体力回复 <b>+35</b>
            </p>
            <button class="btn primary big" @click="advance">
              {{ s.stageIndex + 1 >= s.stageCount ? '乘胜追击 →' : '继续前进 →' }}
            </button>
          </div>
        </div>

        <!-- 败北 -->
        <div class="overlay" v-if="s && s.phase === 'over'">
          <div class="panel">
            <p class="p-kicker">{{ s.stageFull }}</p>
            <h2>🎖 华成龙倒在了半路…</h2>
            <p class="p-story">
              本次得分 <b>{{ s.score }}</b> ｜ 击杀 <b>{{ s.kills }}</b> ·
              爆头 <b>{{ s.headshots }}</b> · 命中率 <b>{{ accuracy }}%</b><br />
              最高分 <b>{{ best }}</b>
            </p>
            <p v-if="s.cheated" class="p-cheat">😈 本局开过作弊，成绩不计入最高分</p>
            <div class="p-btns">
              <button class="btn primary big" @click="restart">再战一次</button>
              <button class="btn ghost big" @click="toMenu">返回菜单</button>
            </div>
          </div>
        </div>

        <!-- 通关 -->
        <div class="overlay" v-if="s && s.phase === 'win'">
          <div class="panel">
            <p class="p-kicker">1937 · 上海</p>
            <h2>🎆 大捷！</h2>
            <p class="p-story">
              虹口司令部的旗落了下来。总得分 <b>{{ s.score }}</b> ｜
              击杀 <b>{{ s.kills }}</b> · 爆头 <b>{{ s.headshots }}</b> ·
              命中率 <b>{{ accuracy }}%</b><br />
              最高分 <b>{{ best }}</b> —— 岁月无声，山河记得。
            </p>
            <p v-if="s.cheated" class="p-cheat">😈 本局开过作弊，成绩不计入最高分</p>
            <div class="p-btns">
              <button class="btn primary big" @click="restart">再打一遍</button>
              <button class="btn ghost big" @click="toMenu">返回菜单</button>
            </div>
          </div>
        </div>

        <!-- 暂停 -->
        <div class="overlay" v-if="paused">
          <div class="panel">
            <h2>⏸ 暂停中</h2>
            <p class="p-story">枪不会自己响。按 Esc 或点下面继续。</p>
            <div class="p-btns">
              <button class="btn primary big" @click="togglePause">▶ 继续作战</button>
              <button class="btn ghost big" @click="skipStage">⏭ 跳过本关</button>
            </div>
          </div>
        </div>
      </div>

      <p class="sh-help">
        <b>操作</b>：鼠标瞄准 · 左键射击（冲锋枪/轻机枪可按住连发）· 数字键 1-4 切换武器 ·
        R 装填 · 按住 <b>Space</b> 蹲掩体（躲子弹，躲不了手榴弹与刺刀）· <b>Esc</b> 暂停。
        <b>提示</b>：瞄准时准星变红即是爆头位；补给箱打一枪就到手；
        敌兵枪口红光越亮说明越快开火，先下手为强。
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ShanghaiGame } from '../game/engine.js'
import { Sfx } from '../game/audio.js'
import { STAGES } from '../game/stages.js'

const BEST_KEY = 'shanghai:best-score'
const MUTE_KEY = 'shanghai:muted'
const CHEAT_KEY = 'shanghai:cheat'

const canvasEl = ref(null)
const s = ref(null)
const best = ref(Number(localStorage.getItem(BEST_KEY) || 0))
const muted = ref(localStorage.getItem(MUTE_KEY) === '1')
const cheatMode = ref(localStorage.getItem(CHEAT_KEY) === '1')
const newRecord = ref(false)
const stageNames = STAGES.map((st) => st.name)

let engine = null
let sfx = null

const accuracy = computed(() => {
  if (!s.value || !s.value.shots) return 0
  return Math.round((s.value.hits / s.value.shots) * 100)
})
const hpCls = computed(() => {
  if (!s.value) return 'ok'
  const p = s.value.hp / s.value.maxHp
  return p > 0.5 ? 'ok' : p > 0.25 ? 'warn' : 'bad'
})
const canPause = computed(() => s.value && ['advance', 'combat'].includes(s.value.phase))
const paused = computed(() => !!s.value?.paused)

function onState(snapshot) {
  const prevPhase = s.value?.phase
  s.value = snapshot
  if ((snapshot.phase === 'over' || snapshot.phase === 'win') && prevPhase !== snapshot.phase) {
    if (!snapshot.cheated && snapshot.score > best.value) {
      best.value = snapshot.score
      newRecord.value = true
      localStorage.setItem(BEST_KEY, String(best.value))
    } else {
      newRecord.value = false
    }
  }
  if (snapshot.phase === 'briefing' && prevPhase !== snapshot.phase) newRecord.value = false
}

function canvasPos(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * 960,
    y: ((e.clientY - rect.top) / rect.height) * 540
  }
}
function onMove(e) {
  const p = canvasPos(e)
  engine?.aim(p.x, p.y)
}
function onDown(e) {
  sfx?.ensure()
  const p = canvasPos(e)
  engine?.aim(p.x, p.y)
  engine?.trigger(true)
}
function onUp() {
  engine?.trigger(false)
}

function onKeyDown(e) {
  if (e.code === 'Space') {
    if (s.value && ['advance', 'combat'].includes(s.value.phase)) e.preventDefault()
    engine?.key('Space', true)
    return
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    engine?.togglePause()
    return
  }
  engine?.key(e.code, true)
}
function onKeyUp(e) {
  if (e.code === 'Space') engine?.key('Space', false)
}

function onVis() {
  if (document.hidden) engine?.setPaused(true)
}

function toggleMute() {
  muted.value = !muted.value
  localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0')
  sfx?.setMuted(muted.value)
}
function toggleCheat() {
  cheatMode.value = !cheatMode.value
  localStorage.setItem(CHEAT_KEY, cheatMode.value ? '1' : '0')
  engine?.setCheat(cheatMode.value)
}
function skipStage() {
  engine?.skipStage()
}
function togglePause() {
  engine?.togglePause()
}
function restart() {
  sfx?.ensure()
  newRecord.value = false
  engine?.retry()
}
function toMenu() {
  engine?.backToMenu()
}
function start(fromStage = 0) {
  sfx?.ensure()
  newRecord.value = false
  engine?.startRun(fromStage)
}
function begin() {
  engine?.beginStage()
}
function advance() {
  engine?.nextStage()
}
function pickWeapon(i) {
  engine?.selectWeapon(i)
}

onMounted(() => {
  sfx = new Sfx()
  sfx.setMuted(muted.value)
  engine = new ShanghaiGame(canvasEl.value, sfx, onState)
  engine.setCheat(cheatMode.value)
  if (import.meta.env.DEV) window.__shGame = engine // 调试用，构建时不暴露
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVis)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('visibilitychange', onVis)
  engine?.destroy()
  engine = null
  sfx = null
})
</script>

<style scoped>
.sh-page {
  --sh-gold: #e8c56a;
  --sh-red: #b03a30;
}
.sh-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.sh-sub {
  color: var(--muted, #8a8578);
  max-width: 620px;
  margin: 6px 0 0;
  line-height: 1.7;
}
.sh-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sh-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.stat {
  display: flex;
  flex-direction: column;
  min-width: 76px;
  padding: 2px 10px;
}
.stat span {
  font-size: 12px;
  color: var(--muted, #8a8578);
}
.stat strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.record {
  font-style: normal;
  font-size: 11px;
  color: #ffcf70;
  margin-left: 6px;
}
.cheat-badge {
  font-style: normal;
  font-size: 11px;
  color: #ff8a5c;
  margin-left: 6px;
}
.btn.ghost.cheat-on {
  border-color: #ff8a5c;
  color: #ff8a5c;
}
.sh-stage {
  position: relative;
  padding: 0;
  overflow: hidden;
  background: #0a0806;
}
.sh-stage canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: none;
  touch-action: none;
  user-select: none;
}

/* 战斗 HUD */
.hud {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 26px 14px 10px;
  background: linear-gradient(transparent, rgba(5, 3, 2, 0.78));
  pointer-events: none;
}
.hud-vitals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 240px;
}
.bar {
  position: relative;
  height: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.bar.st {
  height: 7px;
  width: 70%;
}
.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 8px;
  transition: width 0.15s;
}
.bar i.ok {
  background: linear-gradient(90deg, #5d8a3c, #8fbf5a);
}
.bar i.warn {
  background: linear-gradient(90deg, #b07b28, #e0a83c);
}
.bar i.bad {
  background: linear-gradient(90deg, #a02c20, #d8483a);
}
.bar.st i {
  background: linear-gradient(90deg, #3c6a8a, #5c9ac0);
}
.bar.st i.exhaust {
  background: linear-gradient(90deg, #8a2c20, #c0483a);
}
.bar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #f0ead8;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.tag {
  font-size: 12px;
  color: #d8d2c0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.tag.dim {
  color: rgba(216, 210, 192, 0.55);
}
.tag.warn {
  color: #ff8a6a;
}
.hud-weapons {
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.wslot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 86px;
  padding: 6px 10px;
  border: 1px solid rgba(232, 197, 106, 0.35);
  border-radius: 8px;
  background: rgba(10, 8, 5, 0.72);
  color: #e8e2cc;
  font-size: 12px;
  cursor: pointer;
}
.wslot b {
  font-size: 12px;
  font-weight: 600;
}
.wslot span {
  font-variant-numeric: tabular-nums;
  color: var(--sh-gold);
}
.wslot.active {
  border-color: var(--sh-gold);
  background: rgba(60, 44, 16, 0.85);
  box-shadow: 0 0 10px rgba(232, 197, 106, 0.35);
}
.wslot.empty {
  opacity: 0.45;
}

/* 覆盖层 */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 7, 4, 0.68);
  backdrop-filter: blur(2px);
  padding: 18px;
}
.panel {
  max-width: 600px;
  width: 100%;
  max-height: 100%;
  overflow: auto;
  text-align: center;
  color: #efe8d6;
  padding: 22px 26px;
  border: 1px solid rgba(232, 197, 106, 0.4);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(30, 20, 10, 0.92), rgba(16, 10, 6, 0.95));
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
}
.p-kicker {
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--sh-gold);
  margin: 0 0 6px;
}
.panel h2 {
  font-size: 34px;
  margin: 0 0 12px;
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', serif;
  color: var(--sh-gold);
}
.panel h2 i {
  font-style: normal;
  color: #d8483a;
}
.p-story {
  line-height: 1.9;
  font-size: 15px;
  margin: 0 0 14px;
  color: #ddd5c0;
}
.p-story b {
  color: #ffd890;
}
.p-tips {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  font-size: 13.5px;
  line-height: 2;
  color: #cfc8b2;
  text-align: left;
  display: inline-block;
}
.p-best {
  font-size: 14px;
  color: #cfc8b2;
  margin: 0 0 14px;
}
.p-best b {
  color: #ffd890;
  font-size: 18px;
}
.p-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.p-credit {
  margin: 14px 0 0;
  font-size: 12px;
  color: rgba(207, 200, 178, 0.6);
}
.p-cheat {
  font-size: 13px;
  color: #ff8a5c;
  margin: 0 0 12px;
}
.p-select {
  font-size: 13px;
  letter-spacing: 1px;
  color: #cfc8b2;
  margin: 16px 0 8px;
}
.p-stages {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.stage-pick {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid rgba(232, 197, 106, 0.45);
  border-radius: 8px;
  background: rgba(24, 16, 8, 0.8);
  color: #e8e2cc;
  font-size: 13px;
  cursor: pointer;
}
.stage-pick b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(232, 197, 106, 0.85);
  color: #241a0c;
  font-size: 12px;
}
.stage-pick:hover {
  border-color: var(--sh-gold);
  background: rgba(60, 44, 16, 0.85);
}

.sh-help {
  color: var(--muted, #8a8578);
  font-size: 13.5px;
  line-height: 1.9;
  margin-top: 12px;
}
.sh-help b {
  color: inherit;
}

@media (max-width: 720px) {
  .hud {
    flex-direction: column;
    align-items: stretch;
  }
  .hud-weapons {
    justify-content: center;
  }
  .wslot {
    min-width: 0;
    flex: 1;
    padding: 5px 4px;
  }
}
</style>
