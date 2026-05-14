<template>
  <div class="interval-training">
    <h1 class="page-title">间歇训练数据分析</h1>

    <!-- 添加新训练按钮 -->
    <div class="action-bar">
      <button @click="showAddModal = true" class="btn btn-primary">
        + 添加训练记录
      </button>
      <button @click="exportData" class="btn btn-secondary">
        导出数据
      </button>
      <label class="btn btn-secondary">
        导入数据
        <input type="file" @change="importData" accept=".json" hidden>
      </label>
      <button @click="showGistModal = true" class="btn btn-secondary">
        ☁️ 云端同步
      </button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ trainingSessions.length }}</div>
        <div class="stat-label">训练次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalLaps }}</div>
        <div class="stat-label">总组数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ avgPace }}</div>
        <div class="stat-label">平均配速</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ excellentCount }}</div>
        <div class="stat-label">优秀次数</div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-container">
      <h3>配速趋势图</h3>
      <canvas ref="chartRef"></canvas>
    </div>

    <div class="chart-container">
      <h3>评级分布</h3>
      <canvas ref="ratingChartRef"></canvas>
    </div>

    <!-- 训练记录列表 -->
    <div class="sessions-list">
      <h3>训练记录</h3>
      <div v-for="session in trainingSessions" :key="session.date" class="session-card">
        <div class="session-header">
          <span class="session-date">{{ session.date }}</span>
          <button @click="deleteSession(session.date)" class="btn-delete">删除</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>组号</th>
              <th>时间</th>
              <th>平均配速</th>
              <th>评级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(lap, index) in session.laps" :key="index" :class="getRatingClass(lap.rating)">
              <td>{{ index + 1 }}</td>
              <td>{{ lap.time }}</td>
              <td>{{ lap.pace }}</td>
              <td><span class="rating-badge">{{ lap.rating }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加训练弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h3>添加训练记录</h3>
        <div class="form-group">
          <label>训练日期</label>
          <input v-model="newSession.date" type="date" class="form-input">
        </div>
        <div class="form-group">
          <label>每组时间（每行一组，格式：分:秒.毫秒）</label>
          <textarea
            v-model="newSession.lapsText"
            class="form-textarea"
            rows="10"
            placeholder="02:03.55&#10;01:55.80&#10;01:56.84&#10;...">
          </textarea>
        </div>
        <div class="modal-actions">
          <button @click="showAddModal = false" class="btn btn-secondary">取消</button>
          <button @click="addSession" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- Gist 同步弹窗 -->
    <div v-if="showGistModal" class="modal-overlay" @click.self="showGistModal = false">
      <div class="modal-content gist-modal">
        <h3>☁️ GitHub Gist 云端同步</h3>
        <p class="modal-desc">将训练数据备份到 GitHub Gist，实现跨设备永久保存</p>

        <div class="setup-guide">
          <h4>📝 首次使用设置步骤：</h4>
          <ol>
            <li>访问 <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noopener noreferrer">GitHub Token 设置</a></li>
            <li>Note 填写 "训练数据同步"，勾选 gist 权限，点击 Generate token</li>
            <li>访问 <a href="https://gist.github.com/" target="_blank" rel="noopener noreferrer">创建 Gist</a>，新建文件名为 training-data.json</li>
            <li>将 Gist ID 复制到下方（Gist URL 中最后一串字符）</li>
          </ol>
        </div>

        <div class="form-group">
          <label>GitHub Token</label>
          <input v-model="gistToken" type="password" class="form-input" placeholder="ghp_xxxxxxxxxxxx">
        </div>
        <div class="form-group">
          <label>Gist ID</label>
          <input v-model="gistId" type="text" class="form-input" placeholder="xxxxxxxxxxxxxxxxx">
        </div>

        <div v-if="syncStatus" class="sync-status">{{ syncStatus }}</div>

        <div class="modal-actions">
          <button @click="showGistModal = false" class="btn btn-secondary">关闭</button>
          <button @click="pullFromGist" class="btn btn-secondary">📥 拉取云端</button>
          <button @click="pushToGist" class="btn btn-primary">📤 上传云端</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import Chart from 'chart.js/auto'

const chartRef = ref(null)
const ratingChartRef = ref(null)
const showAddModal = ref(false)
const showGistModal = ref(false)
const gistToken = ref(sessionStorage.getItem('gist_token') || '')
const gistId = ref(localStorage.getItem('gist_id') || '')
const syncStatus = ref('')
let chartInstance = null
let ratingChartInstance = null

// 预设初始数据
const initialData = [
  {
    date: '2026/5/11（周一）',
    laps: [
      { time: '02:03.55' },
      { time: '01:55.80' },
      { time: '01:56.84' },
      { time: '02:00.85' },
      { time: '01:50.85' },
      { time: '02:09.51' },
      { time: '02:02.23' },
      { time: '02:00.80' },
      { time: '01:57.33' },
      { time: '01:57.68' }
    ]
  },
  {
    date: '2026/5/13（周三）',
    laps: [
      { time: '02:00.39' },
      { time: '01:53.95' },
      { time: '02:01.16' },
      { time: '01:59.21' },
      { time: '02:05.00' },
      { time: '01:55.45' },
      { time: '02:07.38' },
      { time: '02:00.39' },
      { time: '02:05.80' },
      { time: '01:49.29' }
    ]
  },
  {
    date: '2026/5/14（周四）',
    laps: [
      { time: '02:03.31' },
      { time: '02:00.08' },
      { time: '02:05.35' },
      { time: '02:00.69' },
      { time: '02:06.59' },
      { time: '02:02.99' },
      { time: '02:03.20' },
      { time: '01:59.68' },
      { time: '02:02.23' },
      { time: '02:01.27' }
    ]
  }
]

const trainingSessions = ref([])

const newSession = ref({
  date: '',
  lapsText: ''
})

// 时间转换：分:秒.毫秒 -> 总秒数
const timeToSeconds = (timeStr) => {
  const parts = timeStr.split(':')
  const minutes = parseInt(parts[0])
  const seconds = parseFloat(parts[1])
  return minutes * 60 + seconds
}

// 总秒数 -> 配速格式（X分Y秒）
const secondsToPace = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}分${secs}秒`
}

// 评级函数
const getRating = (seconds) => {
  // 非常快：1分50以内（不包含1分50）= 110秒
  if (seconds < 110) return '非常快'
  // 比较快：1分50（包含）- 1分55（不包含）= 110-115秒
  if (seconds >= 110 && seconds < 115) return '比较快'
  // 有点快：1分55（包含）- 1分57（不包含）= 115-117秒
  if (seconds >= 115 && seconds < 117) return '有点快'
  // 优秀：1分59（包含）- 2分01（包含）= 119-121秒
  if (seconds >= 119 && seconds <= 121) return '优秀'
  // 良：1分57（包含）- 1分59（不包含） 或 2分01（不包含）- 2分03（包含）
  if ((seconds >= 117 && seconds < 119) || (seconds > 121 && seconds <= 123)) return '良'
  // 一般：2分03（不包含）- 2分05（包含）= 123-125秒
  if (seconds > 123 && seconds <= 125) return '一般'
  // 差：2分05（不包含）- 2分10（包含）= 125-130秒
  if (seconds > 125 && seconds <= 130) return '差'
  // 很差：2分10（不包含）以外 = >130秒
  return '很差'
}

// 获取评级颜色类
const getRatingClass = (rating) => {
  const colorMap = {
    '非常快': 'rating-very-fast',
    '比较快': 'rating-faster',
    '有点快': 'rating-fast',
    '优秀': 'rating-excellent',
    '良': 'rating-good',
    '一般': 'rating-normal',
    '差': 'rating-bad',
    '很差': 'rating-very-bad'
  }
  return colorMap[rating] || ''
}

// 处理数据 - 计算配速和评级
const processSessionData = (session) => {
  return {
    ...session,
    laps: session.laps.map(lap => {
      const seconds = timeToSeconds(lap.time)
      return {
        ...lap,
        seconds: seconds,
        pace: secondsToPace(seconds),
        rating: getRating(seconds)
      }
    })
  }
}

// 计算统计数据
const totalLaps = computed(() => {
  return trainingSessions.value.reduce((sum, session) => sum + session.laps.length, 0)
})

const avgPace = computed(() => {
  let totalSeconds = 0
  let count = 0
  trainingSessions.value.forEach(session => {
    session.laps.forEach(lap => {
      totalSeconds += lap.seconds
      count++
    })
  })
  if (count === 0) return '-'
  return secondsToPace(Math.round(totalSeconds / count))
})

const excellentCount = computed(() => {
  let count = 0
  trainingSessions.value.forEach(session => {
    session.laps.forEach(lap => {
      if (lap.rating === '优秀') count++
    })
  })
  return count
})

// 保存到 localStorage
const saveToLocalStorage = () => {
  localStorage.setItem('intervalTrainingData', JSON.stringify(trainingSessions.value))
}

// 从 localStorage 读取
const loadFromLocalStorage = () => {
  const saved = localStorage.getItem('intervalTrainingData')
  const version = localStorage.getItem('intervalTrainingVersion')
  // 版本号用于强制刷新数据
  if (saved && version === 'v2') {
    trainingSessions.value = JSON.parse(saved)
  } else {
    // 使用初始数据
    trainingSessions.value = initialData.map(processSessionData)
    saveToLocalStorage()
    localStorage.setItem('intervalTrainingVersion', 'v2')
  }
}

// 监听数据变化自动保存
watch(trainingSessions, () => {
  saveToLocalStorage()
}, { deep: true })

// 校验时间格式
const validateTimeFormat = (timeStr) => {
  const regex = /^\d{2}:\d{2}\.\d{2}$/
  return regex.test(timeStr)
}

// 添加训练记录
const addSession = () => {
  if (!newSession.value.date || !newSession.value.lapsText) {
    alert('请填写完整信息')
    return
  }

  const lines = newSession.value.lapsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)

  const invalidLines = lines.filter(line => !validateTimeFormat(line))
  if (invalidLines.length > 0) {
    alert(`格式错误：${invalidLines.slice(0, 3).join(', ')}${invalidLines.length > 3 ? ' 等' : ''}\n正确格式：02:03.55`)
    return
  }

  const laps = lines.map(time => ({ time }))

  const newSessionData = processSessionData({
    date: newSession.value.date,
    laps
  })

  trainingSessions.value.push(newSessionData)

  // 按日期排序（新的在前）
  trainingSessions.value.sort((a, b) => {
    return new Date(b.date.split('（')[0]) - new Date(a.date.split('（')[0])
  })

  showAddModal.value = false
  newSession.value = { date: '', lapsText: '' }

  // 更新图表
  updateCharts()
}

// 删除训练记录
const deleteSession = (date) => {
  if (confirm('确定要删除这条训练记录吗？')) {
    trainingSessions.value = trainingSessions.value.filter(s => s.date !== date)
    updateCharts()
  }
}

// Gist 同步 - 保存配置
const saveGistConfig = () => {
  sessionStorage.setItem('gist_token', gistToken.value)
  localStorage.setItem('gist_id', gistId.value)
}

// Gist 同步 - 上传数据
const pushToGist = async () => {
  if (!gistToken.value || !gistId.value) {
    alert('请先填写 GitHub Token 和 Gist ID')
    return
  }
  saveGistConfig()
  syncStatus.value = '正在上传...'
  try {
    const data = JSON.stringify(trainingSessions.value, null, 2)
    const res = await fetch(`https://api.github.com/gists/${gistId.value}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${gistToken.value}`
      },
      body: JSON.stringify({
        files: { 'training-data.json': { content: data } }
      })
    })
    if (res.ok) {
      syncStatus.value = '✅ 上传成功！'
      setTimeout(() => { syncStatus.value = '' }, 2000)
    } else {
      throw new Error('上传失败，请检查 Token 和 Gist ID')
    }
  } catch (e) {
    syncStatus.value = '❌ ' + e.message
  }
}

