export default {
  slug: 'shanghai',
  title: '血战上海滩2',
  emoji: '🎖️',
  description:
    '致敬经典的光枪轨道射击：1937 淞沪战场，鼠标即枪——扫射探头日军、截爆掷弹筒、轰开包围，四关杀到虹口司令部。',
  order: 5,
  routes: [
    {
      path: '/shanghai',
      name: 'shanghai',
      loader: () => import('./pages/ShanghaiShooter.vue'),
      meta: { title: '血战上海滩2' }
    }
  ]
}
