// 拼图游戏 · 程序化画作生成器
// 所有主题都是纯 Canvas 绘制：draw(ctx, w, h, rng)。
// rng 为带种子的随机数发生器（mulberry32），同一 seed 恒定出同一张图——
// 因此「预设图」用固定 seed 可复现，「生成图」换随机 seed 即得新图。

export const PAINT_W = 1500
export const PAINT_H = 1000

// 种子随机数：返回 () => [0,1) 的均匀随机函数
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

// 用叠加正弦波勾一条山脊并向下填充到底
function drawRidge(ctx, w, h, rng, baseY, amp, color) {
  const f1 = 1 + rng() * 1.6
  const f2 = 2.5 + rng() * 2
  const f3 = 6 + rng() * 4
  const p1 = rng() * Math.PI * 2
  const p2 = rng() * Math.PI * 2
  const p3 = rng() * Math.PI * 2
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 6) {
    const t = (x / w) * Math.PI * 2
    const y = baseY - Math.sin(t * f1 + p1) * amp - Math.sin(t * f2 + p2) * amp * 0.4 - Math.sin(t * f3 + p3) * amp * 0.15
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
}

// 一只小飞鸟（两段弧线）
function drawBird(ctx, x, y, s) {
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.85, x, y)
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.85, x + s, y)
  ctx.stroke()
}

