// 游戏引擎：状态机（菜单/简报/推进/战斗/过关/败北/通关）、波次刷兵、敌人 AI、
// 命中判定、武器与手榴弹、蹲伏体力、特效与 HUD 状态同步
import { STAGES, ENEMY_STATS, WEAPONS } from './stages.js'
import {
  VIEW_W as W, VIEW_H as H, drawScene, drawCover, drawTrooper, drawRusher,
  drawMuzzle, drawLobShell, drawPlayerNade, drawExplosion, drawPickup,
  drawGunView, drawCrosshair, drawBanner, drawBossBar, drawHitVignette,
  drawFloatText, drawLowHp
} from './draw.js'

const rand = (a, b) => a + Math.random() * (b - a)

export class ShanghaiGame {
  constructor(canvas, sfx, onState) {
    this.canvas = canvas
    this.sfx = sfx
    this.onState = onState
    this.ctx = canvas.getContext('2d')
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * this.dpr
    canvas.height = H * this.dpr

    this.phase = 'idle' // idle | briefing | advance | combat | clear | over | win
    this.paused = false
    this.t = 0
    this.lastTs = 0

    this.stageIndex = 0
    this.hp = 120
    this.maxHp = 120
    this.score = 0
    this.cheat = false
    this.cheated = false
    this.kills = 0
    this.headshots = 0
    this.shots = 0
    this.hits = 0
    this.stageKills = 0
    this.stageShots = 0
    this.stageHits = 0

    this.weapons = WEAPONS.map((w) => ({
      ...w,
      magNow: w.mag,
      reserve: w.id === 'pistol' ? Infinity : w.id === 'smg' ? 90 : 0
    }))
    this.weaponIdx = 0
    this.nades = 3
    this.fireCd = 0
    this.nadeCd = 0
    this.reloadT = 0
    this.kick = 0
    this.firing = false

    this.mx = W / 2
    this.my = H / 2
    this.crouch = false
    this.crouchKey = false
    this.stamina = 100
    this.exhaustT = 0
    this.hurtV = 0
    this.shake = 0
    this.hoverHead = false

    this.enemies = []
    this.rushers = []
    this.lobs = []
    this.playerNades = []
    this.pickups = []
    this.fxExplosions = []
    this.fxImpacts = []
    this.fxTracers = []
    this.floats = []
    this.combo = 0
    this.comboT = 0

    this.waveIdx = 0
    this.combatT = 0
    this.advanceT = 0
    this.cam = 0
    this.boss = null
    this.lastSnap = ''

    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  get stage() {
    return STAGES[Math.min(this.stageIndex, STAGES.length - 1)]
  }

  // ———— 流程控制（由页面调用） ————

  startRun(fromStage = 0) {
    this.stageIndex = Math.max(0, Math.min(fromStage, STAGES.length - 1))
    this.hp = this.maxHp
    this.score = 0
    this.kills = this.headshots = this.shots = this.hits = 0
    this.weapons = WEAPONS.map((w) => ({
      ...w,
      magNow: w.mag,
      reserve: w.id === 'pistol' ? Infinity : w.id === 'smg' ? 90 : 0
    }))
    this.weaponIdx = 0
    this.nades = 3
    this.stamina = 100
    this.combo = 0
    this.cheated = this.cheat
    this.boss = null
    this.clearEntities()
    this.phase = 'briefing'
    this.emit(true)
  }

  // 作弊模式：无敌 + 无限弹药 + 一击必杀 + 无限体力；开启后本局成绩不计入最高分
  setCheat(on) {
    this.cheat = on
    if (on && this.phase !== 'idle') this.cheated = true
    this.emit(true)
  }

  skipStage() {
    if (!['briefing', 'advance', 'combat', 'clear'].includes(this.phase)) return
    this.paused = false
    this.nextStage()
  }

  backToMenu() {
    this.phase = 'idle'
    this.clearEntities()
    this.emit(true)
  }

  beginStage() {
    this.clearEntities()
    this.stageKills = this.stageShots = this.stageHits = 0
    this.waveIdx = 0
    this.combatT = 0
    this.advanceT = 0
    this.cam = 0
    this.boss = null
    this.combo = 0
    this.phase = 'advance'
    this.emit(true)
  }

  nextStage() {
    this.stageIndex++
    if (this.stageIndex >= STAGES.length) {
      this.phase = 'win'
      this.sfx.victory()
    } else {
      this.phase = 'briefing'
    }
    this.emit(true)
  }

  retry() {
    this.startRun()
  }

  clearEntities() {
    this.enemies = []
    this.rushers = []
    this.lobs = []
    this.playerNades = []
    this.pickups = []
    this.fxExplosions = []
    this.fxImpacts = []
    this.fxTracers = []
    this.floats = []
  }

  togglePause() {
    if (!['advance', 'combat'].includes(this.phase)) return
    this.paused = !this.paused
    this.emit(true)
  }

  setPaused(p) {
    if (p && ['advance', 'combat'].includes(this.phase) && !this.paused) {
      this.paused = true
      this.emit(true)
    }
  }

  // ———— 输入 ————

  aim(x, y) {
    this.mx = x
    this.my = y
  }

  trigger(down) {
    if (down) {
      const w = this.weapons[this.weaponIdx]
      if (w.auto) {
        this.firing = true
      } else {
        this.fire()
      }
    } else {
      this.firing = false
    }
  }

  key(code, down) {
    if (code === 'Space') {
      this.crouchKey = down
      return
    }
    if (!down) return
    if (code === 'Digit1') this.selectWeapon(0)
    else if (code === 'Digit2') this.selectWeapon(1)
    else if (code === 'Digit3') this.selectWeapon(2)
    else if (code === 'Digit4') this.selectWeapon(3)
    else if (code === 'KeyR') this.tryReload()
  }

  selectWeapon(i) {
    if (this.phase !== 'combat' || this.paused) return
    if (i === this.weaponIdx) return
    const w = this.weapons[i]
    if (!this.cheat && i !== 3 && w.magNow <= 0 && w.reserve <= 0) {
      this.float(W / 2, 300, `${w.short}没有弹药`, '#ffb066')
      return
    }
    this.weaponIdx = i
    this.reloadT = 0
    this.firing = false
    this.sfx.reload()
  }

  tryReload() {
    if (this.phase !== 'combat' || this.paused || this.crouch) return
    const w = this.weapons[this.weaponIdx]
    if (this.weaponIdx === 3 || this.reloadT > 0) return
    if (w.magNow >= w.mag) return
    if (w.reserve <= 0) {
      this.sfx.dryFire()
      return
    }
    this.reloadT = w.reload
    this.sfx.reload()
  }

  // ———— 战斗 ————

  fire() {
    if (this.phase !== 'combat' || this.paused || this.crouch) return
    if (this.weaponIdx === 3) {
      if (this.nadeCd > 0) return
      if (!this.cheat && this.nades <= 0) {
        this.sfx.dryFire()
        return
      }
      if (!this.cheat) this.nades--
      this.nadeCd = 0.9
      this.kick = 1
      this.playerNades.push({ sx: W / 2 + 90, sy: H + 20, tx: this.mx, ty: this.my, x: 0, y: 0, t: 0, dur: 0.55 })
      this.sfx.throwNade()
      return
    }
    const w = this.weapons[this.weaponIdx]
    if (this.reloadT > 0 || this.fireCd > 0) return
    if (!this.cheat) {
      if (w.magNow <= 0) {
        this.sfx.dryFire()
        this.tryReload()
        return
      }
      w.magNow--
    }
    this.fireCd = w.rate
    this.kick = 1
    this.shots++
    this.stageShots++
    this.sfx[w.id]()
    const spread = w.spread
    const ax = this.mx + rand(-spread, spread)
    const ay = this.my + rand(-spread, spread)
    this.bulletHit(ax, ay, w)
  }

  // 命中判定：掷弹 > 兵（前景优先）> 补给箱
  bulletHit(x, y, w) {
    for (const g of this.lobs) {
      if (Math.hypot(x - g.x, y - g.y) < 20) {
        this.detonateLob(g, true)
        return
      }
    }
    const cand = [...this.enemies, ...this.rushers]
      .filter((e) => e.deadT === 0 && e.sink < 30 && (e.fade == null || e.fade > 0.5))
      .sort((a, b) => b.s - a.s)
    for (const e of cand) {
      const headY = e.y + (e.sink || 0) - (e.type === 'kneemortar' ? 60 : 71) * e.s
      const headR = 11 * e.s + 5
      const isHead = Math.hypot(x - e.x, y - headY) < headR
      const bodyTop = e.y + (e.sink || 0) - (e.type === 'kneemortar' ? 56 : 62) * e.s
      const inBody = Math.abs(x - e.x) < 17 * e.s + 4 && y > bodyTop && y < e.y + (e.sink || 0)
      if (!isHead && !inBody) continue
      this.hits++
      this.stageHits++
      e.hitT = 0.12
      const dmg = this.cheat ? 9999 : isHead ? w.dmg * w.headMul : w.dmg
      e.hp -= dmg
      this.fxImpacts.push({ x, y, t: 0, dur: 0.18, color: isHead ? 'rgba(180,30,20,0.8)' : 'rgba(60,55,50,0.8)', r: isHead ? 7 : 5 })
      if (e.hp <= 0) {
        this.killEnemy(e, isHead)
      } else {
        this.sfx.hit()
      }
      return
    }
    for (const p of this.pickups) {
      if (Math.hypot(x - p.x, y - (p.y - 16)) < 30) {
        this.collect(p)
        return
      }
    }
    // 落空
    this.fxImpacts.push({ x, y, t: 0, dur: 0.25, color: 'rgba(120,110,95,0.5)', r: 4 })
  }

  killEnemy(e, headshot) {
    e.deadT = 0.0001
    this.kills++
    this.stageKills++
    if (headshot) this.headshots++
    this.comboT = 2.5
    this.combo++
    const base = e.type === 'boss' ? 1500 + this.stageIndex * 500 : ENEMY_STATS[e.type].score
    const mult = 1 + Math.min(this.combo - 1, 10) * 0.1
    const gain = Math.round(base * mult * (headshot ? 1.5 : 1))
    this.score += gain
    this.float(e.x, e.y - 80 * e.s, `+${gain}${headshot ? ' 爆头!' : ''}`, headshot ? '#ffd890' : '#f0e6d0', headshot ? 18 : 15)
    if (this.combo >= 3) this.float(e.x, e.y - 104 * e.s, `连杀 ×${this.combo}`, '#ff9a5c', 14)
    if (e.type === 'boss') {
      this.sfx.bossDown()
      this.shake = 1.2
      this.fxExplosions.push({ x: e.x, y: e.y - 40 * e.s, r: 150, p: 0, seed: Math.random() * 7 })
      this.boss = null
    } else {
      this.sfx[headshot ? 'headshot' : 'kill']()
      if (Math.random() < 0.14) this.dropPickup(e.x, e.y - 30 * e.s)
    }
  }

  dropPickup(x, y) {
    const roll = Math.random()
    const kind = roll < 0.36 ? 'smg' : roll < 0.6 ? 'med' : roll < 0.85 ? 'nade' : 'lmg'
    this.pickups.push({ kind, x, y, seed: Math.random(), life: 13 })
  }

  collect(p) {
    this.pickups.splice(this.pickups.indexOf(p), 1)
    this.sfx.pickup()
    this.score += 20
    if (p.kind === 'smg') {
      this.weapons[1].reserve += 90
      this.float(p.x, p.y - 40, '冲锋枪弹药 +90', '#bfe0ff')
    } else if (p.kind === 'lmg') {
      this.weapons[2].reserve += 100
      this.float(p.x, p.y - 40, '捷克式弹药 +100', '#bfe0ff')
    } else if (p.kind === 'nade') {
      this.nades += 2
      this.float(p.x, p.y - 40, '手榴弹 +2', '#ffd890')
    } else {
      this.hp = Math.min(this.maxHp, this.hp + 30)
      this.float(p.x, p.y - 40, '体力 +30', '#9be29b')
    }
  }

  float(x, y, text, color, size) {
    this.floats.push({ x: Math.max(60, Math.min(W - 60, x)), y, text, color, size: size || 15, t: 0, dur: 1.1 })
  }

  damagePlayer(dmg) {
    if (this.cheat) return
    if (this.phase !== 'combat') return
    this.hp -= dmg
    this.hurtV = 1
    this.shake = Math.min(1, this.shake + 0.45)
    this.sfx.hurt()
    if (this.hp <= 0) {
      this.hp = 0
      this.phase = 'over'
      this.sfx.gameOver()
      this.emit(true)
    }
  }

  // ———— 刷兵 ————

  spawnEnemy(type, slotIdx) {
    const slot = this.stage.slots[slotIdx]
    const stats = ENEMY_STATS[type]
    const hp = Math.round(stats.hp * (1 + this.stageIndex * 0.16))
    const cover = slot.cover
    const e = {
      type, slot: slotIdx,
      x: slot.x, y: slot.y, s: slot.s,
      hp, maxHp: hp,
      seed: Math.random(),
      state: 'rise', stateT: 0,
      sink: cover === 'door' ? 0 : 46,
      fade: cover === 'door' ? 0 : 1,
      hideMode: cover === 'door' ? 'fade' : 'sink',
      aimDur: type === 'officer' ? Math.max(0.8, 1.35 - this.stageIndex * 0.12) : Math.max(1.0, 1.7 - this.stageIndex * 0.16),
      aimP: 0, flashT: 0, hitT: 0, deadT: 0,
      standT: rand(0.5, 0.9), downT: rand(0.7, 1.5),
      side: Math.random() < 0.5 ? -1 : 1
    }
    if (type === 'kneemortar') e.aimDur = Math.max(1.3, 1.9 - this.stageIndex * 0.12)
    this.enemies.push(e)
  }

  spawnRusher() {
    this.rushers.push({
      type: 'rusher',
      x: rand(120, W - 120),
      p: 0,
      s: 0.48,
      y: 378,
      sink: 0,
      hp: Math.round(ENEMY_STATS.rusher.hp * (1 + this.stageIndex * 0.16)),
      seed: Math.random(),
      state: 'run',
      stateT: 0,
      aimP: 0,
      hitT: 0,
      deadT: 0,
      runDur: Math.max(3.6, 5.4 - this.stageIndex * 0.4),
      side: 1
    })
  }

  spawnPickup(kind, slotIdx) {
    const slot = this.stage.slots[slotIdx]
    this.pickups.push({ kind, x: slot.x, y: slot.y - 36, seed: Math.random(), life: 14 })
  }

  spawnBoss() {
    const cfg = this.stage.boss
    const slot = this.stage.slots[cfg.slot]
    const e = {
      type: 'boss', name: cfg.name,
      x: slot.x, y: slot.y, s: slot.s * 1.16,
      hp: cfg.hp, maxHp: cfg.hp,
      seed: Math.random(),
      state: 'wait', stateT: 0.9,
      sink: 0, fade: 1, hideMode: 'sink',
      aimP: 0, flashT: 0, hitT: 0, deadT: 0,
      attacks: 0, burstLeft: 0, burstT: 0,
      moved: false, enraged: false,
      side: -1
    }
    this.enemies.push(e)
    this.boss = e
    this.float(W / 2, 200, `${cfg.name} 出现！`, '#ff7a5c', 20)
  }

  fireWave(wave) {
    if (wave.boss) {
      this.spawnBoss()
      return
    }
    for (const [type, slot] of wave.units || []) {
      if (type === 'rusher') this.spawnRusher()
      else this.spawnEnemy(type, slot)
    }
    // supply 是单个 [类型, 槽位] 二元组
    if (wave.supply) this.spawnPickup(wave.supply[0], wave.supply[1])
  }

  // ———— 更新 ————

  update(dt) {
    this.hurtV = Math.max(0, this.hurtV - dt * 1.1)
    this.shake = Math.max(0, this.shake - dt * 2.2)
    this.kick = Math.max(0, this.kick - dt * 7)
    this.comboT = Math.max(0, this.comboT - dt)
    if (this.comboT === 0) this.combo = 0

    if (['idle', 'briefing', 'clear', 'over', 'win'].includes(this.phase)) {
      // 待机：镜头缓慢漂移展示场景（战斗结算画面保持当前机位）
      if (this.phase === 'idle' || this.phase === 'briefing') {
        this.cam = 720 + Math.sin(this.t * 0.045) * 680
      }
      this.updateFx(dt)
      return
    }

    if (this.phase === 'advance') {
      this.advanceT += dt
      const p = Math.min(1, this.advanceT / 2.8)
      this.cam = 1200 * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)
      if (p >= 1) {
        this.phase = 'combat'
        this.combatT = 0
      }
      return
    }

    // —— combat ——
    this.combatT += dt
    const waves = this.stage.waves
    while (this.waveIdx < waves.length && this.combatT >= waves[this.waveIdx].at) {
      this.fireWave(waves[this.waveIdx])
      this.waveIdx++
    }

    this.updateCrouch(dt)
    this.updateWeapons(dt)
    this.updateEnemies(dt)
    this.updateRushers(dt)
    this.updateLobs(dt)
    this.updatePlayerNades(dt)
    this.updatePickups(dt)
    this.updateFx(dt)

    // 过关判定
    if (this.waveIdx >= waves.length && this.enemies.length === 0 && this.rushers.length === 0 && this.lobs.length === 0) {
      this.stageClear()
    }
  }

