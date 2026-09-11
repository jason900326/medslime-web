export type SlimeRarity = "N" | "R" | "SR" | "SSR";

export type SlimeDefinition = {
  id: string;
  defaultName: string;
  rarity: SlimeRarity;
  image: string;
  description: string;
};

export const SLIMES: SlimeDefinition[] = [
  {
    id: "n-green",
    defaultName: "綠色史萊姆",
    rarity: "N",
    image: "/slimes/n-green.png",
    description: "最普通，也最理直氣壯地陪你從第一題開始。",
  },
  {
    id: "n-blue",
    defaultName: "藍色史萊姆",
    rarity: "N",
    image: "/slimes/n-blue.png",
    description: "看起來很冷靜，其實只是還沒讀到不會的。",
  },
  {
    id: "n-pink",
    defaultName: "粉色史萊姆",
    rarity: "N",
    image: "/slimes/n-pink.png",
    description: "讀書可以慢慢來，但可愛要先到位。",
  },
  {
    id: "n-purple",
    defaultName: "紫色史萊姆",
    rarity: "N",
    image: "/slimes/n-purple.png",
    description: "有點神秘，據說很會在考前突然想起重點。",
  },
  {
    // Stable legacy ID: this character moved from R to N in the 24-slime refresh.
    // Keeping the ID preserves existing ownership, nicknames, and companion selection.
    id: "r-melting",
    defaultName: "融化史萊姆",
    rarity: "N",
    image: "/slimes/n-melting.png",
    description: "讀到快失去形狀了，但還是勉強黏在書桌旁。",
  },
  {
    id: "n-white",
    defaultName: "白色史萊姆",
    rarity: "N",
    image: "/slimes/n-white.png",
    description: "看起來乾乾淨淨，腦袋也希望可以保持這麼清爽。",
  },
  {
    id: "n-yellow",
    defaultName: "黃色史萊姆",
    rarity: "N",
    image: "/slimes/n-yellow.png",
    description: "自帶一點亮度，適合在讀書讀到發黑時出現。",
  },

  {
    id: "r-insomnia",
    defaultName: "失眠史萊姆",
    rarity: "R",
    image: "/slimes/r-insomnia.png",
    description: "眼睛還開著，腦袋已經進入待機模式。",
  },
  {
    id: "r-cat",
    defaultName: "貓貓史萊姆",
    rarity: "R",
    image: "/slimes/r-cat.png",
    description: "你讀書牠監工；你分心牠也假裝沒看到。",
  },
  {
    id: "r-dog",
    defaultName: "狗狗史萊姆",
    rarity: "R",
    image: "/slimes/r-dog.png",
    description: "不一定懂題目，但每次翻頁都替你開心。",
  },
  {
    id: "r-panda",
    defaultName: "熊貓史萊姆",
    rarity: "R",
    image: "/slimes/r-panda.png",
    description: "黑眼圈是天生的，所以熬夜完全看不出來。",
  },
  {
    id: "r-tired",
    defaultName: "厭世史萊姆",
    rarity: "R",
    image: "/slimes/r-tired.png",
    description: "不是不想讀，只是今天對世界的耐心比較少。",
  },
  {
    id: "r-cloud",
    defaultName: "雲朵史萊姆",
    rarity: "R",
    image: "/slimes/r-cloud.png",
    description: "腦袋偶爾飄得有點遠，叫幾次還是會慢慢飄回來。",
  },
  {
    id: "r-frog",
    defaultName: "青蛙史萊姆",
    rarity: "R",
    image: "/slimes/r-frog.png",
    description: "遇到難題先蹲一下，想通之後再一口氣跳過去。",
  },

  {
    id: "sr-sushi",
    defaultName: "壽司史萊姆",
    rarity: "SR",
    image: "/slimes/sr-sushi.png",
    description: "看起來很精緻，腦袋裡想的只有下一餐。",
  },
  {
    id: "sr-riceball",
    defaultName: "飯糰史萊姆",
    rarity: "SR",
    image: "/slimes/sr-riceball.png",
    description: "樸實可靠，適合陪你撐過最餓的那一章。",
  },
  {
    id: "sr-takoyaki",
    defaultName: "章魚燒史萊姆",
    rarity: "SR",
    image: "/slimes/sr-takoyaki.png",
    description: "外表圓滾滾，遇到難題也會燙到縮一下。",
  },
  {
    id: "sr-burger",
    defaultName: "漢堡史萊姆",
    rarity: "SR",
    image: "/slimes/sr-burger.png",
    description: "層層堆疊，就像考前還沒讀完的章節。",
  },
  {
    id: "sr-boba",
    defaultName: "珍奶史萊姆",
    rarity: "SR",
    image: "/slimes/sr-boba.png",
    description: "每讀完一頁，都想獎勵自己吸一口。",
  },
  {
    id: "sr-latte",
    defaultName: "拿鐵史萊姆",
    rarity: "SR",
    image: "/slimes/sr-latte.png",
    description: "負責營造很認真讀書的氣氛，醒不醒另說。",
  },

  {
    id: "ssr-404",
    defaultName: "ERROR 404 史萊姆",
    rarity: "SSR",
    image: "/slimes/ssr-404.png",
    description: "ERROR 404：剛剛背過的內容目前找不到。",
  },
  {
    id: "ssr-burnout",
    defaultName: "爆肝史萊姆",
    rarity: "SSR",
    image: "/slimes/ssr-burnout.png",
    description: "被參考書和考試壓到只剩一點靈魂，卻還沒打算投降。",
  },
  {
    id: "ssr-medgod",
    defaultName: "醫神史萊姆",
    rarity: "SSR",
    image: "/slimes/ssr-medgod.png",
    description: "傳說讀到最高境界時會出現，手上的每一本書都像開過光。",
  },
  {
    id: "ssr-notes",
    defaultName: "筆記海史萊姆",
    rarity: "SSR",
    image: "/slimes/ssr-notes.png",
    description: "便利貼、講義和重點整理堆成海，牠本人已經找不到出口。",
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
