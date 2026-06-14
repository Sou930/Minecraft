"use strict";const WORLD_W=768,WORLD_H=96,WORLD_D=768,CHUNK=16,SEA_LEVEL=40,ATLAS_TILES=8,ATLAS_ROWS=16,TILE_PX=32,ATLAS_W=ATLAS_TILES*TILE_PX,ATLAS_H=ATLAS_ROWS*TILE_PX,ATLAS_PX=ATLAS_W;const T={GRASS_TOP:0,GRASS_SIDE:1,DIRT:2,STONE:3,SAND:4,LOG_SIDE:5,LOG_TOP:6,LEAVES:7,PLANKS:8,GLASS:9,BRICK:10,BEDROCK:11,WATER:12,COBBLE:13,COAL_ORE:14,IRON_ORE:15,GOLD_ORE:16,DIAMOND_ORE:17,GRAVEL:18,SANDSTONE_TOP:19,SANDSTONE_SIDE:20,SNOW:21,ICE:22,OBSIDIAN:23,CACTUS_SIDE:24,CACTUS_TOP:25,CRAFT_TOP:26,CRAFT_SIDE:27,FURNACE_TOP:28,FURNACE_FRONT:29,BIRCH_SIDE:30,BIRCH_TOP:31,BIRCH_LEAVES:32,LAVA:33,CORAL_PINK:34,CORAL_PURPLE:35,CORAL_BLUE:36,SEAWEED:37,DEAD_LOG_SIDE:38,DEAD_LOG_TOP:39,STONE_BRICK:40,MOSSY_BRICK:41,CRACKED_BRICK:42,PATH_TOP:43,PATH_SIDE:44,TORCH:45,COBWEB:46,RAIL:47,CHEST_TOP:48,CHEST_SIDE:49,CHEST_FRONT:50,WOOL_RED:51,WOOL_WHITE:52,BOOKSHELF:53,LANTERN:54,HAY_SIDE:55,HAY_TOP:56,DRIPSTONE:57,CALCITE:58,AMETHYST_BLOCK:59,AMETHYST_CLUSTER:60,MOSS:61,GLOW_LICHEN:62,SMOOTH_BASALT:63,FARMLAND_DRY:64,FARMLAND_WET:65,WHEAT0:66,WHEAT1:67,WHEAT2:68,WHEAT3:69,CARROT0:70,CARROT1:71,CARROT2:72,POTATO0:73,POTATO1:74,POTATO2:75,PUMPKIN_TOP:76,PUMPKIN_SIDE:77,PUMPKIN_FACE:78,MELON_TOP:79,MELON_SIDE:80,PUMPKIN_STEM:81,DEAD_BUSH:82};const B={AIR:0,GRASS:1,DIRT:2,STONE:3,SAND:4,LOG:5,LEAVES:6,PLANKS:7,GLASS:8,BRICK:9,BEDROCK:10,WATER:11,COBBLE:12,COAL_ORE:13,IRON_ORE:14,GOLD_ORE:15,DIAMOND_ORE:16,GRAVEL:17,SANDSTONE:18,SNOW:19,ICE:20,OBSIDIAN:21,CACTUS:22,CRAFTING:23,FURNACE:24,BIRCH_LOG:25,BIRCH_LEAVES:26,LAVA:27,CORAL_PINK:28,CORAL_PURPLE:29,CORAL_BLUE:30,SEAWEED:31,DEAD_LOG:32,STONE_BRICK:33,MOSSY_BRICK:34,CRACKED_BRICK:35,PATH:36,TORCH:37,COBWEB:38,RAIL:39,CHEST:40,WOOL_RED:41,WOOL_WHITE:42,BOOKSHELF:43,LANTERN:44,HAY:45,DRIPSTONE:46,CALCITE:47,AMETHYST_BLOCK:48,AMETHYST_CLUSTER:49,MOSS:50,GLOW_LICHEN:51,SMOOTH_BASALT:52,FARMLAND:53,FARMLAND_WET:54,WHEAT:55,CARROT:56,POTATO:57,PUMPKIN:58,MELON:59,DEAD_BUSH:60};const BLOCKS={[B.GRASS]:{name:"草ブロック",top:T.GRASS_TOP,side:T.GRASS_SIDE,bottom:T.DIRT,breakTime:0.9},[B.DIRT]:{name:"土",all:T.DIRT,breakTime:0.75},[B.STONE]:{name:"石",all:T.STONE,breakTime:7.5},[B.SAND]:{name:"砂",all:T.SAND,breakTime:0.75},[B.LOG]:{name:"原木",top:T.LOG_TOP,side:T.LOG_SIDE,bottom:T.LOG_TOP,breakTime:3.0},[B.LEAVES]:{name:"葉",all:T.LEAVES,transparent:true,breakTime:0.3},[B.PLANKS]:{name:"木材",all:T.PLANKS,breakTime:3.0},[B.GLASS]:{name:"ガラス",all:T.GLASS,transparent:true,breakTime:0.45},[B.BRICK]:{name:"レンガ",all:T.BRICK,breakTime:10.0},[B.BEDROCK]:{name:"岩盤",all:T.BEDROCK,unbreakable:true},[B.WATER]:{name:"水",all:T.WATER,transparent:true,fluid:true},[B.COBBLE]:{name:"丸石",all:T.COBBLE,breakTime:10.0},[B.COAL_ORE]:{name:"石炭鉱石",all:T.COAL_ORE,breakTime:8.0},[B.IRON_ORE]:{name:"鉄鉱石",all:T.IRON_ORE,breakTime:9.0},[B.GOLD_ORE]:{name:"金鉱石",all:T.GOLD_ORE,breakTime:9.0},[B.DIAMOND_ORE]:{name:"ダイヤモンド鉱石",all:T.DIAMOND_ORE,breakTime:11.0},[B.GRAVEL]:{name:"砂利",all:T.GRAVEL,breakTime:0.9},[B.SANDSTONE]:{name:"砂岩",top:T.SANDSTONE_TOP,side:T.SANDSTONE_SIDE,bottom:T.SANDSTONE_TOP,breakTime:4.0},[B.SNOW]:{name:"雪ブロック",all:T.SNOW,breakTime:1.0},[B.ICE]:{name:"氷",all:T.ICE,breakTime:0.75},[B.OBSIDIAN]:{name:"黒曜石",all:T.OBSIDIAN,breakTime:45.0},[B.CACTUS]:{name:"サボテン",top:T.CACTUS_TOP,side:T.CACTUS_SIDE,bottom:T.CACTUS_TOP,breakTime:0.6},[B.CRAFTING]:{name:"作業台",top:T.CRAFT_TOP,side:T.CRAFT_SIDE,bottom:T.PLANKS,breakTime:3.75},[B.FURNACE]:{name:"かまど",top:T.FURNACE_TOP,side:T.FURNACE_FRONT,bottom:T.FURNACE_TOP,breakTime:13.0},[B.BIRCH_LOG]:{name:"白樺の原木",top:T.BIRCH_TOP,side:T.BIRCH_SIDE,bottom:T.BIRCH_TOP,breakTime:3.0},[B.BIRCH_LEAVES]:{name:"白樺の葉",all:T.BIRCH_LEAVES,transparent:true,breakTime:0.3},[B.LAVA]:{name:"溶岩",all:T.LAVA,fluid:true,emissive:true,damage:true},[B.CORAL_PINK]:{name:"ピンクサンゴ",all:T.CORAL_PINK,transparent:true,cross:true,breakTime:0.4},[B.CORAL_PURPLE]:{name:"紫サンゴ",all:T.CORAL_PURPLE,transparent:true,cross:true,breakTime:0.4},[B.CORAL_BLUE]:{name:"青サンゴ",all:T.CORAL_BLUE,transparent:true,cross:true,breakTime:0.4},[B.SEAWEED]:{name:"海藻",all:T.SEAWEED,transparent:true,cross:true,breakTime:0.2},[B.DEAD_LOG]:{name:"枯れ木",top:T.DEAD_LOG_TOP,side:T.DEAD_LOG_SIDE,bottom:T.DEAD_LOG_TOP,breakTime:2.4},[B.STONE_BRICK]:{name:"石レンガ",all:T.STONE_BRICK,breakTime:9.0},[B.MOSSY_BRICK]:{name:"苔石レンガ",all:T.MOSSY_BRICK,breakTime:9.0},[B.CRACKED_BRICK]:{name:"ひび割れ石レンガ",all:T.CRACKED_BRICK,breakTime:9.0},[B.PATH]:{name:"小道",top:T.PATH_TOP,side:T.PATH_SIDE,bottom:T.DIRT,breakTime:0.7},[B.TORCH]:{name:"たいまつ",all:T.TORCH,transparent:true,emissive:true,breakTime:0.1,torch:true},[B.COBWEB]:{name:"クモの巣",all:T.COBWEB,transparent:true,breakTime:1.2,cross:true},[B.RAIL]:{name:"レール",all:T.RAIL,transparent:true,breakTime:0.5,flat:true},[B.CHEST]:{name:"チェスト",top:T.CHEST_TOP,side:T.CHEST_SIDE,bottom:T.CHEST_TOP,front:T.CHEST_FRONT,breakTime:4.0},[B.WOOL_RED]:{name:"赤い羊毛",all:T.WOOL_RED,breakTime:1.0},[B.WOOL_WHITE]:{name:"白い羊毛",all:T.WOOL_WHITE,breakTime:1.0},[B.BOOKSHELF]:{name:"本棚",top:T.PLANKS,side:T.BOOKSHELF,bottom:T.PLANKS,breakTime:4.0},[B.LANTERN]:{name:"ランタン",all:T.LANTERN,transparent:true,emissive:true,breakTime:0.8,lanternBox:true},[B.HAY]:{name:"干し草",top:T.HAY_TOP,side:T.HAY_SIDE,bottom:T.HAY_TOP,breakTime:1.2},[B.DRIPSTONE]:{name:"鍾乳石",all:T.DRIPSTONE,breakTime:8.0},[B.CALCITE]:{name:"方解石",all:T.CALCITE,breakTime:5.0},[B.AMETHYST_BLOCK]:{name:"アメジストブロック",all:T.AMETHYST_BLOCK,breakTime:6.0},[B.AMETHYST_CLUSTER]:{name:"アメジストの塊",all:T.AMETHYST_CLUSTER,transparent:true,emissive:true,cross:true,breakTime:2.0},[B.MOSS]:{name:"苔ブロック",all:T.MOSS,breakTime:0.6},[B.GLOW_LICHEN]:{name:"ヒカリゴケ",all:T.GLOW_LICHEN,transparent:true,emissive:true,cross:true,breakTime:0.4},[B.SMOOTH_BASALT]:{name:"滑らかな玄武岩",all:T.SMOOTH_BASALT,breakTime:7.0},
[B.DEAD_BUSH]:{name:"枯れ木",all:T.DEAD_BUSH,transparent:true,crossPlant:true,breakTime:0.2},
[B.FARMLAND]:{name:"耕地",top:T.FARMLAND_DRY,side:T.DIRT,bottom:T.DIRT,breakTime:0.65,farmland:true},
[B.FARMLAND_WET]:{name:"湿った耕地",top:T.FARMLAND_WET,side:T.DIRT,bottom:T.DIRT,breakTime:0.65,farmland:true,wet:true},
[B.WHEAT]:{name:"小麦",all:T.WHEAT0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.WHEAT0,T.WHEAT1,T.WHEAT2,T.WHEAT3],maxStage:3,seed:200,harvest:{id:201,min:1,max:2},seedDrop:{id:200,min:0,max:2}},
[B.CARROT]:{name:"ニンジン",all:T.CARROT0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.CARROT0,T.CARROT0,T.CARROT1,T.CARROT2],maxStage:3,seed:202,harvest:{id:202,min:1,max:3},seedDrop:{id:202,min:0,max:0}},
[B.POTATO]:{name:"ジャガイモ",all:T.POTATO0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.POTATO0,T.POTATO0,T.POTATO1,T.POTATO2],maxStage:3,seed:203,harvest:{id:203,min:1,max:3},seedDrop:{id:203,min:0,max:0}},
[B.PUMPKIN]:{name:"カボチャ",top:T.PUMPKIN_TOP,side:T.PUMPKIN_SIDE,front:T.PUMPKIN_FACE,bottom:T.PUMPKIN_TOP,breakTime:1.0},
[B.MELON]:{name:"スイカ",top:T.MELON_TOP,side:T.MELON_SIDE,bottom:T.MELON_TOP,breakTime:1.0,harvestItem:{id:205,min:3,max:7}},
};const ITEM_APPLE=100;const ITEM_SEEDS=200,ITEM_WHEAT=201,ITEM_CARROT=202,ITEM_POTATO=203,ITEM_BREAD=204,ITEM_MELON_SLICE=205,ITEM_PUMPKIN_PIE=206,ITEM_BAKED_POTATO=207,ITEM_HOE=210;const ITEMS={[ITEM_APPLE]:{name:'リンゴ',emoji:'🍎',food:4},[ITEM_SEEDS]:{name:'種',emoji:'🌱',plant:B.WHEAT},[ITEM_WHEAT]:{name:'小麦',emoji:'🌾'},[ITEM_CARROT]:{name:'ニンジン',emoji:'🥕',food:3,plant:B.CARROT},[ITEM_POTATO]:{name:'ジャガイモ',emoji:'🥔',food:1,plant:B.POTATO},[ITEM_BREAD]:{name:'パン',emoji:'🍞',food:5},[ITEM_MELON_SLICE]:{name:'スイカの薄切り',emoji:'🍉',food:2},[ITEM_PUMPKIN_PIE]:{name:'カボチャパイ',emoji:'🥧',food:8},[ITEM_BAKED_POTATO]:{name:'ベイクドポテト',emoji:'🍠',food:5},[ITEM_HOE]:{name:'クワ',emoji:'🪓',tool:'hoe'}};
// ===== ツール（道具）システム =====
// 素材ティア: 木→石→鉄→金→ダイヤ。speed=採掘速度倍率, durability=最大耐久度, tier=採掘可能ランク。
const TOOL_MATERIALS={
  wood:   {name:'木',     speed:2,    durability:60,   tier:1, color:'#9c6b3c'},
  stone:  {name:'石',     speed:4,    durability:132,  tier:2, color:'#8a8a8a'},
  iron:   {name:'鉄',     speed:6,    durability:251,  tier:3, color:'#d8d8d8'},
  gold:   {name:'金',     speed:12,   durability:33,   tier:1, color:'#f7d24a'},
  diamond:{name:'ダイヤ', speed:8,    durability:1562, tier:4, color:'#4fe6df'},
};
// ツール種別ごとの絵文字（アイコンに素材色を重ねて表現）。
const TOOL_KINDS={pickaxe:{name:'ツルハシ',emoji:'⛏'},axe:{name:'斧',emoji:'🪓'},shovel:{name:'シャベル',emoji:'🥄'}};
// ツールのアイテムID（211〜225）。材料素材ごとに3種(ツルハシ/斧/シャベル)。
const ITEM_STICK=208;ITEMS[ITEM_STICK]={name:'棒',emoji:'🥢'};
const ITEM_PICK_WOOD=211,ITEM_PICK_STONE=212,ITEM_PICK_IRON=213,ITEM_PICK_GOLD=214,ITEM_PICK_DIAMOND=215;
const ITEM_AXE_WOOD=216,ITEM_AXE_STONE=217,ITEM_AXE_IRON=218,ITEM_AXE_GOLD=219,ITEM_AXE_DIAMOND=220;
const ITEM_SHOVEL_WOOD=221,ITEM_SHOVEL_STONE=222,ITEM_SHOVEL_IRON=223,ITEM_SHOVEL_GOLD=224,ITEM_SHOVEL_DIAMOND=225;
// ツール定義を一括生成して ITEMS に登録する。
(function registerTools(){
  const kinds=[['pickaxe',[ITEM_PICK_WOOD,ITEM_PICK_STONE,ITEM_PICK_IRON,ITEM_PICK_GOLD,ITEM_PICK_DIAMOND]],
               ['axe',[ITEM_AXE_WOOD,ITEM_AXE_STONE,ITEM_AXE_IRON,ITEM_AXE_GOLD,ITEM_AXE_DIAMOND]],
               ['shovel',[ITEM_SHOVEL_WOOD,ITEM_SHOVEL_STONE,ITEM_SHOVEL_IRON,ITEM_SHOVEL_GOLD,ITEM_SHOVEL_DIAMOND]]];
  const mats=['wood','stone','iron','gold','diamond'];
  for(const[kind,ids]of kinds){for(let i=0;i<mats.length;i++){const mat=mats[i];const m=TOOL_MATERIALS[mat];
    ITEMS[ids[i]]={name:m.name+TOOL_KINDS[kind].name,emoji:TOOL_KINDS[kind].emoji,tool:kind,material:mat,
      toolClass:kind,maxDur:m.durability,toolColor:m.color};}}
})();
// ブロックがどのツール種別で効率良く掘れるか（toolClass）。bestTier は適正素材未満だと低速。
// ブロック定義に toolClass を後付けで設定する（採掘ロジックがここを参照する）。
(function tagBlockTools(){
  const pick=[B.STONE,B.COBBLE,B.BRICK,B.STONE_BRICK,B.MOSSY_BRICK,B.CRACKED_BRICK,B.COAL_ORE,B.IRON_ORE,
    B.GOLD_ORE,B.DIAMOND_ORE,B.OBSIDIAN,B.SANDSTONE,B.ICE,B.FURNACE,B.DRIPSTONE,B.CALCITE,B.AMETHYST_BLOCK,
    B.SMOOTH_BASALT,B.MOSS];
  const axe=[B.LOG,B.PLANKS,B.BIRCH_LOG,B.CRAFTING,B.BOOKSHELF,B.CHEST,B.DEAD_LOG];
  const shovel=[B.GRASS,B.DIRT,B.SAND,B.GRAVEL,B.SNOW,B.PATH,B.FARMLAND,B.FARMLAND_WET];
  // 採掘に最低限必要なティア（これ未満のツール/素手だと採掘してもアイテムをドロップしない）。
  const minTier={[B.IRON_ORE]:2,[B.GOLD_ORE]:3,[B.DIAMOND_ORE]:3,[B.OBSIDIAN]:4,[B.STONE]:1,[B.COBBLE]:1,
    [B.COAL_ORE]:1,[B.AMETHYST_BLOCK]:1,[B.AMETHYST_CLUSTER]:1};
  for(const id of pick)if(BLOCKS[id])BLOCKS[id].toolClass='pickaxe';
  for(const id of axe)if(BLOCKS[id])BLOCKS[id].toolClass='axe';
  for(const id of shovel)if(BLOCKS[id])BLOCKS[id].toolClass='shovel';
  for(const id in minTier)if(BLOCKS[id])BLOCKS[id].minTier=minTier[id];
})();
// 指定アイテムがツールかどうか / その定義を取得。
function isTool(id){return !!(ITEMS[id]&&ITEMS[id].material&&ITEMS[id].toolClass);}
function toolDef(id){return isTool(id)?ITEMS[id]:null;}
const STACK_MAX=64;
// ツールはスタック不可（1スロット1本、耐久度を個別に持つ）。
function maxStackOf(id){return isTool(id)?1:STACK_MAX;}function dropFor(id){if(id===B.GRASS)return Math.random()<0.18?ITEM_SEEDS:B.DIRT;if(id===B.STONE)return B.COBBLE;if(id===B.GLASS)return null;if(id===B.ICE)return null;if(id===B.LAVA)return null;if(id===B.LEAVES||id===B.BIRCH_LEAVES)return Math.random()<0.2?ITEM_APPLE:null;if(id===B.COBWEB)return null;if(id===B.PATH)return B.DIRT;if(id===B.GLOW_LICHEN)return null;if(id===B.FARMLAND||id===B.FARMLAND_WET)return B.DIRT;if(id===B.MELON)return null;if(id===B.DEAD_BUSH)return null;return id;}
// レシピカテゴリ定義（タブで絞り込み表示）
const RECIPE_CATEGORIES=[
  {id:'all',name:'すべて',emoji:'📖'},
  {id:'building',name:'建材',emoji:'🧱'},
  {id:'tools',name:'道具',emoji:'⛏'},
  {id:'food',name:'食料',emoji:'🍞'},
  {id:'deco',name:'装飾',emoji:'✨'},
];
const RECIPES=[
{cat:'building',pattern:[[B.LOG]],out:{id:B.PLANKS,count:4}},
{cat:'building',pattern:[[B.BIRCH_LOG]],out:{id:B.PLANKS,count:4}},
{cat:'building',pattern:[[B.SAND,B.SAND],[B.SAND,B.SAND]],out:{id:B.GLASS,count:4}},
{cat:'building',pattern:[[B.COBBLE,B.COBBLE],[B.COBBLE,B.COBBLE]],out:{id:B.BRICK,count:4}},
{cat:'building',pattern:[[B.DIRT,B.DIRT],[B.DIRT,B.DIRT]],out:{id:B.GRASS,count:1}},
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS],[B.PLANKS,B.PLANKS]],out:{id:B.CRAFTING,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE],[B.COBBLE,null]],out:{id:B.FURNACE,count:1}},
{cat:'building',pattern:[[B.SAND],[B.SAND]],out:{id:B.SANDSTONE,count:1}},
{cat:'building',pattern:[[B.SNOW,B.SNOW],[B.SNOW,B.SNOW]],out:{id:B.ICE,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,null,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.FURNACE,count:2}},
{cat:'building',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.OBSIDIAN,count:1}},
{cat:'building',pattern:[[B.SAND,B.SAND,B.SAND]],out:{id:B.SANDSTONE,count:3}},
{cat:'deco',pattern:[[B.AMETHYST_CLUSTER,B.AMETHYST_CLUSTER],[B.AMETHYST_CLUSTER,B.AMETHYST_CLUSTER]],out:{id:B.AMETHYST_BLOCK,count:1}},
{cat:'building',pattern:[[B.MOSS,B.MOSS],[B.MOSS,B.MOSS]],out:{id:B.GRASS,count:4}},
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS],[null,B.PLANKS]],out:{id:ITEM_HOE,count:1}},
// 棒: 木材を縦に2つ並べる → 棒×4。
{cat:'tools',pattern:[[B.PLANKS],[B.PLANKS]],out:{id:ITEM_STICK,count:4}},
// ===== ツルハシ（上段に素材3つ、中央に棒、下段中央に棒）=====
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS,B.PLANKS],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE,B.GOLD_ORE,B.GOLD_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE,B.DIAMOND_ORE,B.DIAMOND_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_DIAMOND,count:1}},
// ===== 斧（L字に素材2＋上1、棒2）=====
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS],[B.PLANKS,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE],[B.COBBLE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE,B.IRON_ORE],[B.IRON_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE,B.GOLD_ORE],[B.GOLD_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE,B.DIAMOND_ORE],[B.DIAMOND_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_DIAMOND,count:1}},
// ===== シャベル（素材1＋棒2の縦並び）=====
{cat:'tools',pattern:[[B.PLANKS],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_DIAMOND,count:1}},
{cat:'food',pattern:[[ITEM_WHEAT,ITEM_WHEAT,ITEM_WHEAT]],out:{id:ITEM_BREAD,count:1}},
{cat:'food',pattern:[[B.PUMPKIN]],out:{id:ITEM_SEEDS,count:4}},
{cat:'food',pattern:[[B.PUMPKIN,ITEM_WHEAT],[ITEM_WHEAT,B.PUMPKIN]],out:{id:ITEM_PUMPKIN_PIE,count:1}},
{cat:'food',pattern:[[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE],[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE],[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE]],out:{id:B.MELON,count:1}},
];
// ===== アチーブメント（実績）定義 =====
// stat: ACH.stats のどの累計値を見るか / goal: 達成に必要な値 / icon: 表示絵文字
const ACHIEVEMENTS=[
  {id:'first_block',icon:'\u26cf',name:'\u6700\u521d\u306e\u4e00\u6483',desc:'\u30d6\u30ed\u30c3\u30af\u3092 1 \u3064\u7834\u58ca\u3059\u308b',stat:'mined',goal:1},
  {id:'miner_50',icon:'\ud83e\udea8',name:'\u63a1\u6398\u898b\u7fd2\u3044',desc:'\u30d6\u30ed\u30c3\u30af\u3092 50 \u500b\u7834\u58ca\u3059\u308b',stat:'mined',goal:50},
  {id:'miner_500',icon:'\u26f0',name:'\u3064\u308b\u306f\u3057\u30de\u30b9\u30bf\u30fc',desc:'\u30d6\u30ed\u30c3\u30af\u3092 500 \u500b\u7834\u58ca\u3059\u308b',stat:'mined',goal:500},
  {id:'builder_1',icon:'\ud83e\uddf1',name:'\u8857\u3065\u304f\u308a\u306e\u7b2c\u4e00\u6b69',desc:'\u30d6\u30ed\u30c3\u30af\u3092 1 \u3064\u8a2d\u7f6e\u3059\u308b',stat:'placed',goal:1},
  {id:'builder_100',icon:'\ud83c\udfdb',name:'\u5efa\u7bc9\u5bb6',desc:'\u30d6\u30ed\u30c3\u30af\u3092 100 \u500b\u8a2d\u7f6e\u3059\u308b',stat:'placed',goal:100},
  {id:'first_craft',icon:'\ud83d\udee0',name:'\u30af\u30e9\u30d5\u30bf\u30fc\u5165\u9580',desc:'\u521d\u3081\u3066\u30a2\u30a4\u30c6\u30e0\u3092\u30af\u30e9\u30d5\u30c8\u3059\u308b',stat:'crafted',goal:1},
  {id:'craft_25',icon:'\ud83c\udfed',name:'\u719f\u7df4\u306e\u8077\u4eba',desc:'\u30a2\u30a4\u30c6\u30e0\u3092 25 \u56de\u30af\u30e9\u30d5\u30c8\u3059\u308b',stat:'crafted',goal:25},
  {id:'workbench',icon:'\ud83e\udea7',name:'\u4f5c\u696d\u53f0\u30c7\u30d3\u30e5\u30fc',desc:'\u4f5c\u696d\u53f0\u3092\u8a2d\u7f6e\u3057\u3066\u958b\u304f',stat:'workbench',goal:1},
  {id:'tree_chop',icon:'\ud83e\udeb5',name:'\u6728\u3053\u308a',desc:'\u539f\u6728\u3092 10 \u500b\u96c6\u3081\u308b',stat:'wood',goal:10},
  {id:'farmer',icon:'\ud83c\udf3e',name:'\u99c6\u3051\u51fa\u3057\u8fb2\u5bb6',desc:'\u4f5c\u7269\u3092 1 \u3064\u53ce\u7a6b\u3059\u308b',stat:'harvest',goal:1},
  {id:'farmer_30',icon:'\ud83d\ude9c',name:'\u8c4a\u4f5c',desc:'\u4f5c\u7269\u3092 30 \u500b\u53ce\u7a6b\u3059\u308b',stat:'harvest',goal:30},
  {id:'gourmet',icon:'\ud83c\udf7d',name:'\u3050\u308b\u3081',desc:'\u98df\u3079\u7269\u3092 10 \u56de\u98df\u3079\u308b',stat:'eaten',goal:10},
  {id:'diamond',icon:'\ud83d\udc8e',name:'\u30c0\u30a4\u30e4\u30e2\u30f3\u30c9\uff01',desc:'\u30c0\u30a4\u30e4\u30e2\u30f3\u30c9\u9271\u77f3\u3092\u63a1\u6398\u3059\u308b',stat:'diamond',goal:1},
  {id:'obsidian',icon:'\ud83d\udfea',name:'\u9ed2\u66dc\u77f3\u306e\u8efd\u91cf\u5316',desc:'\u9ed2\u66dc\u77f3\u3092\u624b\u306b\u5165\u308c\u308b',stat:'obsidian',goal:1},
  {id:'swimmer',icon:'\ud83c\udfca',name:'\u6cf3\u304e\u624b',desc:'\u6c34\u306e\u4e2d\u306b\u6f5c\u308b',stat:'swim',goal:1},
  {id:'flyer',icon:'\ud83d\udd4a',name:'\u30af\u30ea\u30a8\u30a4\u30bf\u30fc',desc:'\u98db\u884c\u30e2\u30fc\u30c9\u3092\u4f7f\u3046',stat:'fly',goal:1},
  {id:'night',icon:'\ud83c\udf19',name:'\u591c\u3092\u8d8a\u3048\u3066',desc:'\u521d\u3081\u3066\u306e\u591c\u3092\u8fce\u3048\u308b',stat:'night',goal:1},
];
const isMobile=('ontouchstart'in window)&&/Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac|iPad/i.test(navigator.userAgent));if(isMobile)document.body.classList.add('is-mobile');
// World schema version. Bump whenever world dimensions change so that saved
// edits/seed from an incompatible layout are discarded instead of corrupting
// the new (smaller) world or pointing at out-of-range coordinates.
const WORLD_VERSION="9-768x96-realistic-terrain";
if(localStorage.getItem('bw_world_version')!==WORLD_VERSION){
  localStorage.removeItem('bw_edits');
  localStorage.removeItem('bw_seed');
  localStorage.removeItem('bw_crops');
  localStorage.setItem('bw_world_version',WORLD_VERSION);
}
let SEED=parseInt(localStorage.getItem('bw_seed')||"0",10);if(!SEED){SEED=(Math.random()*2147483646+1)|0;localStorage.setItem('bw_seed',String(SEED));}