  stageClear() {
    const bonus = 400 + Math.round(this.hp * 3)
    this.score += bonus
    this.hp = Math.min(this.maxHp, this.hp + 35)
    if (this.stageShots > 10 && this.stageHits / this.stageShots > 0.5) {
      this.score += 200
      this.float(W / 2, 260, '神枪手加成 +200', '#ffd890', 18)
    }
    this.float(W / 2, 220, `关卡完成 +${bonus}`, '#9be29b', 20)
    this.sfx.stageClear()
    this.phase = 'clear'
    this.emit(true)
  }

  updateCrouch(dt) {
    this.exhaustT = Math.max(0, this.exhaustT - dt)
    const want = this.crouchKey && this.exhaustT <= 0
    if (want && !this.crouch) this.crouch = true
    if (!want) this.crouch = false
    if (this.crouch) {
      this.stamina -= 34 * dt
      if (this.stamina <= 0) {
        this.stamina = 0
        this.exhaustT = 1.1
        this.crouch = false
        this.float(W / 2, 400, '体力耗尽！', '#ff7a5c', 15)
      }
    } else {
      this.stamina = Math.min(100, this.stamina + 26 * dt)
    }
    if (this.cheat) {
      // 作弊：无限体力（扣减后回满）
      this.stamina = 100
      this.exhaustT = 0
    }
    if (this.crouch) this.firing = false
  }

