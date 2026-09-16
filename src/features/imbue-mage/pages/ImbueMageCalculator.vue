<script setup>
import { computed, ref } from 'vue'
import { calculateScenario } from '../utils/calculator.js'

const skillDamage = ref(8)
const heroHealth = ref(30)
const minionHealths = ref([5, 5, 5])
const simulationRuns = 40000

const cleanMinions = computed(() => minionHealths.value.map((value) => Math.max(1, Math.floor(Number(value)) || 1)))
const minionTotal = computed(() => cleanMinions.value.reduce((sum, health) => sum + health, 0))
const scenarios = computed(() => [
  {
    key: 'apprentice',
    title: '只有鲁莽的学徒',
    badge: '单倍触发',
    result: calculateScenario({
      skillDamage: skillDamage.value,
      heroHealth: heroHealth.value,
      minionHealths: cleanMinions.value,
      multiplier: 1,
      runs: simulationRuns
    })
  },
  {
    key: 'buddy',
    title: '伴唱机 ＋ 鲁莽的学徒',
    badge: '双倍触发',
    result: calculateScenario({
      skillDamage: skillDamage.value,
      heroHealth: heroHealth.value,
      minionHealths: cleanMinions.value,
      multiplier: 2,
      runs: simulationRuns
    })
  }
])

const statusText = {
  guaranteed: '稳斩',
  possible: '概率斩杀',
  impossible: '不能斩杀'
}

function addMinion() {
  if (minionHealths.value.length < 7) minionHealths.value.push(1)
}

function removeMinion(index) {
  minionHealths.value.splice(index, 1)
}

function clearMinions() {
  minionHealths.value = []
}

function percent(value) {
  if (value === 0) return '<0.1%'
  if (value === 1) return '>99.9%'
  if (value < 0.001) return '<0.1%'
  if (value > 0.999) return '>99.9%'
  return `${(value * 100).toFixed(1)}%`
}
</script>

