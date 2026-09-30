// WebAudio 合成音效：枪声、爆炸、命中、拾取等全部程序化生成，无外部素材
export class Sfx {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
  }

  // 必须在用户手势里调用（浏览器自动播放限制）
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  setMuted(m) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : 0.5
  }

  // 白噪声缓冲（复用）
  noiseBuf() {
    if (this._noise) return this._noise
    const ctx = this.ctx
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this._noise = buf
    return buf
  }

  // 噪声爆音：type=滤波器类型，f0/f1=频率起止，dur=时长，vol=音量
  burst({ f0 = 1800, f1 = 400, q = 1, dur = 0.12, vol = 0.8, type = 'bandpass', delay = 0 }) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf()
    src.loop = true
    const flt = ctx.createBiquadFilter()
    flt.type = type
    flt.Q.value = q
    flt.frequency.setValueAtTime(f0, t)
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(flt).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  // 简单音符
  tone({ f = 440, f1 = 0, dur = 0.15, vol = 0.3, type = 'square', delay = 0 }) {
    const ctx = this.ensure()
    if (!ctx || this.muted) return
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(f, t)
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  // —— 具体音效 ——
  pistol() {
    this.burst({ f0: 2200, f1: 500, dur: 0.1, vol: 0.7 })
    this.tone({ f: 180, f1: 60, dur: 0.08, vol: 0.35, type: 'triangle' })
  }

  smg() {
    this.burst({ f0: 1700, f1: 600, dur: 0.07, vol: 0.5 })
    this.tone({ f: 150, f1: 70, dur: 0.05, vol: 0.22, type: 'triangle' })
  }

  lmg() {
    this.burst({ f0: 1300, f1: 300, dur: 0.11, vol: 0.75 })
    this.tone({ f: 120, f1: 50, dur: 0.09, vol: 0.4, type: 'triangle' })
  }

  dryFire() {
    this.tone({ f: 900, f1: 500, dur: 0.04, vol: 0.15, type: 'square' })
  }

  reload() {
    this.tone({ f: 500, dur: 0.04, vol: 0.2, type: 'square' })
    this.tone({ f: 700, dur: 0.05, vol: 0.2, type: 'square', delay: 0.18 })
    this.tone({ f: 900, dur: 0.04, vol: 0.25, type: 'square', delay: 0.36 })
  }

  throwNade() {
    this.burst({ f0: 600, f1: 2400, dur: 0.18, vol: 0.25, type: 'highpass' })
  }

  explosion() {
    this.burst({ f0: 900, f1: 60, dur: 0.55, vol: 1.0, type: 'lowpass', q: 0.5 })
    this.tone({ f: 70, f1: 30, dur: 0.5, vol: 0.7, type: 'sine' })
  }

  enemyShot() {
    this.burst({ f0: 900, f1: 250, dur: 0.1, vol: 0.4 })
  }

  hit() {
    this.burst({ f0: 500, f1: 120, dur: 0.06, vol: 0.4, type: 'lowpass' })
  }

  headshot() {
    this.burst({ f0: 700, f1: 150, dur: 0.08, vol: 0.5, type: 'lowpass' })
    this.tone({ f: 1300, f1: 800, dur: 0.07, vol: 0.18, type: 'square' })
  }

  hurt() {
    this.tone({ f: 130, f1: 60, dur: 0.2, vol: 0.5, type: 'sawtooth' })
    this.burst({ f0: 400, f1: 100, dur: 0.15, vol: 0.3, type: 'lowpass' })
  }

  slash() {
    this.burst({ f0: 3000, f1: 800, dur: 0.14, vol: 0.45, type: 'highpass' })
  }

  pickup() {
    this.tone({ f: 660, dur: 0.07, vol: 0.25, type: 'square' })
    this.tone({ f: 990, dur: 0.1, vol: 0.25, type: 'square', delay: 0.07 })
  }

  kill() {
    this.tone({ f: 220, f1: 110, dur: 0.18, vol: 0.22, type: 'triangle' })
  }

  bossDown() {
    this.explosion()
    ;[330, 392, 494, 659].forEach((f, i) =>
      this.tone({ f, dur: 0.22, vol: 0.25, type: 'square', delay: 0.4 + i * 0.13 })
    )
  }

  stageClear() {
    ;[523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ f, dur: 0.2, vol: 0.28, type: 'square', delay: i * 0.12 })
    )
  }

  gameOver() {
    ;[392, 330, 262, 196].forEach((f, i) =>
      this.tone({ f, dur: 0.3, vol: 0.3, type: 'triangle', delay: i * 0.22 })
    )
  }

  victory() {
    ;[523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      this.tone({ f, dur: 0.22, vol: 0.3, type: 'square', delay: i * 0.15 })
    )
  }
}