  updateWeapons(dt) {
    this.fireCd -= dt
    this.nadeCd -= dt
    const w = this.weapons[this.weaponIdx]
    if (this.reloadT > 0) {
      this.reloadT -= dt
      if (this.reloadT <= 0) {
        const take = w.reserve === Infinity ? w.mag - w.magNow : Math.min(w.mag - w.magNow, w.reserve)
        w.magNow += take
        if (w.reserve !== Infinity) w.reserve -= take
      }
    }
    if (this.firing && w.auto) this.fire()
    // 当前武器彻底没弹 → 自动换驳壳枪（作弊时不切换）
    if (!this.cheat && this.weaponIdx !== 3 && this.weaponIdx !== 0 && w.magNow <= 0 && w.reserve <= 0 && this.reloadT <= 0) {
      this.weaponIdx = 0
      this.float(W / 2, 320, '换用驳壳枪', '#ffd890')
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      e.stateT += dt
      e.hitT = Math.max(0, e.hitT - dt)
      if (e.flashT > 0) e.flashT -= dt
      if (e.deadT > 0) {
        e.deadT += dt
        continue
      }
      if (e.type === 'boss') {
        this.updateBoss(e, dt)
        continue
      }
      switch (e.state) {
        case 'rise': {
          const p = Math.min(1, e.stateT / 0.45)
          if (e.hideMode === 'fade') e.fade = p
          else e.sink = 46 * (1 - p)
          if (p >= 1) {
            e.state = 'aim'
            e.stateT = 0
            e.aimP = 0
          }
          break
        }
        case 'aim': {
          // 玩家蹲下时步枪兵会等待（掷弹筒照扔）
          if (this.crouch && e.type !== 'kneemortar') break
          e.stateT += dt
          e.aimP = Math.min(1, e.stateT / e.aimDur)
          if (e.aimP >= 1) {
            e.state = 'shoot'
            e.stateT = 0
            e.flashT = 0.09
            if (e.type === 'kneemortar') this.enemyLob(e)
            else this.enemyShoot(e, ENEMY_STATS[e.type].dmg)
          }
          break
        }
        case 'shoot':
          if (e.stateT > 0.16) {
            e.state = 'stand'
            e.stateT = 0
          }
          break
        case 'stand':
          if (e.stateT >= e.standT) {
            e.state = 'duck'
            e.stateT = 0
          }
          break
        case 'duck': {
          const p = Math.min(1, e.stateT / 0.32)
          if (e.hideMode === 'fade') e.fade = 1 - p
          else e.sink = 46 * p
          if (p >= 1) {
            e.state = 'down'
            e.stateT = 0
          }
          break
        }
        case 'down':
          if (e.stateT >= e.downT) {
            e.state = 'rise'
            e.stateT = 0
          }
          break
      }
    }
    this.enemies = this.enemies.filter((e) => !(e.deadT > 0.6))
  }

