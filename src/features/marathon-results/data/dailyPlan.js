// 每日训练日历生成器：把 trainingNotes 的三阶段路线图展开成逐日课表。
// 周模板：周一力量 · 周二质量课 · 周三轻松 · 周四中距离 · 周五休息 · 周六轻松 · 周日长距离，每第 4 周减量，赛前自动 taper。
// 比赛日期按往年惯例预估（春季赛 4 月下旬周日），官宣后改 races 数组即可，课表自动重排。
import { trainingNotes } from './trainingNotes.js'

export const planMeta = trainingNotes.plan

const MS = 86400000
const utcMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10)
const even = (n) => Math.round(n / 2) * 2

export const races = [
  { date: '2027-04-25', name: '春季赛（北京城市副中心 / 京津冀）· 目标 4:30 内（6′25″/km）', kind: 'race' }
]
const raceByDate = Object.fromEntries(races.map((race) => [race.date, race]))

export const planStart = '2026-11-02'
export const planEnd = '2027-04-30'
export const planRange = [planStart.slice(0, 7), planEnd.slice(0, 7)]
const START = utcMs(planStart)
const END = utcMs(planEnd)
const RACE_POST = utcMs('2027-04-25')

const weekOf = (iso) => Math.floor((utcMs(iso) - START) / (7 * MS))

// 阶段按「自 2026-11-02 起的周序号」划分：0–8 基础重建，9–16 有氧强化，17–24 4:30 专项（含 taper 2 周）。
// long: 长距离 [起点, 峰值]；weekly: 周跑量 [起, 止]；mpShare: 长距离末段带比赛配速的占比；taper: 赛前减量周数。
const phases = [
  { from: 0, to: 8, long: [14, 22], weekly: [30, 45], tempo: 'strides' },
  { from: 9, to: 16, long: [22, 26], weekly: [45, 55], tempo: 'tempo' },
  { from: 17, to: weekOf('2027-04-25'), long: [26, 30], weekly: [55, 60], tempo: 'mp', mpPace: '6:25', intPace: '6:00', mpShare: 0.5, taper: 2 }
]

// 周二质量课内容（按阶段），weeksOut >= 0 表示处于 taper（0 = 比赛周）
function qualityOf(phase, longWk, i, weeksOut) {
  if (weeksOut === 0) return { type: 'quality', label: '步幅', dist: 6, note: '赛前刺激：轻松跑 6km + 步幅 4×20″' }
  if (weeksOut > 0) return { type: 'easy', label: '轻松', dist: 8, note: 'taper 周轻松跑 8km，别补课' }
  if (phase.tempo === 'strides') { const d = Math.min(8, even(0.3 * longWk) + 2); return { type: 'quality', label: '步幅', dist: d, note: `轻松跑 ${d}km + 步幅 4×20″` } }
  if (phase.tempo === 'tempo') { const t = Math.min(8, 5 + i); return { type: 'quality', label: '节奏', dist: 3 + t, note: `节奏跑 ${t}km @ 6:00–6:10（含 2km 热身 1km 放松）` } }
  if (phase.tempo === 'hills') { const d = Math.min(10, even(0.3 * longWk) + 2); return { type: 'quality', label: '坡道', dist: d, note: `有氧 ${d}km + 坡道重复跑 8×45″（下坡慢回）` } }
  if (phase.tempo === 'interval') return { type: 'quality', label: '间歇', dist: 10, note: '间歇 5×1000m @ 5:35–5:45（含 2km 热身 2km 放松）' }
  if (i % 2 === 0) return { type: 'quality', label: 'MP', dist: 19, note: `马拉松配速 2×8km @ ${phase.mpPace}（含 2km 热身 1km 放松）` }
  return { type: 'quality', label: '间歇', dist: 12, note: `间歇 4×1600m @ ${phase.intPace}（含 3km 热身 2km 放松）` }
}

// 周日长距离：常规周线性递进 + 每 4 周减量；taper 周按比例缩
function longOf(phase, i, buildWeeks, weeksOut) {
  if (weeksOut === 1) return even(phase.long[1] * (phase.taper > 2 ? 0.5 : 0.65))
  if (weeksOut === 2) return even(phase.long[1] * 0.8)
  let l = even(phase.long[0] + (phase.long[1] - phase.long[0]) * (buildWeeks > 1 ? i / (buildWeeks - 1) : 0))
  l = Math.min(l, phase.long[1])
  if ((i + 1) % 4 === 0) l = even(l * 0.65)
  return l
}

