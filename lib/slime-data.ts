export type SlimeRarity = "N" | "R" | "SR" | "SSR";

export type SlimeDefinition = {
  id: string;
  defaultName: string;
  rarity: SlimeRarity;
  image: string;
  description: string;
  accessory: string;
};

/**
 * MedSlime 固定角色資料
 *
 * 這裡只放「不會因使用者而改變」的資料：
 * - 角色 ID
 * - 預設名稱
 * - 稀有度
 * - 圖片
 * - 介紹
 * - 專屬飾品名稱
 *
 * 不要把 owned / fragments / nickname / companion
 * 這些玩家狀態放進來，之後會由 Supabase 提供。
 *
 * 目前圖片先使用 public/slimes 裡現有素材。
 * 等 17 隻正式美術完成後，只需要在這一份檔案換 image。
 */
export const SLIMES: SlimeDefinition[] = [
  {
    id: "n-green",
    defaultName: "綠色史萊姆",
    rarity: "N",
    image: "/slimes/apple.PNG",
    description: "最經典的 MedSlime 夥伴。",
    accessory: "嫩芽髮夾",
  },
  {
    id: "n-blue",
    defaultName: "藍色史萊姆",
    rarity: "N",
    image: "/slimes/ocean.PNG",
    description: "安靜又可靠的讀書夥伴。",
    accessory: "水滴小帽",
  },
  {
    id: "n-yellow",
    defaultName: "黃色史萊姆",
    rarity: "N",
    image: "/slimes/lemon.PNG",
    description: "總是帶著一點明亮好心情。",
    accessory: "檸檬髮夾",
  },
  {
    id: "n-pink",
    defaultName: "粉色史萊姆",
    rarity: "N",
    image: "/slimes/strawberry.PNG",
    description: "軟綿綿又親人的陪伴型史萊姆。",
    accessory: "愛心髮夾",
  },

  {
    id: "r-coffee",
    defaultName: "拿鐵史萊姆",
    rarity: "R",
    image: "/slimes/coffee.PNG",
    description: "讀書前先來一杯，精神才跟得上。",
    accessory: "咖啡杯",
  },
  {
    id: "r-burger",
    defaultName: "漢堡史萊姆",
    rarity: "R",
    image: "/slimes/honey.PNG",
    description: "看起來永遠都像剛吃飽。",
    accessory: "迷你漢堡",
  },
  {
    id: "r-sushi",
    defaultName: "壽司史萊姆",
    rarity: "R",
    image: "/slimes/grape.PNG",
    description: "安安靜靜地待在旁邊陪你刷題。",
    accessory: "壽司髮飾",
  },
  {
    id: "r-boba",
    defaultName: "珍珠奶茶史萊姆",
    rarity: "R",
    image: "/slimes/milk.PNG",
    description: "讀累了就想吸一口珍奶。",
    accessory: "珍珠吸管",
  },
  {
    id: "r-riceball",
    defaultName: "飯糰史萊姆",
    rarity: "R",
    image: "/slimes/sunset.PNG",
    description: "簡單、可靠，而且很有飽足感。",
    accessory: "海苔頭巾",
  },
  {
    id: "r-takoyaki",
    defaultName: "章魚燒史萊姆",
    rarity: "R",
    image: "/slimes/starry.PNG",
    description: "圓滾滾地在題目旁邊晃來晃去。",
    accessory: "章魚燒叉",
  },

  {
    id: "sr-insomnia",
    defaultName: "失眠史萊姆",
    rarity: "SR",
    image: "/slimes/cloud.PNG",
    description: "眼睛睜著，但靈魂可能已經睡了。",
    accessory: "失眠眼罩",
  },
  {
    id: "sr-melting",
    defaultName: "融化史萊姆",
    rarity: "SR",
    image: "/slimes/honey.PNG",
    description: "今天讀到這裡就已經快融化了。",
    accessory: "冰敷袋",
  },
  {
    id: "sr-soul",
    defaultName: "靈魂出竅史萊姆",
    rarity: "SR",
    image: "/slimes/cloud.PNG",
    description: "身體還在書桌前，靈魂已經先走一步。",
    accessory: "小幽靈",
  },
  {
    id: "sr-crying",
    defaultName: "爆哭史萊姆",
    rarity: "SR",
    image: "/slimes/ocean.PNG",
    description: "看到錯題數量的瞬間忍不住了。",
    accessory: "面紙盒",
  },
  {
    id: "sr-404",
    defaultName: "404 史萊姆",
    rarity: "SR",
    image: "/slimes/starry.PNG",
    description: "腦內資料暫時找不到。",
    accessory: "ERROR 貼紙",
  },
  {
    id: "sr-tired",
    defaultName: "厭世史萊姆",
    rarity: "SR",
    image: "/slimes/sunset.PNG",
    description: "不是不讀，只是對世界有點累。",
    accessory: "厭世眼鏡",
  },

  {
    id: "ssr-chill",
    defaultName: "Chill 史萊姆",
    rarity: "SSR",
    image: "/slimes/cloud.PNG",
    description: "不用急，該讀的還是會讀完。",
    accessory: "Chill 墨鏡",
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