<template>
  <main class="imbue-page">
    <div class="shell">
      <RouterLink class="back imbue-back" to="/">← 返回主页</RouterLink>

      <header class="hero-copy">
        <p class="eyebrow">HEARTHSTONE · IMBUE MAGE</p>
        <h1>灌注法斩杀计算器</h1>
        <p>每次技能把伤害拆成 1 点弹幕，随机打向当前存活的敌方角色。随从死亡后退出目标池，技能伤害在整套连招中保持不变。</p>
      </header>

      <section class="input-panel" aria-label="斩杀参数">
        <div class="core-inputs">
          <label>
            <span>当前技能伤害</span>
            <input v-model.number="skillDamage" type="number" min="1" max="30">
          </label>
          <label>
            <span>敌方英雄血量</span>
            <input v-model.number="heroHealth" type="number" min="1" max="999">
          </label>
          <div class="board-summary">
            <span>敌方场面</span>
            <strong>{{ cleanMinions.length }} 个随从 · 共 {{ minionTotal }} 血</strong>
          </div>
        </div>

        <div class="minion-head">
          <div><span>敌方随从血量</span><small>最多 7 个，顺序不影响计算</small></div>
          <div class="input-actions">
            <button type="button" class="quiet" :disabled="!minionHealths.length" @click="clearMinions">清空</button>
            <button type="button" class="add" :disabled="minionHealths.length >= 7" @click="addMinion">＋ 加随从</button>
          </div>
        </div>

        <div v-if="minionHealths.length" class="minion-grid">
          <label v-for="(_, index) in minionHealths" :key="index" class="minion-input">
            <span>随从 {{ index + 1 }}</span>
            <input v-model.number="minionHealths[index]" type="number" min="1" max="999">
            <button type="button" :aria-label="`移除随从 ${index + 1}`" @click="removeMinion(index)">×</button>
          </label>
        </div>
        <p v-else class="empty-board">对面空场，所有弹幕都只会打向英雄。</p>
      </section>

      <section class="comparison" aria-label="斩杀结果对比">
        <article v-for="scenario in scenarios" :key="scenario.key" class="result-card" :class="scenario.result.status">
          <header>
            <div><small>{{ scenario.badge }}</small><h2>{{ scenario.title }}</h2></div>
            <strong class="verdict">{{ statusText[scenario.result.status] }}</strong>
          </header>

          <div class="damage-number">
            <span v-if="scenario.result.status === 'guaranteed'">至少打脸</span>
            <span v-else-if="scenario.result.status === 'possible'">模拟斩杀率</span>
            <span v-else>最多打脸</span>
            <b v-if="scenario.result.status === 'possible'">{{ percent(scenario.result.lethalProbability) }}</b>
            <b v-else>{{ scenario.result.status === 'guaranteed' ? scenario.result.guaranteedFaceDamage : scenario.result.maximumFaceDamage }}</b>
          </div>

          <div v-if="scenario.result.status === 'possible'" class="chance-bar" aria-hidden="true">
            <i :style="{ width: `${scenario.result.lethalProbability * 100}%` }"></i>
          </div>

          <dl>
            <div><dt>初始敌方角色</dt><dd>{{ scenario.result.targetCount }}</dd></div>
            <div><dt>技能触发</dt><dd>{{ scenario.result.triggerCount }} 次</dd></div>
            <div><dt>总弹幕</dt><dd>{{ scenario.result.totalPings }} 点</dd></div>
            <div><dt>稳打脸下限</dt><dd>{{ scenario.result.guaranteedFaceDamage }} 点</dd></div>
          </dl>

          <p v-if="scenario.result.status === 'guaranteed'" class="result-note">
            就算每个随从都吃满 {{ minionTotal }} 点，剩余 {{ scenario.result.guaranteedFaceDamage }} 点仍足够击杀英雄。
          </p>
          <p v-else-if="scenario.result.status === 'possible'" class="result-note">
            不是稳斩；约 {{ simulationRuns.toLocaleString() }} 次固定样本模拟中，平均对英雄造成 {{ scenario.result.averageFaceDamage.toFixed(1) }} 点有效伤害。
          </p>
          <p v-else class="result-note">
            全部 {{ scenario.result.totalPings }} 点即使一发不分给随从，也不足以击杀 {{ heroHealth }} 血英雄。
          </p>
        </article>
      </section>

      <section class="rule-card">
        <h2>怎么算的</h2>
        <p><code>技能触发次数 = 初始随从数 + 1 个英雄</code>；有伴唱机时再乘 2。每次触发产生“当前技能伤害”枚 1 点弹幕。</p>
        <p><code>稳打脸下限 = 总弹幕 − 所有随从血量</code>。下限不低于英雄血量就是稳斩；只有总弹幕够则是概率斩杀；总弹幕都不够就是不能斩。</p>
        <small>概率斩杀率为随机目标模拟估算值；假定每枚弹幕在当时所有存活敌方角色中等概率选取目标，不计圣盾、减伤、免疫、亡语召唤和其他特殊效果。</small>
      </section>
    </div>
  </main>
</template>