  enemyShoot(e, dmg) {
    this.sfx.enemyShot()
    const mzX = e.x
    const mzY = e.y + (e.sink || 0) - 52 * e.s
    this.fxTracers.push({ x1: mzX, y1: mzY, x2: W / 2 + rand(-40, 40), y2: H + 30, t: 0, dur: 0.09 })
    this.damagePlayer(dmg)
  }

  enemyLob(e) {
    this.sfx.throwNade()
    const tx = W / 2 + rand(-70, 70)
    const ty = H - rand(30, 60)
    this.lobs.push({
      sx: e.x, sy: e.y + (e.sink || 0) - 50 * e.s,
      tx, ty, x: e.x, y: e.y - 50 * e.s,
      t: 0, dur: 1.15, dmg: ENEMY_STATS.kneemortar.dmg
    })
  }

  detonateLob(g, defused) {
    this.lobs.splice(this.lobs.indexOf(g), 1)
    this.fxExplosions.push({ x: g.x, y: g.y, r: defused ? 80 : 120, p: 0, seed: Math.random() * 7 })
    this.sfx.explosion()
    this.shake = Math.min(1.2, this.shake + (defused ? 0.4 : 0.9))
    if (defused) {
      this.score += 50
      this.float(g.x, g.y - 20, '截爆 +50', '#ffd890')
      return
    }
    // 落地：伤害玩家（蹲伏无效）并波及附近敌兵
    if (Math.hypot(g.tx - W / 2, g.ty - (H - 40)) < 170) {
      this.damagePlayer(g.dmg)
    }
    for (const e of [...this.enemies, ...this.rushers]) {
      if (e.deadT === 0 && Math.hypot(e.x - g.x, (e.y - 30 * e.s) - g.y) < 100) {
        e.hp -= 70
        e.hitT = 0.12
        if (e.hp <= 0) this.killEnemy(e, false)
      }
    }
  }

