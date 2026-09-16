export default {
  slug: 'imbue-mage',
  title: '炉石灌注法·斩杀计算器',
  emoji: '✨',
  description: '输入技能伤害、敌方英雄与随从血量，对比鲁莽的学徒单下和伴唱机组合能否斩杀。',
  order: 50,
  routes: [
    {
      path: '/imbue-mage',
      name: 'imbue-mage',
      loader: () => import('./pages/ImbueMageCalculator.vue'),
      meta: { title: '炉石灌注法 · 斩杀计算器' }
    }
  ]
}
