// 基础计算模式的表达式求值：递归下降解析，支持 + - × ÷ %、括号与一元负号。
// 自己写解析器而不是 eval，避免把用户输入当代码执行，也让报错可控。

// 求值一个算式字符串，算式不完整 / 格式有误 / 除数为 0 时抛出带中文信息的 Error
export function evaluateExpression(input) {
  const tokens = tokenize(input)
  if (!tokens.length) throw new Error('算式为空')
  const pos = { index: 0 }
  const value = parseExpression(tokens, pos)
  if (pos.index !== tokens.length) throw new Error('算式格式有误')
  if (!Number.isFinite(value)) throw new Error('除数为 0 或结果超出范围')
  return value
}

function tokenize(input) {
  const tokens = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === ' ') {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      const text = input.slice(i, j)
      if (text === '.' || (text.match(/\./g) || []).length > 1) throw new Error('数字格式有误')
      tokens.push({ type: 'num', value: Number(text) })
      i = j
      continue
    }
    if ('+-×÷%()'.includes(ch)) {
      tokens.push({ type: ch })
      i++
      continue
    }
    throw new Error(`无法识别的字符：${ch}`)
  }
  return tokens
}

// expr := term (('+' | '-') term)*
function parseExpression(tokens, pos) {
  let value = parseTerm(tokens, pos)
  while (pos.index < tokens.length && (tokens[pos.index].type === '+' || tokens[pos.index].type === '-')) {
    const op = tokens[pos.index++].type
    const rhs = parseTerm(tokens, pos)
    value = op === '+' ? value + rhs : value - rhs
  }
  return value
}

// term := factor (('×' | '÷') factor)*
function parseTerm(tokens, pos) {
  let value = parseFactor(tokens, pos)
  while (pos.index < tokens.length && (tokens[pos.index].type === '×' || tokens[pos.index].type === '÷')) {
    const op = tokens[pos.index++].type
    const rhs = parseFactor(tokens, pos)
    value = op === '×' ? value * rhs : value / rhs
  }
  return value
}

// factor := '-' factor | primary ('%')*
function parseFactor(tokens, pos) {
  const t = tokens[pos.index]
  if (!t) throw new Error('算式不完整')
  if (t.type === '-') {
    pos.index++
    return -parseFactor(tokens, pos)
  }
  let value = parsePrimary(tokens, pos)
  while (pos.index < tokens.length && tokens[pos.index].type === '%') {
    pos.index++
    value /= 100
  }
  return value
}

// primary := number | '(' expr ')'
function parsePrimary(tokens, pos) {
  const t = tokens[pos.index]
  if (!t) throw new Error('算式不完整')
  if (t.type === 'num') {
    pos.index++
    return t.value
  }
  if (t.type === '(') {
    pos.index++
    const value = parseExpression(tokens, pos)
    if (!tokens[pos.index] || tokens[pos.index].type !== ')') throw new Error('括号不匹配')
    pos.index++
    return value
  }
  throw new Error('算式格式有误')
}
