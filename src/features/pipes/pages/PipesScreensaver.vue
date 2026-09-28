<template>
  <section ref="stage" class="pp-stage" :class="{ 'is-locked': locked }">
    <div ref="host" class="pp-host" :style="{ opacity: hostFading ? 0 : 1 }"></div>

    <header v-show="showUi" class="pp-ui">
      <div class="pp-brand">
        <RouterLink class="back pp-back" to="/">← 返回主页</RouterLink>
        <p class="pp-eyebrow">3D Pipes · Windows 经典屏保</p>
        <h1 class="pp-name">🔧 3D 管道屏保</h1>
      </div>
      <div class="pp-actions">
        <button class="btn ghost pp-btn" type="button" @click="regenerate">↻ 重新生成</button>
        <button class="btn ghost pp-btn" type="button" @click="enterLock">⛶ 锁屏模式</button>
      </div>
    </header>

    <p v-show="showUi" class="pp-hint">
      拖拽旋转 · 滚轮缩放 · 管道尽头偶尔有小茶壶（原版彩蛋）
    </p>

    <transition name="pp-tip">
      <p v-if="lockTip" class="pp-locktip">已进入锁屏：按任意键或点击屏幕退出</p>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const stage = ref(null)
const host = ref(null)
const uiVisible = ref(true)
const locked = ref(false)
const lockTip = ref(false)
const hostFading = ref(false)
const showUi = computed(() => uiVisible.value && !locked.value)

// —— 世界参数：管道在三维格子上生长，格距 CELL，弯头半径为半格 ——
const CELL = 2.4
const TURN_R = CELL / 2
const PIPE_R = 0.5
const CAP_R = PIPE_R * 1.45
const CAP_LEN = 0.6
const GX = 26
const GY = 15
const GZ = 11
const TURN_P = 0.3        // 每格转弯概率
const SPEED = 5           // 生长速度（格/秒）
const MAX_PIPES = 34      // 一轮最多管道数
const MAX_FILL = 0.3      // 格子占用率上限
const TEAPOT_P = 0.12     // 茶壶彩蛋概率
const PREGROW_STEPS = 220 // 挂载时先瞬间预生长的步数，保证开场就有成型画面
const PALETTE = ['#e2642c', '#3fae4f', '#a8a832', '#c9ccd1', '#3b7dd8', '#8e5bd0', '#d8453e']

const UP = new THREE.Vector3(0, 1, 0)
const DIRS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1)
]

let renderer = null
let scene = null
let camera = null
let controls = null
let raf = 0
let last = 0
let materials = []
let occupied = new Uint8Array(GX * GY * GZ)
let filled = 0
let pipesDone = 0
let active = null
let pendingReset = false
let fading = false
let growAcc = 0
let uiTimer = 0
let fadeTimer = 0
let tipTimer = 0
let pipeMeshes = []

const idxOf = (x, y, z) => x + y * GX + z * GX * GY
const inBounds = (x, y, z) => x >= 0 && x < GX && y >= 0 && y < GY && z >= 0 && z < GZ
const isFree = (x, y, z) => inBounds(x, y, z) && !occupied[idxOf(x, y, z)]
const cellCenter = (x, y, z) =>
  new THREE.Vector3((x - (GX - 1) / 2) * CELL, (y - (GY - 1) / 2) * CELL, (z - (GZ - 1) / 2) * CELL)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function addMesh(geo, colorIdx) {
  const mesh = new THREE.Mesh(geo, materials[colorIdx])
  mesh.matrixAutoUpdate = false
  scene.add(mesh)
  pipeMeshes.push(mesh)
  if (active) {
    active.parts.push(geo)
    active.meshes.push(mesh)
  }
}

// 沿 dir 方向、长度 len 的圆柱，起点在 from
function addCylinder(from, dir, len, colorIdx) {
  const geo = new THREE.CylinderGeometry(PIPE_R, PIPE_R, len, 10)
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir)
  geo.applyMatrix4(
    new THREE.Matrix4().compose(from.clone().addScaledVector(dir, len / 2), q, new THREE.Vector3(1, 1, 1))
  )
  addMesh(geo, colorIdx)
}

// 管口套环（起点的出水口 / 终点的封口盖）
function addCap(center, dir, colorIdx) {
  const geo = new THREE.CylinderGeometry(CAP_R, CAP_R, CAP_LEN, 12)
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir)
  geo.applyMatrix4(new THREE.Matrix4().compose(center.clone(), q, new THREE.Vector3(1, 1, 1)))
  addMesh(geo, colorIdx)
}