// Gist 同步 - 拉取数据
const pullFromGist = async () => {
  if (!gistToken.value || !gistId.value) {
    alert('请先填写 GitHub Token 和 Gist ID')
    return
  }
  saveGistConfig()
  syncStatus.value = '正在拉取...'
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId.value}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${gistToken.value}`
      }
    })
    if (!res.ok) throw new Error('拉取失败，请检查 Token 和 Gist ID')
    const data = await res.json()
    const fileContent = data.files['training-data.json']?.content
    if (!fileContent) throw new Error('Gist 中没有 training-data.json 文件')
    const rawData = JSON.parse(fileContent)
    trainingSessions.value = rawData.map(processSessionData)
    syncStatus.value = '✅ 拉取成功！'
    setTimeout(() => { syncStatus.value = '' }, 2000)
  } catch (e) {
    syncStatus.value = '❌ ' + e.message
  }
}

// 导出数据
const exportData = () => {
  const dataStr = JSON.stringify(trainingSessions.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interval-training-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 导入数据
const importData = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      trainingSessions.value = data.map(processSessionData)
      alert('导入成功！')
      updateCharts()
    } catch (err) {
      alert('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

// 更新图表
const updateCharts = () => {
  if (!chartRef.value || !ratingChartRef.value) return

  // 销毁旧图表
  if (chartInstance) chartInstance.destroy()
  if (ratingChartInstance) ratingChartInstance.destroy()

  // 配速趋势图 - 按训练分组显示
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
  const datasets = trainingSessions.value.map((session, idx) => ({
    label: session.date.split('（')[0],
    data: session.laps.map(lap => lap.seconds),
    borderColor: colors[idx % colors.length],
    backgroundColor: colors[idx % colors.length] + '20',
    tension: 0.3,
    pointRadius: 5,
    pointHoverRadius: 7
  }))

  // 每组作为X轴标签
  const maxLaps = Math.max(...trainingSessions.value.map(s => s.laps.length))
  const xLabels = Array.from({ length: maxLaps }, (_, i) => `第${i + 1}组`)

  chartInstance = new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: xLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const seconds = context.raw
              const mins = Math.floor(seconds / 60)
              const secs = Math.floor(seconds % 60)
              return `${context.dataset.label}: ${mins}分${secs}秒`
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: '时间（秒）' }
        },
        x: {
          title: { display: true, text: '组号' }
        }
      }
    }
  })

  // 评级分布
  const ratingCounts = {}
  trainingSessions.value.forEach(session => {
    session.laps.forEach(lap => {
      ratingCounts[lap.rating] = (ratingCounts[lap.rating] || 0) + 1
    })
  })

  const ratingOrder = ['非常快', '比较快', '有点快', '优秀', '良', '一般', '差', '很差']
  const ratingColors = {
    '非常快': '#059669',
    '比较快': '#10b981',
    '有点快': '#34d399',
    '优秀': '#8b5cf6',
    '良': '#6366f1',
    '一般': '#f59e0b',
    '差': '#ef4444',
    '很差': '#991b1b'
  }

  // 按指定顺序排序
  const sortedRatings = ratingOrder.filter(r => ratingCounts[r] !== undefined)
  const sortedValues = sortedRatings.map(r => ratingCounts[r])

  ratingChartInstance = new Chart(ratingChartRef.value, {
    type: 'bar',
    data: {
      labels: sortedRatings,
      datasets: [{
        label: '次数',
        data: sortedValues,
        backgroundColor: sortedRatings.map(r => ratingColors[r] || '#666')
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  })
}

onMounted(() => {
  loadFromLocalStorage()
  // 等待 DOM 更新后再渲染图表
  setTimeout(updateCharts, 100)
})
</script>

<style scoped>
.interval-training {
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-delete {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 4px;
}

.chart-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.chart-container h3 {
  margin-bottom: 16px;
  font-size: 1.125rem;
}

.sessions-list h3 {
  margin-bottom: 16px;
  font-size: 1.25rem;
}

.session-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.session-date {
  font-weight: 600;
  font-size: 1.125rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.rating-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 评级颜色 */
.rating-very-fast td,
.rating-very-fast .rating-badge {
  background: rgba(5, 150, 105, 0.2);
  color: #34d399;
}

.rating-faster td,
.rating-faster .rating-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.rating-fast td,
.rating-fast .rating-badge {
  background: rgba(52, 211, 153, 0.2);
  color: #a7f3d0;
}

.rating-excellent td,
.rating-excellent .rating-badge {
  background: rgba(139, 92, 246, 0.2);
  color: #c4b5fd;
}

.rating-good td,
.rating-good .rating-badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.rating-normal td,
.rating-normal .rating-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.rating-bad td,
.rating-bad .rating-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.rating-very-bad td,
.rating-very-bad .rating-badge {
  background: rgba(153, 27, 27, 0.2);
  color: #f87171;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin-bottom: 20px;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: monospace;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.modal-desc {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 0.9375rem;
}

.setup-guide {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.setup-guide h4 {
  margin-bottom: 12px;
  font-size: 0.9375rem;
}

.setup-guide ol {
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.8;
}

.setup-guide a {
  color: #6366f1;
}

.sync-status {
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--bg-primary);
  text-align: center;
  font-weight: 500;
}

.gist-modal {
  max-width: 550px;
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-table {
    font-size: 0.875rem;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
  }
}
</style>
