export type SlimeRarity = "N" | "R" | "SR" | "SSR";

export type SlimeDefinition = {
  id: string;
  defaultName: string;
  rarity: SlimeRarity;
  image: string;
  description: string;
  accessory: string;
};

export const SLIMES: SlimeDefinition[] = [
  {
    id: "n-green",
    defaultName: "綠色史萊姆",
    rarity: "N",
    image: "/slimes/n-green.png",
    description: "最普通，也最理直氣壯地陪你從第一題開始。",
    accessory: "嫩芽小帽",
  },
  {
    id: "n-blue",
    defaultName: "藍色史萊姆",
    rarity: "N",
    image: "/slimes/n-blue.png",
    description: "看起來很冷靜，其實只是還沒讀到不會的。",
    accessory: "迷你水手帽",
  },
  {
    id: "n-pink",
    defaultName: "粉色史萊姆",
    rarity: "N",
    image: "/slimes/n-pink.png",
    description: "讀書可以慢慢來，但可愛要先到位。",
    accessory: "愛心領結",
  },
  {
    id: "n-purple",
    defaultName: "紫色史萊姆",
    rarity: "N",
    image: "/slimes/n-purple.png",
    description: "有點神秘，據說很會在考前突然想起重點。",
    accessory: "星月魔法帽",
  },

  {
    id: "r-insomnia",
    defaultName: "失眠史萊姆",
    rarity: "R",
    image: "/slimes/r-insomnia.png",
    description: "眼睛還開著，腦袋已經進入待機模式。",
    accessory: "歪戴睡眠眼罩",
  },
  {
    id: "r-cat",
    defaultName: "貓貓史萊姆",
    rarity: "R",
    image: "/slimes/r-cat.png",
    description: "你讀書牠監工；你分心牠也假裝沒看到。",
    accessory: "金色貓鈴項圈",
  },
  {
    id: "r-dog",
    defaultName: "狗狗史萊姆",
    rarity: "R",
    image: "/slimes/r-dog.png",
    description: "不一定懂題目，但每次翻頁都替你開心。",
    accessory: "紅色三角領巾",
  },
  {
    id: "r-panda",
    defaultName: "熊貓史萊姆",
    rarity: "R",
    image: "/slimes/r-panda.png",
    description: "黑眼圈是天生的，所以熬夜完全看不出來。",
    accessory: "竹葉斗笠",
  },
  {
    id: "r-tired",
    defaultName: "厭世史萊姆",
    rarity: "R",
    image: "/slimes/r-tired.png",
    description: "不是不想讀，只是今天對世界的耐心比較少。",
    accessory: "黑色圓框墨鏡",
  },
  {
    id: "r-melting",
    defaultName: "融化史萊姆",
    rarity: "R",
    image: "/slimes/r-melting.png",
    description: "再多一題就要沿著桌邊流下去了。",
    accessory: "大冰杯",
  },

  {
    id: "sr-sushi",
    defaultName: "壽司史萊姆",
    rarity: "SR",
    image: "/slimes/sr-sushi.png",
    description: "看起來很精緻，腦袋裡想的只有下一餐。",
    accessory: "魚卵小帽",
  },
  {
    id: "sr-riceball",
    defaultName: "飯糰史萊姆",
    rarity: "SR",
    image: "/slimes/sr-riceball.png",
    description: "樸實可靠，適合陪你撐過最餓的那一章。",
    accessory: "梅子徽章",
  },
  {
    id: "sr-takoyaki",
    defaultName: "章魚燒史萊姆",
    rarity: "SR",
    image: "/slimes/sr-takoyaki.png",
    description: "外表圓滾滾，遇到難題也會燙到縮一下。",
    accessory: "章魚小頭巾",
  },
  {
    id: "sr-burger",
    defaultName: "漢堡史萊姆",
    rarity: "SR",
    image: "/slimes/sr-burger.png",
    description: "層層堆疊，就像考前還沒讀完的章節。",
    accessory: "薯條皇冠",
  },
  {
    id: "sr-boba",
    defaultName: "珍奶史萊姆",
    rarity: "SR",
    image: "/slimes/sr-boba.png",
    description: "每讀完一頁，都想獎勵自己吸一口。",
    accessory: "奶泡小帽",
  },
  {
    id: "sr-latte",
    defaultName: "拿鐵史萊姆",
    rarity: "SR",
    image: "/slimes/sr-latte.png",
    description: "負責營造很認真讀書的氣氛，醒不醒另說。",
    accessory: "咖啡師圍裙",
  },

  {
    id: "ssr-404",
    defaultName: "ERROR 404 史萊姆",
    rarity: "SSR",
    image: "/slimes/ssr-404.png",
    description: "ERROR 404：剛剛背過的內容目前找不到。",
    accessory: "故障電腦艙",
  },
];

export const SLIME_BY_ID = Object.fromEntries(
  SLIMES.map((slime) => [slime.id, slime]),
) as Record<string, SlimeDefinition>;

export const RARITY_ORDER: Record<SlimeRarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  SSR: 3,
};