<style scoped>
.imbue-page { min-height: calc(100vh - var(--header-h)); padding: 42px 20px 72px; background: radial-gradient(circle at 12% 6%, rgba(103, 72, 180, .38), transparent 25rem), radial-gradient(circle at 88% 26%, rgba(24, 124, 135, .32), transparent 28rem), #11131d; color: #f6f1e7; }
.shell { max-width: 980px; margin: 0 auto; }
.imbue-back { color: #bbb5c8; }
.imbue-back:hover { color: #fff; }
.hero-copy { margin: 30px 0 25px; }
.eyebrow { margin: 0; color: #e9bd68; font-size: .75rem; font-weight: 900; letter-spacing: .14em; }
.hero-copy h1 { margin: 5px 0 10px; font-size: clamp(2.1rem, 6vw, 3.7rem); letter-spacing: -.045em; }
.hero-copy > p:last-child { max-width: 760px; margin: 0; color: #c3bdca; line-height: 1.7; }
.input-panel, .result-card, .rule-card { border: 1px solid rgba(235, 211, 166, .16); border-radius: 18px; background: rgba(26, 28, 43, .88); box-shadow: 0 22px 50px rgba(0, 0, 0, .23); }
.input-panel { padding: 22px; }
.core-inputs { display: grid; grid-template-columns: 160px 160px 1fr; gap: 16px; align-items: end; }
.core-inputs label, .minion-input { display: grid; gap: 7px; }
.core-inputs label span, .board-summary span, .minion-head span, .minion-input span { color: #aaa5b7; font-size: .78rem; font-weight: 750; }
input { box-sizing: border-box; width: 100%; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 10px 12px; outline: none; background: rgba(255,255,255,.055); color: #fff; font: inherit; font-size: 1.12rem; font-weight: 800; }
input:focus { border-color: #e7be6c; box-shadow: 0 0 0 3px rgba(231,190,108,.12); }
.board-summary { display: grid; gap: 7px; padding: 0 0 10px 8px; }
.board-summary strong { color: #f1d18e; font-size: 1.03rem; }
.minion-head { display: flex; align-items: end; justify-content: space-between; gap: 15px; margin-top: 24px; padding-top: 19px; border-top: 1px solid rgba(255,255,255,.09); }
.minion-head > div:first-child { display: grid; gap: 3px; }
.minion-head small { color: #777386; font-size: .72rem; }
.input-actions { display: flex; gap: 8px; }
button { border: 0; font: inherit; cursor: pointer; }
.add, .quiet { border-radius: 999px; padding: 7px 13px; font-size: .78rem; font-weight: 800; }
.add { background: #e8c36f; color: #2d2631; }
.quiet { background: rgba(255,255,255,.07); color: #bbb6c5; }
button:disabled { cursor: not-allowed; opacity: .35; }
.minion-grid { display: grid; grid-template-columns: repeat(7, minmax(80px, 1fr)); gap: 9px; margin-top: 14px; }
.minion-input { position: relative; }
.minion-input input { padding-right: 29px; }
.minion-input button { position: absolute; right: 7px; bottom: 9px; background: transparent; color: #8f8999; font-size: 1rem; }
.minion-input button:hover { color: #f08d93; }
.empty-board { margin: 15px 0 0; color: #888394; font-size: .84rem; }
.comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
.result-card { overflow: hidden; padding: 22px; }
.result-card.guaranteed { border-color: rgba(86, 203, 139, .45); background: linear-gradient(145deg, rgba(28, 99, 70, .42), rgba(26, 28, 43, .92) 58%); }
.result-card.possible { border-color: rgba(232, 195, 111, .42); background: linear-gradient(145deg, rgba(112, 78, 32, .4), rgba(26, 28, 43, .92) 58%); }
.result-card.impossible { border-color: rgba(223, 115, 126, .34); }
.result-card header { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
.result-card header small { color: #8e8999; font-size: .68rem; font-weight: 850; letter-spacing: .08em; }
.result-card h2 { margin: 3px 0 0; font-size: 1.06rem; }
.verdict { border-radius: 999px; padding: 5px 9px; white-space: nowrap; font-size: .75rem; }
.guaranteed .verdict { background: #63d69a; color: #10281d; }
.possible .verdict { background: #ebc46d; color: #33270f; }
.impossible .verdict { background: rgba(224, 111, 125, .18); color: #ef9ba6; }
.damage-number { display: grid; margin: 23px 0 13px; }
.damage-number span { color: #aaa5b7; font-size: .75rem; }
.damage-number b { color: #f4d58e; font-size: 3rem; line-height: 1.05; letter-spacing: -.04em; }
.guaranteed .damage-number b { color: #7ae1aa; }
.impossible .damage-number b { color: #e88e99; }
.chance-bar { height: 6px; margin: -4px 0 16px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.09); }
.chance-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #d9994d, #f2d47e); }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
dl div { border-radius: 9px; padding: 9px 10px; background: rgba(255,255,255,.045); }
dt { color: #8e8999; font-size: .69rem; }
dd { margin: 2px 0 0; color: #eee9f0; font-size: .93rem; font-weight: 800; }
.result-note { min-height: 43px; margin: 15px 0 0; color: #aaa5b7; font-size: .78rem; line-height: 1.5; }
.rule-card { margin-top: 18px; padding: 20px 22px; }
.rule-card h2 { margin: 0 0 8px; font-size: 1rem; }
.rule-card p { margin: 6px 0; color: #c1bbca; font-size: .84rem; line-height: 1.6; }
.rule-card code { color: #f1cf86; }
.rule-card small { display: block; margin-top: 10px; color: #7f7a89; line-height: 1.55; }
@media (max-width: 700px) { .imbue-page { padding: 28px 14px 50px; }.hero-copy { margin-top: 22px; }.core-inputs { grid-template-columns: 1fr 1fr; }.board-summary { grid-column: 1 / -1; padding: 2px 0 0; }.minion-grid { grid-template-columns: repeat(3, 1fr); }.comparison { grid-template-columns: 1fr; }.result-note { min-height: 0; } }
@media (max-width: 410px) { .input-panel, .result-card { padding: 17px; }.minion-head { align-items: start; }.input-actions { display: grid; }.minion-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
