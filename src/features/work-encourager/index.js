// 上班鼓励器：输入上下班时间与月工资，按秒实时累计今天已赚的钱
export default {
  slug: 'work-encourager',
  title: '上班鼓励器',
  emoji: '💰',
  description: '输入上班、下班时间与月工资，实时看到今天的钱一分一秒到账，附带下班倒计时与工作进度。',
  order: 4,
  routes: [
    {
      path: '/work-encourager',
      name: 'work-encourager',
      loader: () => import('./pages/WorkEncourager.vue'),
      meta: { title: '上班鼓励器' }
    }
  ]
}