function dayEntry(ms) {
  const date = isoOf(ms)
  const race = raceByDate[date]
  if (race) {
    return { date, type: race.kind, label: race.kind === 'race' ? '比赛' : '检验', dist: race.kind === 'race' ? 42.2 : 21.1, note: `${race.name} · 预估日期，官宣后更新` }
  }
  if (ms > RACE_POST) return { date, type: 'rest', label: '休整', dist: 0, note: '赛后休整周：散步、拉伸、多睡' }
  const week = Math.floor((ms - START) / (7 * MS))
  const dow = new Date(ms).getUTCDay()
  const phase = phases.find((p) => week >= p.from && week <= p.to)
  if (!phase) return { date, type: 'rest', label: '休整', dist: 0, note: '阶段间隙，休整' }
  const i = week - phase.from
  const buildWeeks = phase.to - phase.from + 1 - (phase.taper || 0)
  const weeksOut = phase.taper && week > phase.to - phase.taper ? phase.to - week : -1
  if (weeksOut === 0) {
    const map = {
      1: ['strength', '力量', 0, '轻量力量 30′ + 髋部灵活性'],
      2: null,
      3: ['easy', '轻松', 6, '轻松 6km，感受配速但不抢跑'],
      4: ['easy', '轻松', 6, phase.check ? '轻松 6km + 2km @ 检验配速' : '轻松 6km + 2km @ 比赛配速'],
      5: ['rest', '休息', 0, '赛前休息，宁早睡不乱吃'],
      6: ['easy', '慢跑', 4, '慢跑 4km + 步幅 2×20″，领物别走太多']
    }
    const t = map[dow]
    if (t) return { date, type: t[0], label: t[1], dist: t[2], note: t[3] }
  }
  const longWk = longOf(phase, Math.min(i, buildWeeks - 1), buildWeeks, weeksOut)
  switch (dow) {
    case 1: return { date, type: 'strength', label: '力量', dist: 0, note: weeksOut > 0 ? '轻量力量 30′' : '力量 45′：弓步 / 深蹲 / 提踵 / 单腿硬拉' }
    case 2: return { date, ...qualityOf(phase, longWk, i, weeksOut) }
    case 3: return { date, type: 'easy', label: '轻松', dist: Math.max(4, even(0.28 * longWk)), note: '轻松跑，心率压在能全程聊天' }
    case 4: return { date, type: 'medium', label: '中距', dist: Math.max(4, even(0.28 * longWk)), note: `中等距离，后半程略提速` }
    case 5: return { date, type: 'rest', label: '休息', dist: 0, note: '休息（可选核心 20′）' }
    case 6: return { date, type: 'easy', label: '轻松', dist: Math.max(4, even(0.15 * longWk)), note: '轻松跑，为明天长距离留腿' }
    default: {
      const mpKm = phase.mpShare && weeksOut < 0 && longWk >= phase.long[0] + 4 ? Math.round(longWk * phase.mpShare) : 0
      const note = mpKm
        ? `长距离 ${longWk}km，末段 ${mpKm}km @ ${phase.mpPace}（先慢后快，练疲劳下维持跑姿）`
        : `长距离 ${longWk}km 全轻松配速，练补给：10km 起每 35–40 分钟一支胶`
      return { date, type: 'long', label: '长距离', dist: longWk, note }
    }
  }
}

export const planByDate = (() => {
  const map = {}
  for (let t = START; t <= END; t += MS) { const entry = dayEntry(t); map[entry.date] = entry }
  return map
})()

// 某个月的日历格子（周一开头补齐整周）与月度汇总
export function monthCells(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const first = Date.UTC(y, m - 1, 1)
  const last = Date.UTC(y, m, 0)
  const gridStart = first - ((new Date(first).getUTCDay() + 6) % 7) * MS
  const cells = []
  const summary = { km: 0, long: 0, quality: 0, race: '' }
  let t = gridStart
  while (t <= last || cells.length % 7 !== 0) {
    const date = isoOf(t)
    const entry = t >= START && t <= END ? planByDate[date] : null
    cells.push(entry ? { ...entry, day: Number(date.slice(8)) } : null)
    if (entry) {
      summary.km += entry.dist
      if (entry.type === 'long') summary.long = Math.max(summary.long, entry.dist)
      if (entry.type === 'quality') summary.quality++
      if (entry.type === 'race' || entry.type === 'check') summary.race = entry.note
    }
    t += MS
  }
  return { cells, summary }
}