// 直角弯头：1/4 圆环，圆心在拐点格子旁，从 -Ain 侧圆滑转向 +Aout 侧
function addElbow(center, ain, aout, colorIdx) {
  const o = center.clone().addScaledVector(aout, TURN_R).addScaledVector(ain, -TURN_R)
  const x = aout.clone().negate()
  const z = new THREE.Vector3().crossVectors(x, ain)
  const geo = new THREE.TorusGeometry(TURN_R, PIPE_R, 10, 16, Math.PI / 2)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(x, ain.clone(), z))
  geo.translate(o.x, o.y, o.z)
  addMesh(geo, colorIdx)
}

function spawnPipe() {
  for (let tries = 0; tries < 300; tries++) {
    const x = Math.floor(Math.random() * GX)
    const y = Math.floor(Math.random() * GY)
    const z = Math.floor(Math.random() * GZ)
    if (occupied[idxOf(x, y, z)]) continue
    const dirs = shuffle(DIRS.slice()).filter((d) => isFree(x + d.x, y + d.y, z + d.z))
    if (!dirs.length) continue
    const dir = dirs[0]
    const center = cellCenter(x, y, z)
    occupied[idxOf(x, y, z)] = 1
    filled++
    const colorIdx = Math.floor(Math.random() * materials.length)
    active = {
      x,
      y,
      z,
      dir,
      colorIdx,
      len: 0,
      maxLen: 15 + Math.random() * 40,
      segStart: center.clone().addScaledVector(dir, CAP_LEN / 2),
      parts: [],
      meshes: []
    }
    addCap(center, dir, colorIdx)
    return true
  }
  return false
}

function endPipe(endCenter) {
  const p = active
  const stubLen = p.segStart.distanceTo(endCenter)
  if (stubLen > 0.01) {
    const stubDir = endCenter.clone().sub(p.segStart).normalize()
    addCylinder(p.segStart, stubDir, stubLen, p.colorIdx)
  }
  if (Math.random() < TEAPOT_P) {
    const geo = new TeapotGeometry(PIPE_R * 2.1, 8)
    geo.rotateY(Math.random() * Math.PI * 2)
    geo.translate(endCenter.x, endCenter.y, endCenter.z)
    addMesh(geo, p.colorIdx)
  } else {
    addCap(endCenter, p.dir, p.colorIdx)
  }
  // 管道已定型：把全部小段合并成单个网格，整场绘制调用从上千降到几十
  const flat = p.parts.map((g) => (g.index ? g.toNonIndexed() : g))
  const merged = mergeGeometries(flat)
  flat.forEach((g) => g.dispose())
  const mesh = new THREE.Mesh(merged, materials[p.colorIdx])
  mesh.matrixAutoUpdate = false
  scene.add(mesh)
  pipeMeshes.push(mesh)
  p.meshes.forEach((m) => {
    scene.remove(m)
    m.geometry.dispose()
  })
  active = null
  pipesDone++
  if (pipesDone >= MAX_PIPES || filled / occupied.length >= MAX_FILL) pendingReset = true
}

function stepPipe() {
  const p = active
  const center = cellCenter(p.x, p.y, p.z)
  const perp = shuffle(DIRS.filter((d) => Math.abs(d.dot(p.dir)) < 0.5))
  const order = Math.random() < TURN_P ? [...perp, p.dir] : [p.dir, ...perp]
  let next = null
  for (const d of order) {
    if (isFree(p.x + d.x, p.y + d.y, p.z + d.z)) {
      next = d
      break
    }
  }
  if (!next) {
    endPipe(center)
    return
  }
  const turning = next !== p.dir
  // 进入本格的这一段：转弯时在弯头入口处截短 R，与上一截已画好的部分恰好衔接
  const edgeEnd = turning ? center.clone().addScaledVector(p.dir, -TURN_R) : center
  const segLen = p.segStart.distanceTo(edgeEnd)
  if (segLen > 0.01) {
    const segDir = edgeEnd.clone().sub(p.segStart).normalize()
    addCylinder(p.segStart, segDir, segLen, p.colorIdx)
  }
  if (turning) {
    addElbow(center, p.dir, next, p.colorIdx)
    p.segStart = center.clone().addScaledVector(next, TURN_R)
  } else {
    p.segStart = center.clone()
  }
  p.dir = next
  p.x += next.x
  p.y += next.y
  p.z += next.z
  occupied[idxOf(p.x, p.y, p.z)] = 1
  filled++
  p.len++
  if (p.len >= p.maxLen) endPipe(cellCenter(p.x, p.y, p.z))
}

function clearPipes() {
  pipeMeshes.forEach((m) => {
    scene.remove(m)
    m.geometry.dispose()
  })
  pipeMeshes = []
  occupied.fill(0)
  filled = 0
  pipesDone = 0
  active = null
  pendingReset = false
}

