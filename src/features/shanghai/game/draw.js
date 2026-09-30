// 程序化渲染：场景、掩体、士兵、特效全部用 canvas 绘制，零外部素材
// 坐标基于 960×540 逻辑画布；世界宽 2400，cam 为相机横向滚动像素

export const VIEW_W = 960
export const VIEW_H = 540
const WORLD_W = 2400

// ———— 小工具 ————

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const SIGNS = ['米行', '茶樓', '酒家', '當鋪', '旅社', '理髮', '藥房', '綢布莊', '南貨', '烟紙', '書局', '飯店', '布號', '金號']
const SIGN_COLORS = [['#1d1d1d', '#e8c56a'], ['#26303c', '#e8e2c8'], ['#4a1f1f', '#f0d8a0'], ['#173a2a', '#cfe8b8']]

// ———— 场景部件缓存 ————

const sceneCache = new Map()

function getParts(st) {
  if (sceneCache.has(st.key)) return sceneCache.get(st.key)
  const rng = mulberry32(st.key.length * 7919 + 1234)
  const parts = { far: [], mid: [], props: [], lamps: [] }

  if (st.props === 'street' || st.props === 'dock' || st.props === 'hq') {
    // 远景剪影
    let x = -120
    while (x < WORLD_W + 120) {
      const w = 80 + rng() * 130
      parts.far.push({ x, w, h: 55 + rng() * 85, tower: rng() < 0.14, dome: rng() < 0.1 })
      x += w + 4 + rng() * 26
    }
    // 近景店铺/仓库
    x = -100
    while (x < WORLD_W + 100) {
      const w = 150 + rng() * 110
      const c = SIGN_COLORS[(rng() * SIGN_COLORS.length) | 0]
      parts.mid.push({
        x, w, h: 140 + rng() * 80, sign: SIGNS[(rng() * SIGNS.length) | 0],
        sc: c, lit: rng() < 0.75, seed: rng() * 10, door: rng() < 0.5
      })
      x += w + 10 + rng() * 26
    }
    // 路面杂物 / 电线杆
    x = -60
    while (x < WORLD_W + 60) {
      parts.props.push({ x, kind: rng() < 0.3 ? 'pole' : rng() < 0.55 ? 'debris' : rng() < 0.8 ? 'barrel' : 'post' })
      x += 90 + rng() * 200
    }
  } else if (st.props === 'ballroom') {
    // 舞厅内景：壁板、壁灯、枝形吊灯、沿墙圆桌
    let x = -60
    while (x < WORLD_W + 60) {
      parts.far.push({ x, w: 130 + rng() * 60 })
      x += 150 + rng() * 40
    }
    for (let lx = 100; lx < WORLD_W; lx += 260) parts.props.push({ x: lx, kind: 'wallamp' })
    for (let cx = 320; cx < WORLD_W; cx += 640) parts.props.push({ x: cx, kind: 'chandelier' })
    for (let tx = 200; tx < WORLD_W; tx += 300) parts.props.push({ x: tx, kind: 'walltable' })
  }

  if (st.props === 'dock') {
    for (let cx = 240; cx < WORLD_W; cx += 520) parts.props.push({ x: cx, kind: 'crane' })
    for (let lx = 140; lx < WORLD_W; lx += 200) parts.lamps.push({ x: lx })
  }
  if (st.props === 'street') {
    parts.mid[2].sign = '當鋪'
    parts.mid[6].sign = '旅社'
  }
  if (st.props === 'hq') {
    parts.gateX = WORLD_W / 2
    for (let wx = 260; wx < WORLD_W; wx += 640) parts.props.push({ x: wx, kind: 'watchtower' })
  }

  sceneCache.set(st.key, parts)
  return parts
}

function skyGradient(ctx, st) {
  const g = ctx.createLinearGradient(0, 0, 0, st.groundY)
  g.addColorStop(0, st.sky[0])
  g.addColorStop(0.62, st.sky[1])
  g.addColorStop(1, st.sky[2])
  return g
}

// ———— 场景 ————

export function drawScene(ctx, st, t, cam) {
  const horizon = st.groundY - 70
  ctx.fillStyle = skyGradient(ctx, st)
  ctx.fillRect(0, 0, VIEW_W, st.groundY + 2)

  const P = getParts(st)

  if (st.props === 'street') drawStreetSky(ctx, t)
  if (st.props === 'dock') drawDockSky(ctx, t)
  if (st.props === 'hq') drawHqSky(ctx, t, P)

  // 远景剪影（视差 0.22）
  ctx.save()
  ctx.translate(-cam * 0.22, 0)
  ctx.fillStyle = st.props === 'ballroom' ? '#1c070c' : 'rgba(12,14,20,0.85)'
  for (const b of P.far) {
    if (st.props === 'ballroom') {
      ctx.fillRect(b.x, horizon - 150, b.w - 12, 150)
      continue
    }
    ctx.fillRect(b.x, horizon - b.h, b.w, b.h)
    if (b.tower) ctx.fillRect(b.x + b.w / 2 - 5, horizon - b.h - 34, 10, 34)
    if (b.dome) {
      ctx.beginPath()
      ctx.arc(b.x + b.w / 2, horizon - b.h, b.w / 3, Math.PI, 0)
      ctx.fill()
    }
  }
  ctx.restore()

  // 中景主排（视差 0.5）
  ctx.save()
  ctx.translate(-cam * 0.5, 0)
  for (const b of P.mid) {
    if (st.props === 'dock') drawWarehouse(ctx, b, t)
    else drawShop(ctx, b, t)
  }
  ctx.restore()

  // 中景附属（吊车 / 灯塔 / 吊灯等，视差 0.5）
  ctx.save()
  ctx.translate(-cam * 0.5, 0)
  for (const p of P.props) {
    if (st.props === 'dock' && p.kind === 'crane') drawCrane(ctx, p.x, horizon, t)
    if (st.props === 'ballroom') {
      if (p.kind === 'chandelier') drawChandelier(ctx, p.x, 118, t)
      if (p.kind === 'wallamp') drawWallLamp(ctx, p.x, 250, t)
      if (p.kind === 'walltable') drawWallTable(ctx, p.x, horizon + 8)
    }
    if (st.props === 'hq' && p.kind === 'watchtower') drawWatchtower(ctx, p.x, horizon, t)
  }
  if (st.props === 'hq') drawGateWall(ctx, P.gateX - cam * 0.5, horizon, t)
  if (st.props === 'dock') for (const l of P.lamps) drawDockLamp(ctx, l.x, horizon + 6, t)
  ctx.restore()

  // 地面
  drawGround(ctx, st, t, cam)
}

