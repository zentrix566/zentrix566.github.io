// 「黑暗帝国的统治」开卡留档（obtained 回顾区）+ 还没开到的卡（cards 缺失清单）。
// 全版本 135 张：11 个职业各 10 张 + 中立 25 张；当前已开到 121 张、还差 14 张，
// cards 里每划掉一张，总进度就自动 +1（总进度 = (135 − 仍未开到数) / 135）。
// 卡表经 HearthstoneJSON 校对，卡面图为官方卡牌库渲染图（404×558，2026-10-19 抓取）。
// - class：classes 里的职业 key；rarity：legendary 传说 / epic 史诗 / rare 稀有 / common 普通
// - image：assets/ 目录下的文件名（文件名 = 官方卡牌 id）
// - fav: true 表示重点关注的卡，缺失清单顶部「⭐ 重点关注」前排展示
// 开卡留档流程：哪张开到了，把它的条目从下面 cards 挪到 obtained，并补 source（pack 开包 /
// craft 合成 / event 活动）和 date（YYYY-MM-DD），image 保留不动，页面「已开到的卡」回顾区即显示。
export const expansion = {
  name: '黑暗帝国的统治',
  total: 135,
  obtained: [
    // 死亡骑士
    { id: 'BE_287', name: "戈霍恩", class: 'deathknight', rarity: 'legendary', image: 'BE_287.png', source: 'pack', date: '2026-10-21' },
    // 恶魔猎手
    { id: 'BE_565', name: "巢穴女王沙卡尔", class: 'demonhunter', rarity: 'legendary', image: 'BE_565.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_265', name: "合围", class: 'demonhunter', rarity: 'epic', image: 'BE_265.png', source: 'pack', date: '2026-10-21' },
    // 德鲁伊
    { id: 'BE_852', name: "阿穆纳伊", class: 'druid', rarity: 'legendary', image: 'BE_852.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_802', name: "死亡绽放", class: 'druid', rarity: 'epic', image: 'BE_802.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_850t', name: "好奇的恐惧山猫", class: 'druid', rarity: 'epic', image: 'BE_850t.png', source: 'pack', date: '2026-10-21' },
    // 猎人
    { id: 'BE_588', name: "米米尔隆", class: 'hunter', rarity: 'legendary', image: 'BE_588.png', fav: true, source: 'pack', date: '2026-10-21' },
    // 圣骑士
    { id: 'BE_143', name: "阿米图特，阿米图斯的守护者", class: 'paladin', rarity: 'legendary', image: 'BE_143.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_146', name: "誓缚光环", class: 'paladin', rarity: 'epic', image: 'BE_146.png', source: 'pack', date: '2026-10-21' },
    // 牧师
    { id: 'BE_227', name: "黑暗帝国之刃", class: 'priest', rarity: 'legendary', image: 'BE_227.png', source: 'pack', date: '2026-10-21' },
    // 潜行者
    { id: 'BE_702', name: "暗影匠师", class: 'rogue', rarity: 'epic', image: 'BE_702.png', source: 'pack', date: '2026-10-21' },
    // 萨满
    { id: 'BE_209', name: "耐普图隆，潮汐之王", class: 'shaman', rarity: 'legendary', image: 'BE_209.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_171', name: "威能恐魔", class: 'shaman', rarity: 'epic', image: 'BE_171.png', source: 'pack', date: '2026-10-21' },
    // 术士
    { id: 'BE_005', name: "充盈仪式", class: 'warlock', rarity: 'epic', image: 'BE_005.png', source: 'pack', date: '2026-10-21' },
    // 战士
    { id: 'BE_055', name: "阿扎达斯", class: 'warrior', rarity: 'legendary', image: 'BE_055.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_600', name: "钢铁活化者", class: 'warrior', rarity: 'epic', image: 'BE_600.png', source: 'pack', date: '2026-10-21' },
    // 中立
    { id: 'BE_784', name: "亚煞极，泰坦杀神", class: 'neutral', rarity: 'legendary', image: 'BE_784.png', fav: true, source: 'pack', date: '2026-10-21' },
    { id: 'BE_017', name: "恩佐斯，梦境之末", class: 'neutral', rarity: 'legendary', image: 'BE_017.png', fav: true, source: 'pack', date: '2026-10-21' },
    { id: 'BE_008', name: "魔古将领", class: 'neutral', rarity: 'epic', image: 'BE_008.png', source: 'pack', date: '2026-10-21' },
    { id: 'BE_994', name: "石头穴居人", class: 'neutral', rarity: 'epic', image: 'BE_994.png', source: 'pack', date: '2026-10-21' }
  ],
  cards: [
    // 恶魔猎手
    { id: 'BE_230', name: "拉维兹", class: 'demonhunter', rarity: 'legendary', image: 'BE_230.png' },
    { id: 'BE_771', name: "触须刺鞭", class: 'demonhunter', rarity: 'epic', image: 'BE_771.png' },
    // 猎人
    { id: 'BE_732', name: "穿刺者克洛恩", class: 'hunter', rarity: 'legendary', image: 'BE_732.png' },
    { id: 'BE_731', name: "原始石牙兽", class: 'hunter', rarity: 'epic', image: 'BE_731.png' },
    { id: 'BE_555', name: "重新装填", class: 'hunter', rarity: 'epic', image: 'BE_555.png' },
    // 法师
    { id: 'BE_250', name: "诺甘农的圆盘", class: 'mage', rarity: 'legendary', image: 'BE_250.png' },
    { id: 'BE_259', name: "伊希斯特", class: 'mage', rarity: 'legendary', image: 'BE_259.png' },
    { id: 'BE_270', name: "冰轮法师", class: 'mage', rarity: 'epic', image: 'BE_270.png' },
    // 牧师
    { id: 'BE_790', name: "泽奥图", class: 'priest', rarity: 'legendary', image: 'BE_790.png' },
    // 潜行者
    { id: 'BE_725', name: "不可知者", class: 'rogue', rarity: 'legendary', image: 'BE_725.png' },
    // 萨满
    { id: 'BE_337', name: "地母塞拉赞恩", class: 'shaman', rarity: 'legendary', image: 'BE_337.png' },
    // 战士
    { id: 'BE_557', name: "塞特斯", class: 'warrior', rarity: 'legendary', image: 'BE_557.png', fav: true },
    // 中立
    { id: 'BE_009', name: "古神主谋尤格-萨隆", class: 'neutral', rarity: 'legendary', image: 'BE_009.png', fav: true },
    { id: 'BE_327', name: "秘典翻译官", class: 'neutral', rarity: 'epic', image: 'BE_327.png' }
  ]
}

