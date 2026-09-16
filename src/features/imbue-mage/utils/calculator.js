function positiveInt(value, fallback = 0) {
  const number = Math.floor(Number(value))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

export function normalizeBoard(heroHealth, minionHealths) {
  return {
    heroHealth: positiveInt(heroHealth),
    minionHealths: minionHealths
      .map((health) => positiveInt(health))
      .filter(Boolean)
      .slice(0, 7)
  }
}

function hashScenario(skillDamage, heroHealth, minionHealths, multiplier) {
  const text = `${skillDamage}|${heroHealth}|${minionHealths.join(',')}|${multiplier}`
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

export function calculateScenario({ skillDamage, heroHealth, minionHealths, multiplier = 1, runs = 40000 }) {
  const damage = positiveInt(skillDamage)
  const board = normalizeBoard(heroHealth, minionHealths)
  const targetCount = board.minionHealths.length + 1
  const triggerCount = targetCount * multiplier
  const totalPings = damage * triggerCount
  const minionHealthTotal = board.minionHealths.reduce((sum, health) => sum + health, 0)
  const guaranteedFaceDamage = Math.max(0, totalPings - minionHealthTotal)
  const maximumFaceDamage = totalPings

  let status = 'impossible'
  if (board.heroHealth > 0 && guaranteedFaceDamage >= board.heroHealth) status = 'guaranteed'
  else if (board.heroHealth > 0 && maximumFaceDamage >= board.heroHealth) status = 'possible'

  let lethalRuns = 0
  let totalFaceDamage = 0
  if (damage > 0 && board.heroHealth > 0 && runs > 0) {
    const random = mulberry32(hashScenario(damage, board.heroHealth, board.minionHealths, multiplier))
    for (let run = 0; run < runs; run += 1) {
      const minions = board.minionHealths.slice()
      let heroDamage = 0
      for (let ping = 0; ping < totalPings && heroDamage < board.heroHealth; ping += 1) {
        const living = []
        for (let index = 0; index < minions.length; index += 1) {
          if (minions[index] > 0) living.push(index)
        }
        const target = Math.floor(random() * (living.length + 1))
        if (target === living.length) heroDamage += 1
        else minions[living[target]] -= 1
      }
      totalFaceDamage += Math.min(heroDamage, board.heroHealth)
      if (heroDamage >= board.heroHealth) lethalRuns += 1
    }
  }

  return {
    status,
    targetCount,
    triggerCount,
    totalPings,
    minionHealthTotal,
    guaranteedFaceDamage,
    maximumFaceDamage,
    lethalProbability: status === 'guaranteed' ? 1 : status === 'impossible' ? 0 : lethalRuns / runs,
    averageFaceDamage: runs > 0 ? totalFaceDamage / runs : 0
  }
}