// —— 主题一：山峦日出 ——
function drawMountain(ctx, w, h, rng) {
  const palettes = [
    { sky: ['#2b2d5e', '#7a4d7e', '#e0793f', '#ffd9a0'], ridge: ['#6e5a8e', '#57476f', '#3d3352', '#26203a', '#171426'] },
    { sky: ['#0f2f5c', '#3f6fa8', '#f0a35e', '#ffe3b0'], ridge: ['#7c89b0', '#5f6d94', '#45527a', '#2f3a5c', '#1d2540'] },
    { sky: ['#331b4d', '#8f3e63', '#e2684b', '#ffc98a'], ridge: ['#7b5580', '#5f4268', '#463151', '#30223c', '#1c1528'] }
  ]
  const p = palettes[(rng() * palettes.length) | 0]
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, p.sky[0])
  sky.addColorStop(0.45, p.sky[1])
  sky.addColorStop(0.75, p.sky[2])
  sky.addColorStop(1, p.sky[3])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  // 太阳与光晕
  const sx = w * (0.3 + rng() * 0.4)
  const sy = h * (0.5 + rng() * 0.12)
  const sr = h * 0.09
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 5)
  glow.addColorStop(0, 'rgba(255,236,190,0.9)')
  glow.addColorStop(0.25, 'rgba(255,190,120,0.35)')
  glow.addColorStop(1, 'rgba(255,190,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#fff3d6'
  ctx.beginPath()
  ctx.arc(sx, sy, sr, 0, Math.PI * 2)
  ctx.fill()
  // 暖色云带
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(255,235,220,${0.1 + rng() * 0.12})`
    ctx.beginPath()
    ctx.ellipse(w * rng(), h * (0.16 + rng() * 0.34), w * (0.08 + rng() * 0.16), h * 0.012 * (0.6 + rng()), 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 山峦（远 → 近，颜色渐深）
  p.ridge.forEach((color, i) => {
    drawRidge(ctx, w, h, rng, h * (0.56 + 0.095 * i), h * (0.06 + 0.02 * i), color)
  })
  // 飞鸟
  ctx.strokeStyle = 'rgba(28,24,48,0.8)'
  ctx.lineWidth = Math.max(1.5, h * 0.004)
  ctx.lineCap = 'round'
  const birds = 2 + Math.floor(rng() * 3)
  for (let i = 0; i < birds; i++) {
    drawBird(ctx, w * (0.15 + rng() * 0.65), h * (0.16 + rng() * 0.26), h * 0.013 * (0.7 + rng() * 0.6))
  }
}

// —— 主题二：静谧星夜 ——
function drawStarry(ctx, w, h, rng) {
  const skies = [
    ['#04061a', '#131c47', '#2b3a77'],
    ['#0a0620', '#241a55', '#4a2a78'],
    ['#02091f', '#0e2a4a', '#1c4d6e']
  ]
  const p = skies[(rng() * skies.length) | 0]
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, p[0])
  sky.addColorStop(0.6, p[1])
  sky.addColorStop(1, p[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  // 银河雾带
  ctx.save()
  ctx.translate(w * 0.5, h * 0.38)
  ctx.rotate((rng() - 0.5) * 0.7)
  const mw = ctx.createLinearGradient(0, -h * 0.16, 0, h * 0.16)
  mw.addColorStop(0, 'rgba(185,200,255,0)')
  mw.addColorStop(0.5, 'rgba(190,205,255,0.15)')
  mw.addColorStop(1, 'rgba(185,200,255,0)')
  ctx.fillStyle = mw
  ctx.fillRect(-w, -h * 0.16, w * 2, h * 0.32)
  ctx.restore()
  // 星野
  for (let i = 0; i < 240; i++) {
    const x = rng() * w
    const y = rng() * h * 0.78
    const r = 0.5 + rng() * 1.4
    ctx.globalAlpha = 0.35 + rng() * 0.65
    ctx.fillStyle = rng() < 0.12 ? '#ffe9c4' : '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (rng() < 0.05) {
      ctx.globalAlpha = 0.75
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      const L = r * 5
      ctx.beginPath()
      ctx.moveTo(x - L, y)
      ctx.lineTo(x + L, y)
      ctx.moveTo(x, y - L)
      ctx.lineTo(x, y + L)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  // 极光（大概率出现）
  if (rng() < 0.7) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 3; i++) {
      const ay = h * (0.18 + rng() * 0.2)
      const ph = rng() * Math.PI * 2
      const hue = 120 + rng() * 80
      const ag = ctx.createLinearGradient(0, ay - h * 0.1, 0, ay + h * 0.12)
      ag.addColorStop(0, `hsla(${hue},80%,62%,0)`)
      ag.addColorStop(0.5, `hsla(${hue},80%,62%,0.15)`)
      ag.addColorStop(1, `hsla(${hue},80%,62%,0)`)
      ctx.fillStyle = ag
      ctx.beginPath()
      ctx.moveTo(0, ay)
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, ay + Math.sin((x / w) * 6 + ph) * h * 0.03)
      ctx.lineTo(w, ay - h * 0.14)
      ctx.lineTo(0, ay - h * 0.14)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  // 流星
  if (rng() < 0.8) {
    const mx = w * (0.25 + rng() * 0.5)
    const my = h * (0.06 + rng() * 0.18)
    const ml = w * (0.1 + rng() * 0.1)
    const grad = ctx.createLinearGradient(mx, my, mx + ml, my + ml * 0.35)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(mx, my)
    ctx.lineTo(mx + ml, my + ml * 0.35)
    ctx.stroke()
  }
  // 月亮与环形山
  const mx = w * (0.6 + rng() * 0.28)
  const my = h * (0.14 + rng() * 0.16)
  const mr = h * (0.08 + rng() * 0.04)
  const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4)
  halo.addColorStop(0, 'rgba(240,240,214,0.5)')
  halo.addColorStop(1, 'rgba(240,240,214,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(mx, my, mr * 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4f1dc'
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(188,182,158,0.55)'
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2
    const d = rng() * mr * 0.62
    ctx.beginPath()
    ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, mr * (0.07 + rng() * 0.13), 0, Math.PI * 2)
    ctx.fill()
  }
  // 远山剪影
  drawRidge(ctx, w, h, rng, h * 0.86, h * 0.05, '#0c1228')
  drawRidge(ctx, w, h, rng, h * 0.94, h * 0.035, '#060a1a')
}

// —— 主题三：海上风帆 ——
function drawSailboat(ctx, cx, cy, s, accent) {
  ctx.fillStyle = '#3a2f28'
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.5, cy)
  ctx.lineTo(cx + s * 0.5, cy)
  ctx.lineTo(cx + s * 0.32, cy + s * 0.2)
  ctx.lineTo(cx - s * 0.32, cy + s * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3a2f28'
  ctx.lineWidth = Math.max(1.5, s * 0.05)
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - s * 1.15)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.05, cy - s * 1.1)
  ctx.quadraticCurveTo(cx + s * 0.52, cy - s * 0.55, cx + s * 0.05, cy - s * 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.03, cy - s * 0.98)
  ctx.quadraticCurveTo(cx - s * 0.44, cy - s * 0.5, cx - s * 0.03, cy - s * 0.12)
  ctx.closePath()
  ctx.fill()
  // 船底白沫
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + s * 0.22, s * 0.55, s * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawOcean(ctx, w, h, rng) {
  const skies = [
    { top: '#6fc3f5', low: '#c8e9fb', sea: ['#2f86bd', '#1e639c', '#144a7e', '#0c3158'] },
    { top: '#ffb37b', low: '#ffe3ae', sea: ['#3a6f9e', '#2a5588', '#1d406e', '#122c50'] },
    { top: '#8fd0c8', low: '#dcf4e8', sea: ['#2b8c93', '#1d6b7d', '#154d64', '#0c3247'] }
  ]
  const p = skies[(rng() * skies.length) | 0]
  const horizon = h * (0.42 + rng() * 0.08)
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, p.top)
  sky.addColorStop(1, p.low)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, horizon)
  // 太阳
  const sx = w * (0.25 + rng() * 0.5)
  const sy = horizon * (0.4 + rng() * 0.45)
  const sr = h * (0.055 + rng() * 0.03)
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 5)
  glow.addColorStop(0, 'rgba(255,244,214,0.85)')
  glow.addColorStop(0.3, 'rgba(255,230,170,0.3)')
  glow.addColorStop(1, 'rgba(255,230,170,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, horizon)
  ctx.fillStyle = '#fff6dc'
  ctx.beginPath()
  ctx.arc(sx, sy, sr, 0, Math.PI * 2)
  ctx.fill()
  // 云
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + rng() * 0.3})`
    const cx = w * rng()
    const cy = horizon * (0.15 + rng() * 0.6)
    ctx.beginPath()
    ctx.ellipse(cx, cy, w * (0.06 + rng() * 0.09), h * 0.014, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + w * 0.03, cy - h * 0.008, w * (0.04 + rng() * 0.05), h * 0.011, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 海面
  const sea = ctx.createLinearGradient(0, horizon, 0, h)
  sea.addColorStop(0, p.sea[0])
  sea.addColorStop(0.5, p.sea[1])
  sea.addColorStop(1, p.sea[3])
  ctx.fillStyle = sea
  ctx.fillRect(0, horizon, w, h - horizon)
  // 日光水路（随波闪碎）
  ctx.save()
  for (let i = 0; i < 14; i++) {
    const yy = horizon + (h - horizon) * (i / 14 + rng() * 0.02)
    const ww = w * (0.02 + rng() * 0.05) * (0.5 + i / 14)
    ctx.fillStyle = `rgba(255,242,200,${0.14 + rng() * 0.12})`
    ctx.fillRect(sx - ww / 2 + (rng() - 0.5) * w * 0.02, yy, ww, Math.max(1.5, h * 0.004))
  }
  ctx.restore()
  // 层层浪带（越近越宽越起伏），船画在中景浪前
  const bands = 8
  const bx = w * (0.2 + rng() * 0.6)
  const bs = h * (0.07 + rng() * 0.035)
  for (let i = 0; i < bands; i++) {
    const f = (i + 1) / bands
    const y0 = horizon + (h - horizon) * Math.pow(f, 1.15)
    const amp = (h - horizon) * 0.03 * (0.3 + f)
    const k = ((2 + rng() * 2) * Math.PI) / w
    const ph = rng() * Math.PI * 2
    ctx.fillStyle = i % 2 ? `rgba(255,255,255,${0.05 + f * 0.06})` : `rgba(10,40,80,${0.06 + f * 0.05})`
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, y0 + Math.sin(x * k + ph) * amp)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
    if (i > 2) {
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + f * 0.2})`
      ctx.lineWidth = Math.max(1, h * 0.003 * f)
      ctx.beginPath()
      for (let x = 0; x <= w; x += 10) {
        const yy = y0 + Math.sin(x * k + ph) * amp
        if (x === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    if (i === 2) drawSailboat(ctx, bx, horizon + (h - horizon) * 0.22, bs, '#e2574c')
  }
  // 海鸥
  ctx.strokeStyle = 'rgba(40,50,70,0.75)'
  ctx.lineWidth = Math.max(1.5, h * 0.0035)
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    drawBird(ctx, w * rng(), horizon * (0.2 + rng() * 0.55), h * 0.011 * (0.7 + rng() * 0.7))
  }
}

// —— 主题四：霓虹黄昏 ——
function drawCity(ctx, w, h, rng) {
  const skies = [
    ['#1b2350', '#6f4a8e', '#ef8d5a', '#ffd9a0'],
    ['#241a4d', '#95486e', '#f07a52', '#ffce8a'],
    ['#122a52', '#5f5a9e', '#e08a6a', '#ffe0a8']
  ]
  const p = skies[(rng() * skies.length) | 0]
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, p[0])
  sky.addColorStop(0.5, p[1])
  sky.addColorStop(0.78, p[2])
  sky.addColorStop(1, p[3])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  // 高空星星
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.6
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(rng() * w, rng() * h * 0.3, 0.5 + rng() * 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // 落日
  const sx = w * (0.3 + rng() * 0.4)
  const sy = h * (0.58 + rng() * 0.08)
  const sr = h * 0.13
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4)
  glow.addColorStop(0, 'rgba(255,210,150,0.55)')
  glow.addColorStop(1, 'rgba(255,210,150,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ffdf9e'
  ctx.beginPath()
  ctx.arc(sx, sy, sr, 0, Math.PI * 2)
  ctx.fill()
  // 暖色云带
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(255,190,140,${0.1 + rng() * 0.15})`
    ctx.beginPath()
    ctx.ellipse(w * rng(), h * (0.28 + rng() * 0.35), w * (0.1 + rng() * 0.22), h * 0.012 * (0.6 + rng()), 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 三层楼宇（远 → 近），近两层亮窗
  const layers = [
    { color: '#4a3f73', min: 0.1, max: 0.22, windows: false },
    { color: '#332b58', min: 0.16, max: 0.32, windows: true },
    { color: '#1d1838', min: 0.22, max: 0.4, windows: true }
  ]
  const gy = h * 0.84
  for (const L of layers) {
    let x = -w * 0.02
    while (x < w) {
      const bw = w * (0.035 + rng() * 0.055)
      const bh = h * (L.min + rng() * (L.max - L.min))
      ctx.fillStyle = L.color
      ctx.fillRect(x, gy - bh, bw + 1, bh + (h - gy))
      if (L.windows) {
        const cols = Math.max(2, Math.round(bw / (w * 0.011)))
        const rows = Math.max(3, Math.round(bh / (h * 0.035)))
        const cw = bw / cols
        const ch = bh / rows
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            ctx.fillStyle = rng() < 0.38 ? `rgba(255,214,110,${0.55 + rng() * 0.45})` : 'rgba(255,255,255,0.05)'
            ctx.fillRect(x + i * cw + cw * 0.25, gy - bh + j * ch + ch * 0.25, cw * 0.5, ch * 0.5)
          }
        }
      }
      if (rng() < 0.3) {
        ctx.strokeStyle = L.color
        ctx.lineWidth = Math.max(1.5, w * 0.0015)
        ctx.beginPath()
        ctx.moveTo(x + bw / 2, gy - bh)
        ctx.lineTo(x + bw / 2, gy - bh - h * (0.02 + rng() * 0.03))
        ctx.stroke()
      }
      x += bw + w * 0.004
    }
  }
  // 地面与路灯
  ctx.fillStyle = '#131024'
  ctx.fillRect(0, gy, w, h - gy)
  for (let i = 0; i < 12; i++) {
    const lx = w * rng()
    const ly = gy + (h - gy) * (0.25 + rng() * 0.6)
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.012)
    g.addColorStop(0, 'rgba(255,220,140,0.8)')
    g.addColorStop(1, 'rgba(255,220,140,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(lx, ly, w * 0.012, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 预设图清单：seed 固定，缩略图与大图完全一致
export const THEMES = [
  { id: 'mountain', name: '山峦日出', emoji: '🏔️', seed: 20260901, draw: drawMountain },
  { id: 'starry', name: '静谧星夜', emoji: '🌌', seed: 20260902, draw: drawStarry },
  { id: 'ocean', name: '海上风帆', emoji: '⛵', seed: 20260903, draw: drawOcean },
  { id: 'city', name: '霓虹黄昏', emoji: '🌆', seed: 20260904, draw: drawCity }
]
