// 父母子女年龄对照：输入双方出生年份，逐年对照年龄变化并点亮逢 5 节点
export default {
  slug: 'age-compare',
  title: '父母子女年龄对照',
  emoji: '👨‍👩‍👧',
  description: '输入父母与子女的出生年份，逐年对照年龄变化，逢 5 岁节点自动点亮，一眼看出多少岁有的孩子。',
  order: 5,
  routes: [
    {
      path: '/age-compare',
      name: 'age-compare',
      loader: () => import('./pages/AgeCompare.vue'),
      meta: { title: '父母子女年龄对照' }
    }
  ]
}