// 一轮结束后黑场淡出，再从头长起
function fadeReset() {
  if (fading) return
  fading = true
  hostFading.value = true
  fadeTimer = setTimeout(() => {
    clearPipes()
    fading = false
    hostFading.value = false
  }, 640)
}

function regenerate() {
  if (fading) return
  clearPipes()
  spawnPipe()
}

function initScene() {
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  // 高分屏（dpr ≥ 1.5）像素密度足以掩盖锯齿，关掉 MSAA 换流畅度
  const dpr = window.devicePixelRatio || 1
  renderer = new THREE.WebGLRenderer({
    antialias: dpr < 1.5,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(1.5, dpr))
  renderer.setSize(w, h)
  host.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 600)
  camera.position.set(28, 20, 44)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minDistance = 14
  controls.maxDistance = 170
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xffffff, 1.5)
  key.position.set(5, 9, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.5)
  fill.position.set(-7, -4, -6)
  scene.add(fill)

  materials = PALETTE.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.15 })
  )
}

// 一次性生长 n 步（挂载时预生长 / 每帧按速度推进共用）
function growSteps(n) {
  for (let i = 0; i < n; i++) {
    if (!active) {
      if (pendingReset) {
        clearPipes()
        if (fading) return
      }
      if (!spawnPipe()) {
        clearPipes()
        spawnPipe()
      }
    }
    stepPipe()
  }
}

function tick(t) {
  raf = requestAnimationFrame(tick)
  const dt = Math.min(0.05, (t - last) / 1000 || 0)
  last = t
  controls.update()
  if (!fading) {
    growAcc += dt * SPEED
    const n = Math.floor(growAcc)
    growAcc -= n
    if (n > 0) {
      growSteps(n)
      if (pendingReset && !active) fadeReset()
    }
  }
  renderer.render(scene, camera)
}

function pokeUi() {
  uiVisible.value = true
  clearTimeout(uiTimer)
  uiTimer = setTimeout(() => {
    if (!locked.value) uiVisible.value = false
  }, 3500)
}

function enterLock() {
  locked.value = true
  lockTip.value = true
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    lockTip.value = false
  }, 4000)
  stage.value.requestFullscreen?.().catch(() => {})
}

function exitLock() {
  locked.value = false
  clearTimeout(tipTimer)
  lockTip.value = false
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  pokeUi()
}

function onResize() {
  if (!host.value) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function onKeydown() {
  if (locked.value) {
    exitLock()
    return
  }
  pokeUi()
}

function onStagePointer() {
  if (locked.value) {
    exitLock()
    return
  }
  pokeUi()
}

function onFullscreenChange() {
  if (!document.fullscreenElement && locked.value) {
    locked.value = false
    clearTimeout(tipTimer)
    lockTip.value = false
  }
}

onMounted(() => {
  initScene()
  growSteps(PREGROW_STEPS)
  last = performance.now()
  raf = requestAnimationFrame(tick)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  stage.value.addEventListener('pointermove', onStagePointer)
  stage.value.addEventListener('pointerdown', onStagePointer)
  pokeUi()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(uiTimer)
  clearTimeout(fadeTimer)
  clearTimeout(tipTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  stage.value?.removeEventListener('pointermove', onStagePointer)
  stage.value?.removeEventListener('pointerdown', onStagePointer)
  controls?.dispose()
  pipeMeshes.forEach((m) => m.geometry.dispose())
  pipeMeshes = []
  materials.forEach((m) => m.dispose())
  materials = []
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<style scoped>
.pp-stage {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: #000;
  overflow: hidden;
}

.pp-stage.is-locked {
  cursor: none;
}

.pp-host {
  position: absolute;
  inset: 0;
  transition: opacity 0.6s ease;
}

.pp-host :deep(canvas) {
  display: block;
}

.pp-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  pointer-events: none;
}

.pp-ui > * {
  pointer-events: auto;
}

.pp-back {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f2f2f2;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.pp-back:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pp-eyebrow {
  margin: 16px 0 2px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pp-name {
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}

.pp-actions {
  display: flex;
  gap: 10px;
}

.pp-btn {
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f2f2f2;
  backdrop-filter: blur(6px);
}

.pp-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
}

.pp-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  pointer-events: none;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
}

.pp-locktip {
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.9rem;
  pointer-events: none;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
}

.pp-tip-enter-active {
  transition: opacity 0.3s ease;
}

.pp-tip-leave-active {
  transition: opacity 1.2s ease;
}

.pp-tip-enter-from,
.pp-tip-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .pp-ui {
    flex-direction: column;
  }

  .pp-name {
    font-size: 1.2rem;
  }
}
</style>
