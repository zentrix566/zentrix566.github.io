// 四关配置：配色、掩体槽位、出兵波次、Boss
// 坐标基于 960×540 逻辑画布；slot.y 为脚部基线，s 为绘制缩放
// 波次 units: [类型, 槽位]（rusher 用 -1 表示自由路线），supply: [补给类型, 槽位]

export const STAGES = [
  {
    key: 'zhabei',
    full: '第一关 · 闸北街头',
    name: '闸北街头',
    date: '1937年8月13日 · 淞沪会战爆发',
    story: '炮声撕碎了闸北的夜空，街垒在燃烧。华成龙端起驳壳枪摸上大街——日军先头部队已经渗透进来，杀过去！',
    props: 'street',
    sky: ['#160f28', '#57251c', '#b85c28'],
    groundY: 468,
    slots: [
      { x: 150, y: 396, s: 0.6, cover: 'sandbag' },
      { x: 318, y: 432, s: 0.85, cover: 'door' },
      { x: 520, y: 408, s: 0.72, cover: 'sandbag' },
      { x: 700, y: 440, s: 0.95, cover: 'crate' },
      { x: 848, y: 470, s: 1.1, cover: 'wreck' },
      { x: 480, y: 356, s: 0.45, cover: 'rubble' }
    ],
    waves: [
      { at: 1.2, units: [['rifle', 0], ['rifle', 3]] },
      { at: 8, units: [['rifle', 1], ['rifle', 4]] },
      { at: 15, units: [['rifle', 5], ['rifle', 2], ['rifle', 4]] },
      { at: 23, units: [['officer', 3], ['rifle', 0], ['rifle', 2]] },
      { at: 31, units: [['rusher', -1]] },
      { at: 36, units: [['rifle', 1], ['rifle', 5], ['rifle', 4], ['rifle', 2]] },
      { at: 42, supply: ['nade', 3] },
      { at: 46, boss: true }
    ],
    boss: { name: '岗村军曹', hp: 650, slot: 4 }
  },
  {
    key: 'dock',
    full: '第二关 · 苏州河码头',
    name: '苏州河码头',
    date: '1937年8月18日 · 夜袭日军军火栈',
    story: '苏州河的夜雾里，日军正把军火一件件卸上岸。炸掉这个栈头，闸北的弟兄就能多守一天——摸进去，动手。',
    props: 'dock',
    sky: ['#040913', '#0b1a30', '#1d3050'],
    groundY: 472,
    slots: [
      { x: 130, y: 390, s: 0.6, cover: 'crate' },
      { x: 300, y: 426, s: 0.85, cover: 'door' },
      { x: 470, y: 452, s: 1.0, cover: 'crate' },
      { x: 645, y: 420, s: 0.8, cover: 'sandbag' },
      { x: 825, y: 466, s: 1.1, cover: 'crate' },
      { x: 520, y: 352, s: 0.42, cover: 'rail' }
    ],
    waves: [
      { at: 1.0, units: [['rifle', 2], ['rifle', 0]] },
      { at: 7, units: [['kneemortar', 3], ['rifle', 1]] },
      { at: 14, units: [['rifle', 4], ['rifle', 5], ['rifle', 0]] },
      { at: 21, units: [['rusher', -1], ['kneemortar', 2]] },
      { at: 28, units: [['officer', 2], ['rifle', 3], ['rifle', 4]] },
      { at: 34, supply: ['lmg', 1] },
      { at: 37, units: [['kneemortar', 0], ['rusher', -1], ['rifle', 5]] },
      { at: 46, boss: true }
    ],
    boss: { name: '海军陆战队长', hp: 1050, slot: 2 }
  },
  {
    key: 'ballroom',
    full: '第三关 · 百乐门',
    name: '百乐门',
    date: '1937年8月22日 · 舞厅里的特高课',
    story: '百乐门的爵士乐还没停，特高课的杀手已经坐进了卡座。华成龙踢开后门——灯影里全是刺刀。今晚这舞，只能血终。',
    props: 'ballroom',
    sky: ['#230b12', '#431620', '#6d2a24'],
    groundY: 462,
    slots: [
      { x: 168, y: 420, s: 0.8, cover: 'pillar' },
      { x: 338, y: 456, s: 1.0, cover: 'table' },
      { x: 508, y: 432, s: 0.9, cover: 'sofa' },
      { x: 662, y: 462, s: 1.05, cover: 'table' },
      { x: 822, y: 428, s: 0.9, cover: 'pillar' },
      { x: 480, y: 366, s: 0.55, cover: 'rail' }
    ],
    waves: [
      { at: 1.0, units: [['officer', 1], ['rifle', 4]] },
      { at: 8, units: [['rusher', -1], ['officer', 3]] },
      { at: 15, units: [['rifle', 0], ['rifle', 5], ['officer', 2]] },
      { at: 23, units: [['rusher', -1], ['kneemortar', 4]] },
      { at: 30, units: [['officer', 1], ['officer', 3], ['rifle', 0]] },
      { at: 37, supply: ['med', 2] },
      { at: 40, units: [['rusher', -1], ['rusher', -1], ['rifle', 5]] },
      { at: 48, boss: true }
    ],
    boss: { name: '特高课课长', hp: 1500, slot: 3 }
  },
  {
    key: 'hq',
    full: '最终关 · 虹口司令部',
    name: '虹口司令部',
    date: '1937年8月25日 · 暴雨夜 · 决死突击',
    story: '雨下了一整夜。虹口司令部就在铁丝网后——最后几百米，华成龙把最后一梭子压进弹匣：为了闸北，为了四行，冲！',
    props: 'hq',
    sky: ['#070b11', '#141f2b', '#273744'],
    groundY: 470,
    slots: [
      { x: 140, y: 392, s: 0.6, cover: 'sandbag' },
      { x: 310, y: 428, s: 0.85, cover: 'crate' },
      { x: 500, y: 450, s: 1.0, cover: 'sandbag' },
      { x: 680, y: 424, s: 0.85, cover: 'door' },
      { x: 852, y: 468, s: 1.12, cover: 'crate' },
      { x: 470, y: 350, s: 0.45, cover: 'rubble' }
    ],
    waves: [
      { at: 1.0, units: [['rifle', 1], ['kneemortar', 3], ['rifle', 0]] },
      { at: 9, units: [['officer', 2], ['rifle', 4], ['rifle', 5]] },
      { at: 17, units: [['rusher', -1], ['kneemortar', 1], ['rifle', 3]] },
      { at: 25, units: [['officer', 4], ['rifle', 0], ['rifle', 2], ['rifle', 5]] },
      { at: 33, supply: ['lmg', 3] },
      { at: 36, units: [['rusher', -1], ['rusher', -1], ['kneemortar', 4]] },
      { at: 45, units: [['officer', 1], ['officer', 3], ['rifle', 0], ['rifle', 2]] },
      { at: 54, boss: true }
    ],
    boss: { name: '上海派遣军大佐', hp: 2000, slot: 2 }
  }
]

// 敌人基础属性（按关卡序号做难度增量由 engine 计算）
export const ENEMY_STATS = {
  rifle: { hp: 60, score: 100, dmg: 10 },
  officer: { hp: 110, score: 200, dmg: 9 },
  kneemortar: { hp: 70, score: 150, dmg: 22 }, // dmg 为落地手榴弹伤害
  rusher: { hp: 100, score: 200, dmg: 18 }
}

// 玩家武器
export const WEAPONS = [
  { id: 'pistol', name: '驳壳枪', short: '驳壳枪', mag: 20, dmg: 34, headMul: 3, rate: 0.16, auto: false, reload: 1.1, spread: 0 },
  { id: 'smg', name: '汤姆逊冲锋枪', short: '冲锋枪', mag: 50, dmg: 14, headMul: 2.5, rate: 0.085, auto: true, reload: 1.6, spread: 3 },
  { id: 'lmg', name: '捷克式轻机枪', short: '轻机枪', mag: 100, dmg: 20, headMul: 2, rate: 0.09, auto: true, reload: 2.6, spread: 4 },
  { id: 'nade', name: '手榴弹', short: '手榴弹', mag: 1, dmg: 130, headMul: 1, rate: 0.9, auto: false, reload: 0, spread: 0 }
]
