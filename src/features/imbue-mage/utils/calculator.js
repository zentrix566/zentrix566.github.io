function positiveInt(value, fallback = 0) {
  const number = Math.floor(Number(value))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

export function normalizeBoard(heroHealth, heroArmor, minionHealths) {
  const normalizedHealth = positiveInt(heroHealth)
  const normalizedArmor = positiveInt(heroArmor)
  return {
    heroHealth: normalizedHealth,
    heroArmor: normalizedArmor,
    effectiveHealth: normalizedHealth + normalizedArmor,
    minionHealths: minionHealths
      .map((health) => positiveInt(health))
      .filter(Boolean)
      .slice(0, 7)
  }
}

function hashScenario(skillDamage, effectiveHealth, minionHealths, triggerCount) {
  const text = `${skillDamage}|${effectiveHealth}|${minionHealths.join(',')}|${triggerCount}`
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed || 1
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function calculateScenario({
  skillDamage,
  heroHealth,
  heroArmor = 0,
  minionHealths,
  multiplier = 1,
  fixedTriggerCount = 0,
  runs = 40000
}) {
  const damage = positiveInt(skillDamage)
  const board = normalizeBoard(heroHealth, heroArmor, minionHealths)
  const targetCount = board.minionHealths.length + 1
  const triggerCount = positiveInt(fixedTriggerCount) || targetCount * multiplier
  const totalPings = damage * triggerCount
  const minionHealthTotal = board.minionHealths.reduce((sum, health) => sum + health, 0)
  const guaranteedFaceDamage = Math.max(0, totalPings - minionHealthTotal)
  const maximumFaceDamage = totalPings

  let status = 'impossible'
  if (board.effectiveHealth > 0 && guaranteedFaceDamage >= board.effectiveHealth) status = 'guaranteed'
  else if (board.effectiveHealth > 0 && maximumFaceDamage >= board.effectiveHealth) status = 'possible'

  let lethalRuns = 0
  let totalFaceDamage = 0
  if (damage > 0 && board.effectiveHealth > 0 && runs > 0) {
    const random = mulberry32(hashScenario(damage, board.effectiveHealth, board.minionHealths, triggerCount))
    for (let run = 0; run < runs; run += 1) {
      const minions = board.minionHealths.slice()
      let heroDamage = 0
      for (let ping = 0; ping < totalPings && heroDamage < board.effectiveHealth; ping += 1) {
        const living = []
        for (let index = 0; index < minions.length; index += 1) {
          if (minions[index] > 0) living.push(index)
        }
        const target = Math.floor(random() * (living.length + 1))
        if (target === living.length) heroDamage += 1
        else minions[living[target]] -= 1
      }
      totalFaceDamage += Math.min(heroDamage, board.effectiveHealth)
      if (heroDamage >= board.effectiveHealth) lethalRuns += 1
    }
  }

  return {
    status,
    heroHealth: board.heroHealth,
    heroArmor: board.heroArmor,
    effectiveHealth: board.effectiveHealth,
    targetCount,
    triggerCount,
    totalPings,
    minionHealthTotal,
    guaranteedFaceDamage,
    maximumFaceDamage,
    guaranteedOverkill: Math.max(0, guaranteedFaceDamage - board.effectiveHealth),
    maximumOverkill: Math.max(0, maximumFaceDamage - board.effectiveHealth),
    minimumLethalSkillDamage: board.effectiveHealth > 0
      ? Math.ceil(board.effectiveHealth / triggerCount)
      : 0,
    lethalProbability: status === 'guaranteed' ? 1 : status === 'impossible' ? 0 : lethalRuns / runs,
    averageFaceDamage: runs > 0 ? totalFaceDamage / runs : 0
  }
}