  updateBoss(e, dt) {
    e.aimP = e.state === 'wait' ? Math.min(1, e.stateT / 0.9) : 0
    // 半血召唤增援
    if (!e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true
      const used = new Set(this.enemies.filter((x) => x !== e).map((x) => x.slot))
      const free = this.stage.slots.map((_, i) => i).filter((i) => !used.has(i))
      for (let i = 0; i < 2 && free.length; i++) {
        this.spawnEnemy('rifle', free.splice(Math.floor(Math.random() * free.length), 1)[0])
      }
      this.float(e.x, e.y - 110 * e.s, '增援！', '#ff9a5c', 15)
    }
    if (e.state === 'wait') {
      if (e.stateT >= 1.15) {
        e.attacks++
        if (e.attacks % 3 === 0) {
          e.state = 'lob'
          e.stateT = 0
        } else {
          e.state = 'burst'
          e.stateT = 0
          e.burstLeft = 3 + this.stageIndex
          e.burstT = 0.55
        }
        // 每两次攻击换一个掩体位
        if (e.attacks % 2 === 0) {
          const free = this.stage.slots.filter((s, i) => i !== e.slot && s.y < 460)
          const target = free[Math.floor(Math.random() * free.length)]
          e.fromX = e.x; e.fromY = e.y; e.fromS = e.s
          e.toX = target.x; e.toY = target.y; e.toS = target.s * 1.16
          e.slot = this.stage.slots.indexOf(target)
          e.slide = 0
        }
      }
      return
    }
    if (e.slide != null && e.slide < 1) {
      e.slide = Math.min(1, e.slide + dt * 2.2)
      const p = e.slide * e.slide * (3 - 2 * e.slide)
      e.x = e.fromX + (e.toX - e.fromX) * p
      e.y = e.fromY + (e.toY - e.fromY) * p
      e.s = e.fromS + (e.toS - e.fromS) * p
    }
    if (e.state === 'burst') {
      e.burstT -= dt
      if (e.burstT <= 0 && e.burstLeft > 0) {
        if (!this.crouch) {
          e.flashT = 0.09
          this.enemyShoot(e, 11)
        }
        e.burstLeft--
        e.burstT = 0.24
      }
      if (e.burstLeft <= 0 && e.burstT <= 0) {
        e.state = 'wait'
        e.stateT = 0
      }
      return
    }
    if (e.state === 'lob') {
      if (e.stateT > 0.7 && !e.lobbed) {
        e.lobbed = true
        this.enemyLob(e)
      }
      if (e.stateT > 0.95) {
        e.lobbed = false
        e.state = 'wait'
        e.stateT = 0
      }
    }
  }

