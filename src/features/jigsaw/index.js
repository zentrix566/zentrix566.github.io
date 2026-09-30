// 拼图游戏：程序化生成/预设画作切成带咬口的碎片，拖拽拼回原位
export default {
  slug: 'jigsaw',
  title: '拼图游戏',
  emoji: '🧩',
  description:
    '经典凹凸咬口拼图：选预设画、随机生成新画或上传自己的照片，切成 3×3 到 6×6 的碎片拖回原位，支持原图预览、提示底图、计时步数与各难度最佳纪录。',
  order: 5,
  routes: [
    {
      path: '/jigsaw',
      name: 'jigsaw',
      loader: () => import('./pages/JigsawPuzzle.vue'),
      meta: { title: '拼图游戏' }
    }
  ]
}
