// 每日训练日历生成器：把 trainingNotes 的五阶段路线图展开成逐日课表。
// 周模板：周一力量 · 周二质量课 · 周三轻松 · 周四中距离 · 周五休息 · 周六轻松 · 周日长距离，每第 4 周减量，赛前自动 taper。
// 比赛日期按往年惯例预估（石家庄 3 月末周日、秋赛 10 月下旬、半马检验 8 月末），官宣后改 races 数组即可，课表自动重排。
import { trainingNotes } from './trainingNotes.js'

export const planMeta = trainingNotes.plan

const MS = 86400000
const utcMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10)
const even = (n) => Math.round(n / 2) * 2

export const races = [
  { date: '2027-03-28', name: '石家庄马拉松 · 目标 4:30（6′25″/km）', kind: 'race' },
  { date: '2027-08-29', name: '半马检验 · 目标 2:05 内', kind: 'check' },
  { date: '2027-10-24', name: '秋季赛（烟台 / 唐山 / 昌平）· 目标 4:15 内（6′03″/km）', kind: 'race' },
  { date: '2028-03-26', name: '春季赛（石家庄 / 副中心）· 目标 4:10 内（5′55″/km）', kind: 'race' }
]
const raceByDate = Object.fromEntries(races.map((race) => [race.date, race]))

export const planStart = '2026-10-26'
export const planEnd = '2028-03-31'
export const planRange = [planStart.slice(0, 7), planEnd.slice(0, 7)]
const START = utcMs(planStart)
const END = utcMs(planEnd)
const RACE_POST = utcMs('2028-03-26')

const weekOf = (iso) => Math.floor((utcMs(iso) - START) / (7 * MS))

// 阶段按「自 2026-10-26 起的周序号」划分：0 恢复周，1–13 基础重建，14–21 春季专项，22–43 夏练底盘，44–51 秋季赛，52–73 4:10 专项。
// long: 长距离 [起点, 峰值]；weekly: 周跑量 [起, 止]；mpShare: 长距离末段带比赛配速的占比；taper: 赛前减量周数。
const phases = [
  { from: 1, to: weekOf('2027-03-28') - 8, long: [14, 24], weekly: [35, 50], tempo: 'strides' },
  { from: weekOf('2027-03-28') - 7, to: weekOf('2027-03-28'), long: [24, 30], weekly: [55, 60], tempo: 'tempo', mpPace: '6:25', mpShare: 0.35, taper: 2 },
  { from: weekOf('2027-03-28') + 1, to: weekOf('2027-08-29'), long: [24, 28], weekly: [55, 60], tempo: 'hills', check: '2027-08-29', taper: 1 },
  { from: weekOf('2027-08-29') + 1, to: weekOf('2027-10-24'), long: [26, 32], weekly: [50, 55], tempo: 'interval', mpPace: '6:05', mpShare: 0.5, taper: 2 },
  { from: weekOf('2027-10-24') + 1, to: weekOf('2028-03-26'), long: [26, 30], weekly: [55, 60], tempo: 'mp', mpPace: '5:55', mpShare: 0.55, taper: 3 }
]

// 周二质量课内容（按阶段），weeksOut >= 0 表示处于 taper（0 = 比赛周）
function qualityOf(phase, longWk, i, weeksOut) {
  if (weeksOut === 0) return { type: 'quality', label: '步幅', dist: 6, note: '赛前刺激：轻松跑 6km + 步幅 4×20″' }
  if (weeksOut > 0) return { type: 'easy', label: '轻松', dist: 8, note: 'taper 周轻松跑 8km，别补课' }
  if (phase.tempo === 'strides') { const d = Math.min(8, even(0.3 * longWk) + 2); return { type: 'quality', label: '步幅', dist: d, note: `轻松跑 ${d}km + 步幅 4×20″` } }
  if (phase.tempo === 'tempo') { const t = Math.min(8, 5 + i); return { type: 'quality', label: '节奏', dist: 3 + t, note: `节奏跑 ${t}km @ 6:00–6:10（含 2km 热身 1km 放松）` } }
  if (phase.tempo === 'hills') { const d = Math.min(10, even(0.3 * longWk) + 2); return { type: 'quality', label: '坡道', dist: d, note: `有氧 ${d}km + 坡道重复跑 8×45″（下坡慢回）` } }
  if (phase.tempo === 'interval') return { type: 'quality', label: '间歇', dist: 10, note: '间歇 5×1000m @ 5:35–5:45（含 2km 热身 2km 放松）' }
  if (i % 2 === 0) return { type: 'quality', label: 'MP', dist: 19, note: '马拉松配速 2×8km @ 5:55（含 2km 热身 1km 放松）' }
  return { type: 'quality', label: '间歇', dist: 12, note: '间歇 4×1600m @ 5:40（含 3km 热身 2km 放松）' }
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
  if (week === 0) {
    const map = {
      1: ['rest', '休息', 0, '昌平赛后第一天，彻底休息'],
      2: ['easy', '轻松', 5, '恢复慢跑 5km，全程能聊天的配速'],
      3: ['strength', '力量', 0, '轻量力量 30′：弓步 / 深蹲 / 提踵'],
      4: ['easy', '轻松', 5, '恢复慢跑 5km'],
      5: ['rest', '休息', 0, '休息'],
      6: ['easy', '慢跑', 4, '慢跑 4km，怎么舒服怎么来'],
      0: ['easy', '轻松', 8, '轻松 8km，恢复周收尾，下周起量']
    }
    const [type, label, dist, note] = map[dow]
    return { date, type, label, dist, note }
  }
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
