// 实用计算器：内置多种常用换算/计算方式，页面内通过标签切换
export default {
  slug: 'calculator',
  title: '实用计算器',
  emoji: '🧮',
  description: '基础计算与单位换算合集，历史结果可反复带入运算，顶部标签一键切换。',
  order: 10,
  routes: [
    {
      path: '/calculator',
      name: 'calculator',
      loader: () => import('./pages/Calculator.vue'),
      meta: { title: '实用计算器' }
    }
  ]
}
