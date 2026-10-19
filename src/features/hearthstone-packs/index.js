export default {
  slug: 'hearthstone-packs',
  title: '炉石传说·开包进度',
  emoji: '📦',
  description: '「黑暗帝国的统治」还没开到的卡按职业整理，开到一张划掉一张，总进度自动更新。',
  order: 5,
  routes: [
    {
      path: '/hearthstone-packs',
      name: 'hearthstone-packs',
      loader: () => import('./pages/HearthstonePacks.vue'),
      meta: { title: '炉石传说 · 黑暗帝国的统治开包进度' }
    }
  ]
}