function drawStreetSky(ctx, t) {
  // 落日余晖与远处浓烟
  const g = ctx.createRadialGradient(700, 120, 10, 700, 120, 260)
  g.addColorStop(0, 'rgba(255,150,60,0.5)')
  g.addColorStop(1, 'rgba(255,150,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(440, 0, 520, 300)
  ctx.fillStyle = 'rgba(20,16,18,0.55)'
  for (let i = 0; i < 3; i++) {
    const bx = 120 + i * 330
    for (let j = 0; j < 5; j++) {
      const p = ((t * 0.14 + j * 0.2 + i * 0.33) % 1)
      ctx.beginPath()
      ctx.arc(bx + Math.sin(t * 0.7 + j + i) * 14 * p, 250 - p * 200, 12 + p * 30, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawDockSky(ctx, t) {
  ctx.fillStyle = 'rgba(235,238,245,0.9)'
  ctx.beginPath(); ctx.arc(790, 92, 26, 0, Math.PI * 2); ctx.fill()
  const g = ctx.createRadialGradient(790, 92, 10, 790, 92, 150)
  g.addColorStop(0, 'rgba(200,215,240,0.35)')
  g.addColorStop(1, 'rgba(200,215,240,0)')
  ctx.fillStyle = g
  ctx.fillRect(640, 0, 300, 260)
  ctx.fillStyle = 'rgba(230,235,245,0.5)'
  const rng = mulberry32(7)
  for (let i = 0; i < 40; i++) {
    const sx = rng() * VIEW_W, sy = rng() * 230
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))
    ctx.fillRect(sx, sy, 1.6, 1.6)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(150,170,200,0.08)'
  for (let i = 0; i < 4; i++) {
    const cx = ((t * 8 + i * 300) % (VIEW_W + 400)) - 200
    ctx.beginPath()
    ctx.ellipse(cx, 70 + i * 30, 150, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHqSky(ctx, t, P) {
  // 探照灯光束
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < 2; i++) {
    const bx = 200 + i * 560, by = 60
    const ang = Math.sin(t * 0.35 + i * 2.1) * 0.55
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(ang)
    const g = ctx.createLinearGradient(0, 0, 0, 460)
    g.addColorStop(0, 'rgba(220,235,255,0.28)')
    g.addColorStop(1, 'rgba(220,235,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(120, 460); ctx.lineTo(-120, 460)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  ctx.restore()
  // 闪电
  const cycle = t % 9
  if (cycle > 8.72) {
    ctx.fillStyle = `rgba(210,225,255,${0.18 * (1 - (cycle - 8.72) / 0.28)})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
}

function drawShop(ctx, b, t) {
  const horizon = 398
  const top = horizon - b.h
  ctx.fillStyle = '#33291f'
  ctx.fillRect(b.x, top, b.w, b.h + 26)
  ctx.fillStyle = '#241c14'
  ctx.fillRect(b.x, top, b.w, 14)
  // 招牌
  const [bg, fg] = b.sc
  ctx.fillStyle = bg
  ctx.fillRect(b.x + 8, top + 22, b.w - 16, 26)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.strokeRect(b.x + 8, top + 22, b.w - 16, 26)
  ctx.fillStyle = fg
  ctx.font = '19px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(b.sign, b.x + b.w / 2, top + 36)
  // 窗
  const cols = Math.max(2, Math.floor(b.w / 52))
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 2; r++) {
      const wx = b.x + 14 + c * ((b.w - 24) / cols)
      const wy = top + 60 + r * 42
      const on = b.lit && (Math.sin(t * 1.3 + b.seed + c * 2.7 + r) > -0.7)
      ctx.fillStyle = on ? 'rgba(255,178,92,0.85)' : '#141210'
      ctx.fillRect(wx, wy, 26, 30)
      ctx.strokeStyle = '#0c0a08'
      ctx.strokeRect(wx, wy, 26, 30)
      ctx.beginPath(); ctx.moveTo(wx + 13, wy); ctx.lineTo(wx + 13, wy + 30); ctx.stroke()
    }
  }
  if (b.door) {
    ctx.fillStyle = '#191410'
    ctx.fillRect(b.x + b.w / 2 - 17, horizon - 34, 34, 34)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawWarehouse(ctx, b, t) {
  void t
  const horizon = 398
  const top = horizon - b.h
  ctx.fillStyle = '#232c38'
  ctx.fillRect(b.x, top, b.w, b.h + 26)
  ctx.fillStyle = '#1a212b'
  ctx.fillRect(b.x, top, b.w, 18)
  ctx.strokeStyle = 'rgba(10,14,20,0.6)'
  for (let i = 1; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(b.x, top + 18 + i * (b.h / 6)); ctx.lineTo(b.x + b.w, top + 18 + i * (b.h / 6))
    ctx.stroke()
  }
  // 大铁门与白字
  ctx.fillStyle = '#161c25'
  ctx.fillRect(b.x + b.w / 2 - 30, horizon - 52, 60, 52)
  ctx.strokeStyle = '#0d1117'; ctx.strokeRect(b.x + b.w / 2 - 30, horizon - 52, 60, 52)
  ctx.fillStyle = 'rgba(220,228,238,0.75)'
  ctx.font = '15px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  ctx.fillText('軍需棧', b.x + b.w / 2, horizon - 30)
  ctx.textAlign = 'left'
}

function drawCrane(ctx, x, horizon, t) {
  ctx.strokeStyle = 'rgba(10,14,22,0.9)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(x, horizon); ctx.lineTo(x, horizon - 190)
  ctx.moveTo(x + 90, horizon); ctx.lineTo(x + 90, horizon - 190)
  ctx.moveTo(x - 20, horizon - 190); ctx.lineTo(x + 110, horizon - 190)
  ctx.moveTo(x, horizon - 120); ctx.lineTo(x + 90, horizon - 190)
  ctx.stroke()
  const sway = Math.sin(t * 0.8) * 8
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x + 60, horizon - 186); ctx.lineTo(x + 60 + sway, horizon - 90); ctx.stroke()
  ctx.fillStyle = 'rgba(10,14,22,0.9)'
  ctx.fillRect(x + 52 + sway, horizon - 90, 16, 12)
  ctx.lineWidth = 1
}

function drawWatchtower(ctx, x, horizon, t) {
  void t
  ctx.fillStyle = '#10161e'
  ctx.beginPath()
  ctx.moveTo(x - 16, horizon); ctx.lineTo(x - 6, horizon - 130); ctx.lineTo(x + 6, horizon - 130); ctx.lineTo(x + 16, horizon)
  ctx.closePath(); ctx.fill()
  ctx.fillRect(x - 20, horizon - 158, 40, 30)
  ctx.beginPath()
  ctx.moveTo(x - 24, horizon - 158); ctx.lineTo(x, horizon - 178); ctx.lineTo(x + 24, horizon - 158)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(255,220,140,0.6)'
  ctx.fillRect(x - 12, horizon - 152, 24, 14)
}

function drawGateWall(ctx, gx, horizon, t) {
  // 司令部围墙 + 大门
  const wallH = 84
  ctx.fillStyle = '#232b33'
  ctx.fillRect(-200, horizon - wallH, VIEW_W + 500, wallH)
  ctx.fillStyle = '#1a2129'
  ctx.fillRect(-200, horizon - wallH, VIEW_W + 500, 10)
  for (let x = -200; x < VIEW_W + 300; x += 46) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(x, horizon - wallH + 10, 44, wallH - 10)
  }
  // 大门拱
  ctx.fillStyle = '#161d24'
  ctx.beginPath()
  ctx.moveTo(gx - 74, horizon)
  ctx.lineTo(gx - 74, horizon - 110)
  ctx.quadraticCurveTo(gx, horizon - 168, gx + 74, horizon - 110)
  ctx.lineTo(gx + 74, horizon)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#3c4a58'; ctx.lineWidth = 3
  ctx.stroke()
  ctx.lineWidth = 1
  // 门匾
  ctx.fillStyle = '#0d1218'
  rr(ctx, gx - 58, horizon - 138, 116, 24, 4); ctx.fill()
  ctx.fillStyle = '#d8b95c'
  ctx.font = 'bold 15px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  ctx.fillText('司 令 部', gx, horizon - 121)
  ctx.textAlign = 'left'
  // 旗
  for (const fx of [gx - 150, gx + 150]) {
    ctx.strokeStyle = '#1a212a'
    ctx.beginPath(); ctx.moveTo(fx, horizon - 84); ctx.lineTo(fx, horizon - 150); ctx.stroke()
    const wave = Math.sin(t * 2.4 + fx) * 4
    ctx.fillStyle = '#e8e4da'
    ctx.beginPath()
    ctx.moveTo(fx, horizon - 150)
    ctx.quadraticCurveTo(fx + 18, horizon - 146 + wave, fx + 36, horizon - 150 + wave)
    ctx.lineTo(fx + 36, horizon - 122 + wave)
    ctx.quadraticCurveTo(fx + 18, horizon - 126 + wave, fx, horizon - 122)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#c22e2e'
    ctx.beginPath(); ctx.arc(fx + 18, horizon - 136 + wave * 0.6, 7, 0, Math.PI * 2); ctx.fill()
  }
}

function drawDockLamp(ctx, x, y, t) {
  ctx.strokeStyle = '#141a22'
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 64); ctx.lineTo(x + 14, y - 64); ctx.stroke()
  const fl = 0.75 + 0.25 * Math.sin(t * 6 + x)
  ctx.fillStyle = `rgba(255,196,110,${0.85 * fl})`
  ctx.beginPath(); ctx.arc(x + 14, y - 60, 5, 0, Math.PI * 2); ctx.fill()
  const g = ctx.createRadialGradient(x + 14, y - 60, 2, x + 14, y - 60, 46)
  g.addColorStop(0, `rgba(255,190,100,${0.28 * fl})`)
  g.addColorStop(1, 'rgba(255,190,100,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x + 14, y - 60, 46, 0, Math.PI * 2); ctx.fill()
}

function drawChandelier(ctx, x, y, t) {
  ctx.strokeStyle = '#8a6a30'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x, y - 20); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y - 8, 26, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y - 2, 40, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke()
  ctx.lineWidth = 1
  for (let i = -2; i <= 2; i++) {
    const cx = x + i * 12, cy = y - 8 - Math.cos(i * 0.5) * 8
    const fl = 0.7 + 0.3 * Math.sin(t * 7 + i * 1.7 + x)
    ctx.fillStyle = `rgba(255,214,130,${0.9 * fl})`
    ctx.beginPath(); ctx.ellipse(cx, cy, 2.4, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  }
  const g = ctx.createRadialGradient(x, y - 4, 6, x, y - 4, 90)
  g.addColorStop(0, 'rgba(255,196,110,0.20)')
  g.addColorStop(1, 'rgba(255,196,110,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y - 4, 90, 0, Math.PI * 2); ctx.fill()
}

function drawWallLamp(ctx, x, y, t) {
  const fl = 0.72 + 0.28 * Math.sin(t * 5 + x)
  ctx.fillStyle = '#6d5326'
  ctx.fillRect(x - 3, y - 14, 6, 20)
  ctx.fillStyle = `rgba(255,206,120,${0.9 * fl})`
  ctx.beginPath(); ctx.ellipse(x, y + 8, 7, 9, 0, 0, Math.PI * 2); ctx.fill()
  const g = ctx.createRadialGradient(x, y + 10, 3, x, y + 10, 52)
  g.addColorStop(0, `rgba(255,200,110,${0.22 * fl})`)
  g.addColorStop(1, 'rgba(255,200,110,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y + 10, 52, 0, Math.PI * 2); ctx.fill()
}

function drawWallTable(ctx, x, y) {
  ctx.fillStyle = '#2c1016'
  ctx.fillRect(x - 14, y - 22, 28, 22)
  ctx.fillStyle = '#3c161d'
  ctx.beginPath(); ctx.ellipse(x, y - 22, 16, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,200,120,0.5)'
  ctx.beginPath(); ctx.arc(x, y - 30, 4, 0, Math.PI * 2); ctx.fill()
}

function drawGround(ctx, st, t, cam) {
  const gy = st.groundY
  if (st.props === 'ballroom') {
    // 舞厅地板：透视木地板 + 中央红毯
    ctx.fillStyle = '#3a2418'
    ctx.fillRect(0, gy - 78, VIEW_W, VIEW_H - gy + 78)
    ctx.strokeStyle = 'rgba(20,10,6,0.5)'
    for (let i = 0; i <= 16; i++) {
      const x0 = i * 64 - (cam * 0.9) % 64 - 64
      ctx.beginPath(); ctx.moveTo(x0, gy - 78); ctx.lineTo(x0 - 130 + (VIEW_W / 2 - x0) * 0.1, VIEW_H); ctx.stroke()
    }
    for (let i = 1; i < 5; i++) {
      const y = gy - 78 + (i / 5) * (VIEW_H - gy + 78) ** 0.92 * 1.05
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(122,26,30,0.85)'
    ctx.beginPath()
    ctx.moveTo(VIEW_W / 2 - 130, gy - 78)
    ctx.lineTo(VIEW_W / 2 + 130, gy - 78)
    ctx.lineTo(VIEW_W / 2 + 250, VIEW_H)
    ctx.lineTo(VIEW_W / 2 - 250, VIEW_H)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#b08a3e'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.lineWidth = 1
    return
  }
  if (st.props === 'street') {
    ctx.fillStyle = '#2c2620'
  } else if (st.props === 'dock') {
    ctx.fillStyle = '#252b22'
  } else {
    ctx.fillStyle = '#1f2429'
  }
  ctx.fillRect(0, gy, VIEW_W, VIEW_H - gy)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, gy, VIEW_W, 6)
  // 路面横线（视差 1.0）
  ctx.save()
  ctx.translate(-cam, 0)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  for (let x = 0; x < WORLD_W + VIEW_W; x += 120) {
    ctx.beginPath(); ctx.moveTo(x, gy + 18); ctx.lineTo(x + 60, gy + 18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 30, gy + 44); ctx.lineTo(x + 110, gy + 44); ctx.stroke()
  }
  ctx.restore()
  // 街面杂物
  ctx.save()
  ctx.translate(-cam, 0)
  for (const p of getParts(st).props) {
    if (st.props === 'street' && p.kind === 'barrel') drawFireBarrel(ctx, p.x, gy + 34, t)
    else if (st.props === 'street' && p.kind === 'pole') drawPole(ctx, p.x, gy - 2)
    else if (p.kind === 'debris') drawDebris(ctx, p.x, gy + 10 + (p.x % 30))
    else if (st.props === 'dock' && p.kind === 'barrel') drawPost(ctx, p.x, gy + 30)
    else if (st.props === 'hq' && p.kind === 'barrel') drawWire(ctx, p.x, gy + 26)
  }
  ctx.restore()
  if (st.props === 'hq') drawRain(ctx, t)
}

function drawFireBarrel(ctx, x, y, t) {
  ctx.fillStyle = '#221a12'
  ctx.fillRect(x - 11, y - 26, 22, 26)
  ctx.fillStyle = '#171008'
  ctx.fillRect(x - 11, y - 20, 22, 3)
  const fl = Math.sin(t * 9 + x) * 3
  const g = ctx.createRadialGradient(x, y - 30, 2, x, y - 30, 40)
  g.addColorStop(0, 'rgba(255,170,60,0.5)')
  g.addColorStop(1, 'rgba(255,120,30,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y - 30, 40, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f5a23a'
  ctx.beginPath()
  ctx.ellipse(x, y - 30 + fl * 0.4, 6, 12 + fl, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffd890'
  ctx.beginPath()
  ctx.ellipse(x, y - 27, 3, 6 + fl * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawPole(ctx, x, y) {
  ctx.strokeStyle = '#16110c'
  ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 150); ctx.stroke()
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x - 26, y - 136); ctx.lineTo(x + 26, y - 136); ctx.moveTo(x - 20, y - 120); ctx.lineTo(x + 20, y - 120); ctx.stroke()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(10,8,6,0.7)'
  ctx.beginPath()
  ctx.moveTo(x - 26, y - 136)
  ctx.quadraticCurveTo(x + 200, y - 100, x + 420, y - 136)
  ctx.stroke()
}

function drawPost(ctx, x, y) {
  ctx.fillStyle = '#1a1410'
  ctx.beginPath(); ctx.ellipse(x, y, 9, 6, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(x - 4, y - 16, 8, 14)
}

function drawWire(ctx, x, y) {
  ctx.strokeStyle = '#39424c'
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(x + i * 14, y)
    ctx.lineTo(x + i * 14 + 7, y - 10)
    ctx.lineTo(x + i * 14 + 14, y)
  }
  ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 46, y); ctx.stroke()
}

function drawDebris(ctx, x, y) {
  ctx.fillStyle = '#241d16'
  ctx.beginPath()
  ctx.ellipse(x, y, 20, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#332a20'
  ctx.fillRect(x - 8, y - 10, 9, 9)
  ctx.fillRect(x + 3, y - 7, 6, 6)
}

function drawRain(ctx, t) {
  const rng = mulberry32(99)
  ctx.strokeStyle = 'rgba(180,200,225,0.30)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < 70; i++) {
    const bx = rng() * (VIEW_W + 100)
    const speed = 420 + rng() * 200
    const y = ((t * speed + rng() * 800) % 620) - 40
    ctx.moveTo(bx - y * 0.18, y)
    ctx.lineTo(bx - y * 0.18 - 5, y + 15)
  }
  ctx.stroke()
}

// ———— 掩体 ————

export function drawCover(ctx, slot, t) {
  const { x, y, s, cover } = slot
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (cover === 'sandbag') {
    ctx.fillStyle = '#8f7d58'
    for (let r = 0; r < 3; r++) {
      const n = 3 - (r % 2)
      for (let i = 0; i <= n; i++) {
        const bx = (i - n / 2) * 26 + (r % 2 ? 13 : 0)
        ctx.beginPath(); ctx.ellipse(bx, -8 - r * 13, 15, 8, 0, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(-40, -4, 80, 5)
  } else if (cover === 'crate') {
    ctx.fillStyle = '#6d5433'
    ctx.fillRect(-34, -42, 68, 42)
    ctx.fillStyle = '#57422a'
    ctx.fillRect(-34, -42, 68, 6)
    ctx.fillRect(-34, -23, 68, 4)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.strokeRect(-34, -42, 68, 42)
    ctx.fillStyle = 'rgba(230,220,200,0.5)'
    ctx.font = 'bold 16px "Kaiti SC","STKaiti","KaiTi",serif'
    ctx.textAlign = 'center'
    ctx.fillText('軍', 0, -14)
    ctx.fillStyle = '#6d5433'
    ctx.fillRect(-24, -66, 48, 24)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.strokeRect(-24, -66, 48, 24)
    ctx.textAlign = 'left'
  } else if (cover === 'wreck') {
    ctx.fillStyle = '#3a2f28'
    rr(ctx, -46, -34, 92, 26, 6); ctx.fill()
    rr(ctx, -28, -48, 46, 18, 5); ctx.fill()
    ctx.fillStyle = '#241d18'
    ctx.beginPath(); ctx.arc(-26, -8, 9, 0, Math.PI * 2); ctx.arc(26, -8, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(200,220,235,0.16)'
    ctx.fillRect(-24, -46, 18, 12)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(-46, -14, 92, 6)
  } else if (cover === 'rubble') {
    ctx.fillStyle = '#37302a'
    ctx.beginPath(); ctx.ellipse(0, -6, 44, 16, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#463d33'
    ctx.fillRect(-20, -22, 16, 14); ctx.fillRect(2, -28, 20, 12); ctx.fillRect(18, -16, 12, 10)
    ctx.fillStyle = '#2a241f'
    ctx.fillRect(-8, -16, 10, 8)
  } else if (cover === 'pillar') {
    ctx.fillStyle = '#4a2430'
    ctx.fillRect(-20, -96, 40, 96)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(-20, -96, 8, 96)
    ctx.fillStyle = '#5d2f3c'
    ctx.fillRect(-24, -104, 48, 10)
    ctx.fillRect(-24, -14, 48, 14)
    ctx.fillStyle = '#b08a3e'
    ctx.fillRect(-24, -96, 48, 3)
    ctx.fillRect(-24, -18, 48, 3)
  } else if (cover === 'table') {
    ctx.fillStyle = '#e0d4bc'
    ctx.beginPath(); ctx.ellipse(0, -26, 40, 14, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath(); ctx.ellipse(0, -18, 40, 12, 0, 0, Math.PI); ctx.fill()
    ctx.fillStyle = '#8a2a30'
    ctx.fillRect(-8, -26, 16, 26)
    ctx.fillStyle = '#b03a40'
    ctx.beginPath(); ctx.ellipse(0, -30, 12, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffd890'
    ctx.beginPath(); ctx.arc(0, -38, 4, 0, Math.PI * 2); ctx.fill()
    const g = ctx.createRadialGradient(0, -38, 2, 0, -38, 34)
    g.addColorStop(0, 'rgba(255,200,110,0.4)')
    g.addColorStop(1, 'rgba(255,200,110,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(0, -38, 34, 0, Math.PI * 2); ctx.fill()
  } else if (cover === 'sofa') {
    ctx.fillStyle = '#5d1f28'
    rr(ctx, -44, -40, 88, 34, 8); ctx.fill()
    ctx.fillStyle = '#6d2833'
    rr(ctx, -44, -52, 20, 30, 6); ctx.fill()
    rr(ctx, 24, -52, 20, 30, 6); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    rr(ctx, -20, -44, 40, 10, 5); ctx.fill()
  } else if (cover === 'rail') {
    ctx.strokeStyle = '#3c2a20'
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(-50, -34); ctx.lineTo(50, -34); ctx.moveTo(-50, -22); ctx.lineTo(50, -22); ctx.moveTo(-50, -10); ctx.lineTo(50, -10); ctx.stroke()
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 22, -38); ctx.lineTo(i * 22, -4); ctx.stroke()
    }
    ctx.lineWidth = 1
  } else if (cover === 'door') {
    // 门框：敌人站门内，躲入时靠淡出
    ctx.fillStyle = '#241a10'
    ctx.fillRect(-4, -78, 8, 78)
    ctx.fillRect(40, -78, 8, 78)
    ctx.fillRect(-4, -86, 52, 10)
    ctx.fillStyle = 'rgba(255,220,150,0.12)'
    ctx.fillRect(4, -78, 36, 78)
  }
  ctx.restore()
}

// ———— 敌兵 ————

const UNI = { cloth: '#9a9259', clothDark: '#7c744a', helmet: '#5a5f38', skin: '#d8a06c', boot: '#2e2a22', rifle: '#3a3226' }

function bodyColors(e) {
  if (e.hitT > 0) return { ...UNI, cloth: '#d8d4c0', clothDark: '#b8b4a0', helmet: '#c8ccc0', skin: '#f0e0d0' }
  return UNI
}

// 步枪兵 / 军官 / 掷弹筒 / Boss 通用直立兵
export function drawTrooper(ctx, e, t) {
  const c = bodyColors(e)
  const s = e.s
  ctx.save()
  ctx.translate(e.x, e.y + (e.sink || 0))
  ctx.scale(s, s)
  ctx.globalAlpha = e.fade != null ? e.fade : 1
  if (e.deadT > 0) {
    const p = Math.min(1, e.deadT / 0.5)
    ctx.rotate(-p * Math.PI / 2 * (e.side > 0 ? 1 : -1))
    ctx.globalAlpha *= 1 - p * 0.7
  }
  const officer = e.type === 'officer' || e.type === 'boss'
  const kneel = e.type === 'kneemortar'
  const bob = e.deadT > 0 ? 0 : Math.sin(t * 3 + e.seed * 7) * 1.2
  ctx.translate(0, bob)

  // 腿
  ctx.fillStyle = c.clothDark
  if (kneel) {
    ctx.fillRect(-11, -26, 10, 26)
    ctx.fillRect(3, -18, 9, 18)
    ctx.fillStyle = c.boot
    ctx.fillRect(-12, -6, 12, 6)
    ctx.fillRect(2, -6, 12, 6)
  } else {
    ctx.fillRect(-11, -30, 10, 30)
    ctx.fillRect(2, -30, 10, 30)
    ctx.fillStyle = c.boot
    ctx.fillRect(-12, -7, 12, 7)
    ctx.fillRect(2, -7, 12, 7)
  }
  // 上身
  const torsoTop = kneel ? -56 : -62
  ctx.fillStyle = officer ? (e.type === 'boss' ? '#5d5537' : '#6f6644') : c.cloth
  rr(ctx, -14, torsoTop, 28, 32, 4); ctx.fill()
  // 武装带
  ctx.fillStyle = '#4a3c28'
  ctx.fillRect(-14, torsoTop + 20, 28, 5)
  ctx.fillRect(-4, torsoTop, 5, 32)
  if (officer) {
    ctx.fillStyle = '#c8a850'
    ctx.fillRect(-14, torsoTop + 3, 7, 3)
    ctx.fillRect(7, torsoTop + 3, 7, 3)
  }
  // 头
  const headY = torsoTop - 9
  ctx.fillStyle = c.skin
  ctx.beginPath(); ctx.arc(0, headY, 7.5, 0, Math.PI * 2); ctx.fill()
  if (officer) {
    // 军帽
    ctx.fillStyle = '#4c4a30'
    ctx.beginPath(); ctx.ellipse(0, headY - 4, 8.5, 5.5, 0, Math.PI, 0); ctx.fill()
    ctx.fillRect(-8.5, headY - 5, 17, 3)
    ctx.fillStyle = '#2c2a1c'
    ctx.fillRect(-9, headY - 3, 18, 2.5)
    ctx.fillStyle = '#c8a850'
    ctx.beginPath(); ctx.arc(0, headY - 8, 1.8, 0, Math.PI * 2); ctx.fill()
  } else {
    // 钢盔
    ctx.fillStyle = c.helmet
    ctx.beginPath(); ctx.ellipse(0, headY - 3.5, 9.5, 7, 0, Math.PI, 0); ctx.fill()
    ctx.fillRect(-10, headY - 4.5, 20, 2.5)
  }
  // 武器（指向镜头的透视感）
  if (kneel) {
    ctx.fillStyle = '#2f2c26'
    rr(ctx, -4, torsoTop + 8, 8, 16, 3); ctx.fill()
    ctx.fillStyle = '#54504a'
    ctx.beginPath(); ctx.arc(0, torsoTop + 6, 5, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.fillStyle = c.rifle
    rr(ctx, -3, torsoTop + 6, 6, 20, 2); ctx.fill()
    ctx.fillStyle = '#59513f'
    ctx.fillRect(-5, torsoTop + 22, 10, 5)
  }
  // 手
  ctx.fillStyle = c.skin
  ctx.beginPath(); ctx.arc(-5, torsoTop + 12, 3, 0, Math.PI * 2); ctx.arc(5, torsoTop + 16, 3, 0, Math.PI * 2); ctx.fill()

  // 瞄准预警：枪口红光 + 头顶感叹号
  if (e.state === 'aim' && !e.deadT) {
    const p = e.aimP || 0
    const g = ctx.createRadialGradient(0, torsoTop + 4, 1, 0, torsoTop + 4, 10 + p * 16)
    g.addColorStop(0, `rgba(255,80,50,${0.55 + 0.4 * Math.sin(t * 14)})`)
    g.addColorStop(1, 'rgba(255,80,50,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(0, torsoTop + 4, 10 + p * 16, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = `rgba(255,70,50,${0.6 + 0.4 * Math.sin(t * 16)})`
    ctx.save()
    ctx.translate(0, headY - 24)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-5, -5, 10, 10)
    ctx.restore()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('!', 0, headY - 20)
    ctx.textAlign = 'left'
  }
  // 开火枪口焰
  if (e.state === 'shoot' && e.flashT > 0) {
    drawMuzzle(ctx, 0, torsoTop + 4, 1, e.flashT / 0.09)
  }
  ctx.restore()
}

// 挥刀浪人：从纵深冲向镜头
export function drawRusher(ctx, e, t) {
  const c = bodyColors(e)
  ctx.save()
  ctx.translate(e.x, e.y)
  ctx.scale(e.s, e.s)
  ctx.globalAlpha = e.fade != null ? e.fade : 1
  if (e.deadT > 0) {
    const p = Math.min(1, e.deadT / 0.5)
    ctx.rotate(p * Math.PI / 2)
    ctx.globalAlpha *= 1 - p * 0.7
  }
  const run = Math.sin(t * 13 + e.seed * 5)
  // 腿
  ctx.fillStyle = '#3c4045'
  ctx.fillRect(-11 + run * 5, -30, 10, 30)
  ctx.fillRect(2 - run * 5, -30, 10, 30)
  ctx.fillStyle = '#1e2023'
  ctx.fillRect(-13 + run * 5, -7, 13, 7)
  ctx.fillRect(1 - run * 5, -7, 13, 7)
  // 上身（前倾）
  ctx.save()
  ctx.rotate(0.06 * run)
  ctx.fillStyle = c.cloth
  rr(ctx, -14, -62, 28, 33, 4); ctx.fill()
  ctx.fillStyle = '#4a3c28'
  ctx.fillRect(-14, -42, 28, 5)
  // 头 + 白额巾
  ctx.fillStyle = c.skin
  ctx.beginPath(); ctx.arc(0, -71, 7.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#e8e4da'
  ctx.fillRect(-8, -77, 16, 5)
  ctx.fillStyle = '#c22e2e'
  ctx.beginPath(); ctx.arc(0, -74.5, 2.4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // 大刀
  ctx.save()
  ctx.translate(14, -52)
  ctx.rotate(e.state === 'windup' ? -2.1 + (e.aimP || 0) * 0.4 : -0.6 + run * 0.1)
  ctx.fillStyle = '#59513f'
  ctx.fillRect(-2, -2, 4, 20)
  ctx.fillStyle = '#cdd2d8'
  ctx.beginPath()
  ctx.moveTo(-3, 0)
  ctx.lineTo(3, 0)
  ctx.lineTo(2, -30)
  ctx.lineTo(0, -34)
  ctx.lineTo(-2, -30)
  ctx.closePath(); ctx.fill()
  if (e.state === 'windup') {
    ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.sin(t * 20)})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(10, -46); ctx.stroke()
    ctx.lineWidth = 1
  }
  ctx.restore()
  ctx.restore()
}

export function drawMuzzle(ctx, x, y, s, a) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.globalAlpha = Math.max(0, Math.min(1, a))
  ctx.fillStyle = '#ffe9a8'
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2
    const r = i % 2 === 0 ? 13 : 5
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
  }
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// ———— 投掷物 / 特效 ————

export function drawLobShell(ctx, g, t) {
  // 落点预警影
  const p = g.t / g.dur
  ctx.fillStyle = `rgba(200,40,30,${0.25 + 0.3 * Math.sin(t * 10)})`
  ctx.beginPath(); ctx.ellipse(g.tx, g.ty, 26 * (0.4 + p * 0.6), 9 * (0.4 + p * 0.6), 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2a2e26'
  ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#4a5044'
  ctx.beginPath(); ctx.arc(g.x - 2, g.y - 2, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(160,160,160,0.5)'
  ctx.beginPath(); ctx.arc(g.x - 6 - t * 20, g.y - 8 - t * 30, 3, 0, Math.PI * 2); ctx.fill()
}

export function drawPlayerNade(ctx, n) {
  ctx.save()
  ctx.translate(n.x, n.y)
  ctx.rotate(n.t * 12)
  ctx.fillStyle = '#3a4434'
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#59513f'
  ctx.fillRect(-2, -9, 4, 5)
  ctx.restore()
  ctx.fillStyle = 'rgba(200,200,200,0.4)'
  ctx.beginPath(); ctx.arc(n.x - 4, n.y - 6, 2, 0, Math.PI * 2); ctx.fill()
}

export function drawExplosion(ctx, fx) {
  const p = fx.p // 0..1
  const x = fx.x, y = fx.y, r = fx.r
  ctx.save()
  ctx.globalAlpha = 1 - p
  const g = ctx.createRadialGradient(x, y, 2, x, y, r * (0.4 + p * 0.8))
  g.addColorStop(0, `rgba(255,240,200,${0.9 * (1 - p)})`)
  g.addColorStop(0.35, `rgba(255,150,50,${0.75 * (1 - p)})`)
  g.addColorStop(1, 'rgba(120,60,30,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r * (0.4 + p * 0.8), 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = `rgba(255,200,120,${0.6 * (1 - p)})`
  ctx.lineWidth = 4 * (1 - p)
  ctx.beginPath(); ctx.arc(x, y, r * (0.5 + p * 1.1), 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 1
  // 烟团
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + fx.seed
    const d = p * r * 0.9
    ctx.fillStyle = `rgba(70,64,58,${0.5 * (1 - p)})`
    ctx.beginPath()
    ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d - p * 26, 10 + p * 22, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 3 + p.seed * 6) * 4
  ctx.save()
  ctx.translate(p.x, p.y + bob)
  const g = ctx.createRadialGradient(0, -14, 4, 0, -14, 40)
  g.addColorStop(0, 'rgba(255,220,120,0.4)')
  g.addColorStop(1, 'rgba(255,220,120,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, -14, 40, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#6d5433'
  rr(ctx, -16, -30, 32, 26, 3); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.strokeRect(-16, -30, 32, 26)
  ctx.fillStyle = '#f0e0b0'
  ctx.font = 'bold 15px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  const icon = { smg: '弹', lmg: '机', nade: '榴', med: '医' }[p.kind]
  ctx.fillText(icon, 0, -12)
  ctx.textAlign = 'left'
  if (p.kind === 'med') {
    ctx.fillStyle = '#c84040'
    ctx.fillRect(-2.5, -25, 5, 14)
    ctx.fillRect(-7, -20.5, 14, 5)
  }
  ctx.restore()
}

// ———— 玩家枪械视图 ————

export function drawGunView(ctx, w, kick, reloadP, crouch, t) {
  ctx.save()
  if (crouch) {
    // 蹲下：沙袋掩体升起
    ctx.fillStyle = '#8f7d58'
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.ellipse(70 + i * 140 + (r % 2 ? 70 : 0), VIEW_H + 12 - r * 22, 74, 22, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    for (let i = 0; i < 7; i++) ctx.fillRect(i * 140, VIEW_H - 26, 140, 5)
  }
  const dip = crouch ? 150 : 0
  const rl = reloadP * 90
  ctx.translate(VIEW_W / 2 + 120 + kick * 26, VIEW_H + 70 + dip + rl - kick * 10)
  ctx.rotate(-0.5 + kick * 0.22 - reloadP * 0.5)
  if (w === 'pistol') {
    ctx.fillStyle = '#26221c'
    rr(ctx, -14, -120, 26, 90, 5); ctx.fill()
    ctx.fillStyle = '#3a352c'
    ctx.fillRect(-9, -132, 16, 16)
    ctx.fillStyle = '#4a4438'
    ctx.fillRect(-14, -120, 26, 5)
    ctx.fillStyle = '#594f3c'
    ctx.fillRect(-8, -134, 8, 6)
  } else if (w === 'smg') {
    ctx.fillStyle = '#2b2a26'
    rr(ctx, -20, -160, 34, 130, 6); ctx.fill()
    ctx.fillStyle = '#3c3a34'
    ctx.fillRect(-15, -172, 24, 14)
    ctx.fillStyle = '#232320'
    ctx.fillRect(-8, -108, 14, 46)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-20, -150 + i * 8); ctx.lineTo(14, -150 + i * 8); ctx.stroke()
    }
  } else if (w === 'lmg') {
    ctx.fillStyle = '#2e2c26'
    rr(ctx, -18, -180, 30, 150, 5); ctx.fill()
    ctx.fillStyle = '#3a3830'
    ctx.fillRect(-12, -238, 20, 60)
    ctx.fillStyle = '#232320'
    ctx.beginPath(); ctx.arc(-2, -196, 15, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#44413a'
    ctx.fillRect(-4, -244, 8, 10)
  } else {
    // 手榴弹握持
    ctx.fillStyle = '#3a4434'
    ctx.beginPath(); ctx.ellipse(0, -110, 20, 15, 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#59513f'
    ctx.fillRect(-6, -128, 12, 14)
    ctx.fillStyle = '#8a8065'
    ctx.fillRect(-14, -132, 22, 5)
  }
  ctx.restore()
}

export function drawCrosshair(ctx, x, y, w, bloom, hostile) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = hostile ? 'rgba(255,90,60,0.95)' : 'rgba(240,240,230,0.9)'
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = 1.6
  if (w === 'nade') {
    ctx.setLineDash([5, 5])
    ctx.beginPath(); ctx.arc(0, 0, 16 + bloom, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill()
  } else {
    const g = 6 + bloom
    ctx.beginPath()
    ctx.moveTo(-g - 8, 0); ctx.lineTo(-g, 0)
    ctx.moveTo(g, 0); ctx.lineTo(g + 8, 0)
    ctx.moveTo(0, -g - 8); ctx.lineTo(0, -g)
    ctx.moveTo(0, g); ctx.lineTo(0, g + 8)
    ctx.stroke()
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill()
    if (w !== 'pistol') {
      ctx.beginPath(); ctx.arc(0, 0, g + 3, 0, Math.PI * 2); ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawBanner(ctx, alpha, title, sub) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 205, VIEW_W, 110)
  ctx.fillStyle = '#e8c56a'
  ctx.font = 'bold 44px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, VIEW_W / 2, 258)
  ctx.fillStyle = 'rgba(240,235,220,0.85)'
  ctx.font = '17px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.fillText(sub, VIEW_W / 2, 292)
  ctx.restore()
  ctx.textAlign = 'left'
}

export function drawBossBar(ctx, name, frac) {
  const w = 420, x = (VIEW_W - w) / 2, y = 22
  ctx.save()
  ctx.fillStyle = 'rgba(10,8,8,0.7)'
  rr(ctx, x - 8, y - 8, w + 16, 30, 8); ctx.fill()
  ctx.fillStyle = '#3a1414'
  rr(ctx, x, y, w, 14, 5); ctx.fill()
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, '#d84343')
  g.addColorStop(1, '#ff7a4d')
  ctx.fillStyle = g
  if (frac > 0) { rr(ctx, x, y, w * frac, 14, 5); ctx.fill() }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.strokeRect(x, y, w, 14)
  ctx.fillStyle = '#f0e6d0'
  ctx.font = 'bold 13px "Kaiti SC","STKaiti","KaiTi",serif'
  ctx.textAlign = 'center'
  ctx.fillText(`敵 ${name}`, VIEW_W / 2, y - 12)
  ctx.restore()
  ctx.textAlign = 'left'
}

export function drawHitVignette(ctx, p) {
  if (p <= 0) return
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.34, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75)
  g.addColorStop(0, 'rgba(180,20,10,0)')
  g.addColorStop(1, `rgba(180,20,10,${0.55 * p})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}

export function drawFloatText(ctx, ft) {
  const p = ft.t / ft.dur
  ctx.save()
  ctx.globalAlpha = 1 - p * p
  ctx.font = `bold ${ft.size || 16}px "Microsoft YaHei",sans-serif`
  ctx.textAlign = 'center'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'
  ctx.strokeText(ft.text, ft.x, ft.y - p * 44)
  ctx.fillStyle = ft.color
  ctx.fillText(ft.text, ft.x, ft.y - p * 44)
  ctx.restore()
  ctx.textAlign = 'left'
}

// 低血量呼吸警示
export function drawLowHp(ctx, hpP) {
  if (hpP > 0.3) return
  const a = (0.12 + 0.1 * Math.sin(performance.now() / 180)) * (1 - hpP / 0.3 + 0.4)
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.72)
  g.addColorStop(0, 'rgba(140,10,5,0)')
  g.addColorStop(1, `rgba(140,10,5,${Math.max(0, a)})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}