  updateRushers(dt) {
    for (const e of this.rushers) {
      e.stateT += dt
      e.hitT = Math.max(0, e.hitT - dt)
      if (e.deadT > 0) {
        e.deadT += dt
        continue
      }
      if (e.state === 'run') {
        e.p = Math.min(1, e.p + dt / e.runDur)
        e.y = 378 + (508 - 378) * e.p
        e.s = 0.48 + (1.18 - 0.48) * e.p
        if (e.p >= 1) {
          e.state = 'windup'
          e.stateT = 0
          e.aimP = 0
        }
      } else if (e.state === 'windup') {
        e.aimP = Math.min(1, e.stateT / 0.55)
        if (e.aimP >= 1) {
          e.state = 'slash'
          e.stateT = 0
          this.sfx.slash()
          this.fxImpacts.push({ slash: true, t: 0, dur: 0.22 })
          this.damagePlayer(ENEMY_STATS.rusher.dmg)
        }
      } else if (e.state === 'slash') {
        if (e.stateT >= 0.9) {
          e.state = 'windup'
          e.stateT = 0
          e.aimP = 0
        }
      }
    }
    this.rushers = this.rushers.filter((e) => !(e.deadT > 0.6))
  }

  updateLobs(dt) {
    for (const g of this.lobs) {
      g.t += dt
      const p = Math.min(1, g.t / g.dur)
      g.x = g.sx + (g.tx - g.sx) * p
      g.y = g.sy + (g.ty - g.sy) * p - Math.sin(p * Math.PI) * 150
      if (p >= 1) this.detonateLob(g, false)
    }
  }

