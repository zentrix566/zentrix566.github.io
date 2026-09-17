<script setup>
import { computed, ref } from 'vue'
import { calculateScenario } from '../utils/calculator.js'

const skillDamage = ref(6)
const heroHealth = ref(30)
const heroArmor = ref(0)
const minionHealths = ref([4, 4, 0, 0, 0, 0, 0])
const simulationRuns = 40000
const minionPresets = [
  { label: '7个1', healths: [1, 1, 1, 1, 1, 1, 1] },
  { label: '6个1', healths: [1, 1, 1, 1, 1, 1, 0] },
  { label: '5个1', healths: [1, 1, 1, 1, 1, 0, 0] },
  { label: '4个1', healths: [1, 1, 1, 1, 0, 0, 0] },
  { label: '3个1', healths: [1, 1, 1, 0, 0, 0, 0] },
  { label: '2个1', healths: [1, 1, 0, 0, 0, 0, 0] }
]

const cleanMinions = computed(() => minionHealths.value
  .map((value) => Math.max(0, Math.floor(Number(value)) || 0))
  .filter(Boolean))
const minionTotal = computed(() => cleanMinions.value.reduce((sum, health) => sum + health, 0))
const effectiveHealth = computed(() => Math.max(0, Math.floor(Number(heroHealth.value)) || 0)
  + Math.max(0, Math.floor(Number(heroArmor.value)) || 0))
const scenarios = computed(() => [
  {
    key: 'apprentice',
    title: '只有鲁莽的学徒',
    badge: '单倍触发',
    result: calculateScenario({
      skillDamage: skillDamage.value,
      heroHealth: heroHealth.value,
      heroArmor: heroArmor.value,
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
      heroArmor: heroArmor.value,
      minionHealths: cleanMinions.value,
      multiplier: 2,
      runs: simulationRuns
    })
  },
  {
    key: 'solo-buddy',
    title: '单独伴唱机',
    badge: '固定触发两次',
    result: calculateScenario({
      skillDamage: skillDamage.value,
      heroHealth: heroHealth.value,
      heroArmor: heroArmor.value,
      minionHealths: cleanMinions.value,
      fixedTriggerCount: 2,
      runs: simulationRuns
    })
  }
])

const statusText = {
  guaranteed: '稳斩',
  possible: '概率斩杀',
  impossible: '不能斩杀'
}

function clearMinions() {
  minionHealths.value = Array(7).fill(0)
}

function useMinionPreset(healths) {
  minionHealths.value = healths.slice()
}

function isPresetActive(healths) {
  return healths.every((health, index) => Number(minionHealths.value[index]) === health)
}

function percent(value) {
  if (value === 0) return '<0.1%'
  if (value === 1) return '>99.9%'
  if (value < 0.001) return '<0.1%'
  if (value > 0.999) return '>99.9%'
  return `${(value * 100).toFixed(1)}%`
}

