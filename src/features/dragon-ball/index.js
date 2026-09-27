export default {
  slug: 'dragon-ball',
  title: '找寻七龙珠',
  emoji: '🐉',
  description:
    '手持龙珠雷达在原野上寻宝：每格扫描会返回与最近龙珠的距离读数，靠读数交叉推理围猎全部七颗龙珠，集齐召唤神龙许愿，一轮更比一轮难。',
  order: 30,
  routes: [
    {
      path: '/dragonball',
      name: 'dragonball',
      loader: () => import('./pages/DragonBallHunt.vue'),
      meta: { title: '找寻七龙珠' }
    }
  ]
}