  updatePlayerNades(dt) {
    for (const n of this.playerNades) {
      n.t += dt
      const p = Math.min(1, n.t / n.dur)
      n.x = n.sx + (n.tx - n.sx) * p
      n.y = n.sy + (n.ty - n.sy) * p - Math.sin(p * Math.PI) * 120
      if (p >= 1) {
        this.playerNades.splice(this.playerNades.indexOf(n), 1)
        this.fxExplosions.push({ x: n.tx, y: n.ty, r: 140, p: 0, seed: Math.random() * 7 })
        this.sfx.explosion()
        this.shake = Math.min(1.4, this.shake + 1)
        for (const e of [...this.enemies, ...this.rushers]) {
          if (e.deadT > 0) continue
          const d = Math.hypot(e.x - n.tx, e.y - 30 * e.s - n.ty)
          if (d < 140) {
            e.hp -= this.cheat ? 9999 : 130 - d * 0.65
            e.hitT = 0.12
            if (e.hp <= 0) this.killEnemy(e, false)
          }
        }
      }
    }
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      p.life -= dt
      if (p.life <= 0) this.pickups.splice(this.pickups.indexOf(p), 1)
    }
  }

  updateFx(dt) {
    for (const fx of this.fxExplosions) fx.p += dt / 0.55
    this.fxExplosions = this.fxExplosions.filter((f) => f.p < 1)
    for (const fx of this.fxImpacts) fx.t += dt
    this.fxImpacts = this.fxImpacts.filter((f) => f.t < f.dur)
    for (const fx of this.fxTracers) fx.t += dt
    this.fxTracers = this.fxTracers.filter((f) => f.t < f.dur)
    for (const f of this.floats) f.t += dt
    this.floats = this.floats.filter((f) => f.t < f.dur)
  }

  // ———— 渲染 ————

  draw() {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    if (this.shake > 0) {
      ctx.translate(rand(-1, 1) * 7 * this.shake, rand(-1, 1) * 5 * this.shake)
    }
    const st = this.stage
    drawScene(ctx, st, this.t, this.cam)

    const inBattle = ['advance', 'combat', 'clear', 'over'].includes(this.phase)
    if (inBattle) {
      // 掩体
      for (const slot of st.slots) drawCover(ctx, slot, this.t)
      // 补给箱
      for (const p of this.pickups) drawPickup(ctx, p, this.t)
      // 掩体后敌兵（远→近）
      for (const e of [...this.enemies].sort((a, b) => a.s - b.s)) drawTrooper(ctx, e, this.t)
      // 冲锋浪人（掩体前）
      for (const e of this.rushers) drawRusher(ctx, e, this.t)
      // 投掷物
      for (const g of this.lobs) drawLobShell(ctx, g, this.t)
      for (const n of this.playerNades) drawPlayerNade(ctx, n)
      // 爆炸与弹着
      for (const fx of this.fxExplosions) drawExplosion(ctx, fx)
      for (const fx of this.fxImpacts) {
        if (fx.slash) {
          ctx.save()
          ctx.globalAlpha = 1 - fx.t / fx.dur
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.arc(W / 2, H + 160, 330, -Math.PI * 0.72, -Math.PI * 0.28)
          ctx.stroke()
          ctx.lineWidth = 1
          ctx.restore()
        } else {
          ctx.save()
          ctx.globalAlpha = 1 - fx.t / fx.dur
          ctx.fillStyle = fx.color
          ctx.beginPath()
          ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
      // 曳弹
      for (const fx of this.fxTracers) {
        ctx.save()
        ctx.globalAlpha = 1 - fx.t / fx.dur
        ctx.strokeStyle = 'rgba(255,230,150,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(fx.x1, fx.y1)
        ctx.lineTo(fx.x2, fx.y2)
        ctx.stroke()
        ctx.restore()
      }
      // 枪械视图与准星
      const w = this.weapons[this.weaponIdx]
      const relP = this.reloadT > 0 && w.reload ? 1 - this.reloadT / w.reload : 0
      drawGunView(ctx, w.id, this.kick, relP, this.crouch, this.t)
      if (this.phase === 'combat' && !this.crouch) {
        this.hoverHead = this.checkHover()
        drawCrosshair(ctx, this.mx, this.my, w.id, this.kick * 6 + (w.auto ? 4 : 0), this.hoverHead)
      }
      if (this.boss) drawBossBar(ctx, this.boss.name, Math.max(0, this.boss.hp / this.boss.maxHp))
      if (this.cheat) {
        ctx.save()
        ctx.font = 'bold 14px "Microsoft YaHei",sans-serif'
        ctx.fillStyle = 'rgba(255,130,80,0.95)'
        ctx.fillText('😈 作弊模式', 16, 28)
        ctx.restore()
      }
    }

    // 推进横幅
    if (this.phase === 'advance') {
      const p = this.advanceT / 2.8
      const alpha = p < 0.12 ? p / 0.12 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1
      drawBanner(ctx, alpha, st.full, st.date)
    }
    // 飘字
    for (const f of this.floats) drawFloatText(ctx, f)
    drawHitVignette(ctx, this.hurtV)
    drawLowHp(ctx, this.hp / this.maxHp)
    ctx.restore()
  }

  checkHover() {
    for (const e of [...this.enemies, ...this.rushers]) {
      if (e.deadT > 0 || e.sink > 30) continue
      const headY = e.y + (e.sink || 0) - (e.type === 'kneemortar' ? 60 : 71) * e.s
      if (Math.hypot(this.mx - e.x, this.my - headY) < 11 * e.s + 5) return true
    }
    return false
  }

  loop(ts) {
    if (this.destroyed) return
    requestAnimationFrame(this.loop)
    if (!this.lastTs) this.lastTs = ts
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    if (!this.paused) {
      this.t += dt
      this.update(dt)
    }
    this.draw()
    this.emit()
  }

  destroy() {
    this.destroyed = true
  }

  // ———— HUD 状态同步（有变化才通知 Vue） ————

  emit(force) {
    const st = this.stage
    const snap = {
      phase: this.phase,
      paused: this.paused,
      stageIndex: this.stageIndex,
      stageCount: STAGES.length,
      stageFull: st.full,
      stageName: st.name,
      stageDate: st.date,
      story: st.story,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      score: this.score,
      kills: this.kills,
      headshots: this.headshots,
      shots: this.shots,
      hits: this.hits,
      stageKills: this.stageKills,
      weaponIdx: this.weaponIdx,
      nades: this.nades,
      cheat: this.cheat,
      cheated: this.cheated,
      stamina: Math.round(this.stamina),
      exhaust: this.exhaustT > 0,
      crouch: this.crouch,
      weapons: this.weapons.map((w) => ({
        id: w.id, short: w.short, name: w.name,
        magNow: w.magNow, mag: w.mag,
        // reserve 用 -1 表示无限（Infinity 无法通过 JSON 快照）
        reserve: w.reserve === Infinity ? -1 : w.reserve
      })),
      boss: this.boss ? { name: this.boss.name, frac: Math.max(0, this.boss.hp / this.boss.maxHp) } : null
    }
    const j = JSON.stringify(snap)
    if (force || j !== this.lastSnap) {
      this.lastSnap = j
      this.onState(snap)
    }
  }
}