function faceDamageLabel(result) {
  if (result.status === 'guaranteed') return `至少 ${result.guaranteedFaceDamage}`
  if (result.status === 'possible') return `平均 ${result.averageFaceDamage.toFixed(1)}`
  return `最多 ${result.maximumFaceDamage}`
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
            <span>英雄血量</span>
            <input v-model.number="heroHealth" type="number" min="0" max="999">
          </label>
          <label>
            <span>英雄护甲</span>
            <input v-model.number="heroArmor" type="number" min="0" max="999">
          </label>
        </div>

        <div class="minion-head">
          <div><span>敌方随从血量</span><small>固定 7 个槽位，血量为 0 的随从不参与计算</small></div>
          <div class="input-actions">
            <button type="button" class="quiet" @click="clearMinions">一键归 0</button>
          </div>
        </div>

        <div class="preset-row" aria-label="随从血量预设">
          <span>常用预设</span>
          <button
            v-for="preset in minionPresets"
            :key="preset.label"
            type="button"
            class="preset"
            :class="{ active: isPresetActive(preset.healths) }"
            @click="useMinionPreset(preset.healths)"
          >{{ preset.label }}</button>
        </div>

        <div class="minion-grid">
          <label v-for="(_, index) in minionHealths" :key="index" class="minion-input">
            <span>随从 {{ index + 1 }} 血量</span>
            <input v-model.number="minionHealths[index]" type="number" min="0" max="999">
          </label>
        </div>
      </section>

      <section class="comparison" aria-label="斩杀结果对比">
        <article v-for="scenario in scenarios" :key="scenario.key" class="result-card" :class="scenario.result.status">
          <header>
            <div><small>{{ scenario.badge }}</small><h2>{{ scenario.title }}</h2></div>
          </header>

          <div class="verdict-block" role="status" aria-live="polite">
            <span>斩杀结论</span>
            <strong>{{ statusText[scenario.result.status] }}</strong>
            <small v-if="scenario.result.status === 'possible'">模拟斩杀率 {{ percent(scenario.result.lethalProbability) }}</small>
          </div>

          <div v-if="scenario.result.status === 'possible'" class="chance-bar" aria-hidden="true">
            <i :style="{ width: `${scenario.result.lethalProbability * 100}%` }"></i>
          </div>

          <div class="damage-summary">
            <div>
              <span>总伤害</span>
              <strong>{{ scenario.result.totalPings }}</strong>
            </div>
            <div>
              <span>打脸伤害</span>
              <strong>{{ faceDamageLabel(scenario.result) }}</strong>
            </div>
          </div>

          <div class="outcome-detail">
            <template v-if="scenario.result.status === 'guaranteed'">
              <span>稳斩溢出</span>
              <strong>{{ scenario.result.guaranteedOverkill }} 点</strong>
            </template>
            <template v-else-if="scenario.result.status === 'possible'">
              <span>满打脸溢出</span>
              <strong>{{ scenario.result.maximumOverkill }} 点</strong>
            </template>
            <template v-else>
              <span>最低技能伤害</span>
              <strong>{{ scenario.result.minimumLethalSkillDamage }}</strong>
              <small>满打脸可斩</small>
            </template>
          </div>

          <dl>
            <div><dt>初始敌方角色</dt><dd>{{ scenario.result.targetCount }}</dd></div>
            <div><dt>技能触发</dt><dd>{{ scenario.result.triggerCount }} 次</dd></div>
            <div><dt>稳打脸下限</dt><dd>{{ scenario.result.guaranteedFaceDamage }} 点</dd></div>
            <div><dt>敌方血量＋护甲</dt><dd>{{ scenario.result.effectiveHealth }} 点</dd></div>
          </dl>

          <p v-if="scenario.result.status === 'guaranteed'" class="result-note">
            就算每个随从都吃满 {{ minionTotal }} 点，剩余 {{ scenario.result.guaranteedFaceDamage }} 点仍足够击杀英雄。
          </p>
          <p v-else-if="scenario.result.status === 'possible'" class="result-note">
            不是稳斩；约 {{ simulationRuns.toLocaleString() }} 次固定样本模拟中，平均对英雄造成 {{ scenario.result.averageFaceDamage.toFixed(1) }} 点有效伤害。
          </p>
          <p v-else class="result-note">
            全部 {{ scenario.result.totalPings }} 点即使一发不分给随从，也不足以击穿英雄的 {{ effectiveHealth }} 点血量与护甲。
          </p>
        </article>
      </section>

      <section class="rule-card">
        <h2>怎么算的</h2>
        <p><code>学徒触发次数 = 初始随从数 + 1 个英雄</code>；伴唱机＋学徒时再乘 2，单独伴唱机固定触发 2 次。每次触发产生“当前技能伤害”枚 1 点弹幕。</p>
        <p><code>稳打脸下限 = 总弹幕 − 所有随从血量</code>。下限不低于英雄血量就是稳斩；只有总弹幕够则是概率斩杀；总弹幕都不够就是不能斩。不能斩时会给出满打脸可斩所需的最低技能伤害。</p>
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
.core-inputs { display: grid; grid-template-columns: repeat(3, minmax(150px, 220px)); gap: 16px; align-items: end; }
.core-inputs label, .minion-input { display: grid; gap: 7px; }
.core-inputs label span, .minion-head span, .minion-input span { color: #aaa5b7; font-size: .78rem; font-weight: 750; }
input { box-sizing: border-box; width: 100%; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 10px 12px; outline: none; background: rgba(255,255,255,.055); color: #fff; font: inherit; font-size: 1.12rem; font-weight: 800; }
input:focus { border-color: #e7be6c; box-shadow: 0 0 0 3px rgba(231,190,108,.12); }
.minion-head { display: flex; align-items: end; justify-content: space-between; gap: 15px; margin-top: 24px; padding-top: 19px; border-top: 1px solid rgba(255,255,255,.09); }
.minion-head > div:first-child { display: grid; gap: 3px; }
.minion-head small { color: #777386; font-size: .72rem; }
.input-actions { display: flex; gap: 8px; }
button { border: 0; font: inherit; cursor: pointer; }
.quiet, .preset { min-height: 36px; border-radius: 999px; padding: 7px 13px; font-size: .78rem; font-weight: 800; }
.quiet { background: rgba(255,255,255,.07); color: #bbb6c5; }
.preset-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
.preset-row > span { margin-right: 2px; color: #8e8999; font-size: .75rem; font-weight: 750; }
.preset { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: #c7c1cf; }
.preset:hover, .preset.active { border-color: rgba(232,195,111,.6); background: rgba(232,195,111,.14); color: #f1d18e; }
.minion-grid { display: grid; grid-template-columns: repeat(7, minmax(80px, 1fr)); gap: 9px; margin-top: 14px; }
.comparison { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
.result-card { overflow: hidden; padding: 22px; }
.result-card.guaranteed { border-color: rgba(86, 203, 139, .45); background: linear-gradient(145deg, rgba(28, 99, 70, .42), rgba(26, 28, 43, .92) 58%); }
.result-card.possible { border-color: rgba(232, 195, 111, .42); background: linear-gradient(145deg, rgba(112, 78, 32, .4), rgba(26, 28, 43, .92) 58%); }
.result-card.impossible { border-color: rgba(223, 115, 126, .34); }
.result-card header { display: flex; gap: 12px; align-items: start; }
.result-card header small { color: #8e8999; font-size: .68rem; font-weight: 850; letter-spacing: .08em; }
.result-card h2 { margin: 3px 0 0; font-size: 1.06rem; }
.verdict-block { display: grid; justify-items: center; gap: 4px; margin: 20px 0 16px; border: 1px solid currentColor; border-radius: 14px; padding: 17px 14px; text-align: center; }
.verdict-block span { color: #aaa5b7; font-size: .72rem; font-weight: 800; letter-spacing: .08em; }
.verdict-block strong { font-size: clamp(1.8rem, 5vw, 2.6rem); line-height: 1.05; letter-spacing: -.03em; }
.verdict-block small { font-size: .82rem; font-weight: 800; }
.guaranteed .verdict-block { background: rgba(51, 165, 106, .14); color: #7ae1aa; }
.possible .verdict-block { background: rgba(216, 158, 64, .14); color: #f4d58e; }
.impossible .verdict-block { background: rgba(203, 80, 95, .13); color: #ef9ba6; }
.chance-bar { height: 6px; margin: -8px 0 16px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.09); }
.chance-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #d9994d, #f2d47e); }
.damage-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.damage-summary > div { display: grid; gap: 3px; border-radius: 12px; padding: 13px; background: rgba(255,255,255,.07); }
.damage-summary span { color: #aaa5b7; font-size: .72rem; font-weight: 750; }
.damage-summary strong { color: #f7f2e9; font-size: 1.35rem; }
.outcome-detail { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; border-radius: 10px; padding: 10px 12px; background: rgba(255,255,255,.045); }
.outcome-detail span { color: #aaa5b7; font-size: .72rem; font-weight: 750; }
.outcome-detail strong { color: #f1d18e; font-size: 1.05rem; }
.guaranteed .outcome-detail strong { color: #7ae1aa; }
.impossible .outcome-detail strong { color: #ef9ba6; }
.outcome-detail small { color: #8e8999; font-size: .72rem; }
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
@media (max-width: 900px) { .comparison { grid-template-columns: 1fr 1fr; }.result-card:last-child { grid-column: 1 / -1; } }
@media (max-width: 700px) { .imbue-page { padding: 28px 14px 50px; }.hero-copy { margin-top: 22px; }.core-inputs { grid-template-columns: 1fr 1fr; }.preset-row { gap: 6px; }.preset { padding: 6px 10px; }.minion-grid { grid-template-columns: repeat(3, 1fr); }.comparison { grid-template-columns: 1fr; }.result-card:last-child { grid-column: auto; }.result-note { min-height: 0; } }
@media (max-width: 410px) { .input-panel, .result-card { padding: 17px; }.minion-head { align-items: start; }.input-actions { display: grid; }.minion-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
