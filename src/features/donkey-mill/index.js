export default {
  slug: 'donkey-mill',
  title: '驴拉磨',
  emoji: '🫏',
  description:
    '当一回磨坊小掌柜：添谷物、鞭策蒙眼驴拉磨赶面粉订单。驴有体力也有脾气，抽狠了会尥蹶子罢工，没力气就趴窝——胡萝卜和摸摸头都得安排上，限时磨面赚钱买升级。',
  order: 5,
  routes: [
    {
      path: '/donkeymill',
      name: 'donkeymill',
      loader: () => import('./pages/DonkeyMill.vue'),
      meta: { title: '驴拉磨' }
    }
  ]
}
