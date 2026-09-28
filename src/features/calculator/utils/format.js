// 数字显示格式：取 12 位有效数字消掉浮点噪声，整数加千分位，空值显示 —
export function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = Number(value.toPrecision(12))
  if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) return rounded.toLocaleString('zh-CN')
  return String(rounded)
}

// 换算结果展示：按有效数字截短。单位间数量级跨度大，固定小数位会丢信息或补零难看
export function formatSigFigs(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  // 过大或过小时退回指数记法，避免超长数字串
  if (abs >= 1e15 || abs < 1e-9) return String(Number(value.toPrecision(digits)))
  const rounded = Number(value.toPrecision(digits))
  const exp = Math.floor(Math.log10(Math.abs(rounded)))
  const decimals = Math.max(0, digits - 1 - exp)
  const text = rounded.toFixed(decimals)
  const dot = text.indexOf('.')
  let intPart = dot === -1 ? text : text.slice(0, dot)
  const decPart = dot === -1 ? '' : text.slice(dot + 1)
  const negative = intPart.startsWith('-')
  if (negative) intPart = intPart.slice(1)
  // 整数部分用 Number 再 toLocaleString（字符串的 toLocaleString 不加千分位），负号单独拼回
  const grouped = Number(intPart).toLocaleString('zh-CN')
  return (negative ? '-' : '') + grouped + (decPart ? '.' + decPart : '')
}