// 职业排列顺序沿用炉石客户端：死亡骑士打头、中立殿后；每个职业 10 张、中立 25 张
export const classes = [
  { key: 'deathknight', label: '死亡骑士', emoji: '💀', total: 10 },
  { key: 'demonhunter', label: '恶魔猎手', emoji: '👹', total: 10 },
  { key: 'druid', label: '德鲁伊', emoji: '🐻', total: 10 },
  { key: 'hunter', label: '猎人', emoji: '🏹', total: 10 },
  { key: 'mage', label: '法师', emoji: '🔮', total: 10 },
  { key: 'paladin', label: '圣骑士', emoji: '🛡️', total: 10 },
  { key: 'priest', label: '牧师', emoji: '🙏', total: 10 },
  { key: 'rogue', label: '潜行者', emoji: '🗡️', total: 10 },
  { key: 'shaman', label: '萨满', emoji: '🌊', total: 10 },
  { key: 'warlock', label: '术士', emoji: '👁️', total: 10 },
  { key: 'warrior', label: '战士', emoji: '⚔️', total: 10 },
  { key: 'neutral', label: '中立', emoji: '🌑', total: 25 }
]

export const rarities = [
  { key: 'legendary', label: '传说', color: '#ff8000' },
  { key: 'epic', label: '史诗', color: '#a335ee' },
  { key: 'rare', label: '稀有', color: '#0070dd' },
  { key: 'common', label: '普通', color: '#9d9d9d' }
]
