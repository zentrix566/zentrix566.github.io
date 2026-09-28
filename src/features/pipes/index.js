export default {
  slug: 'pipes',
  title: '3D 管道屏保',
  emoji: '🔧',
  description:
    '复刻 Windows 时代的经典 3D Pipes 屏保：彩色管道在黑暗中随机生长转弯，撞上彼此自动封口，偶尔还冒出一只小茶壶；可一键进入全屏锁屏模式。',
  order: 20,
  routes: [
    {
      path: '/pipes',
      name: 'pipes',
      loader: () => import('./pages/PipesScreensaver.vue'),
      meta: { title: '3D 管道屏保' }
    }
  ]
}
