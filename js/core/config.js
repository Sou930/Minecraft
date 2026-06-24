"use strict";const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,CHUNK=16,SEA_LEVEL=40,ATLAS_TILES=8,ATLAS_ROWS=27,TILE_PX=32,ATLAS_W=ATLAS_TILES*TILE_PX,ATLAS_H=ATLAS_ROWS*TILE_PX,ATLAS_PX=ATLAS_W;const T={GRASS_TOP:0,GRASS_SIDE:1,DIRT:2,STONE:3,SAND:4,LOG_SIDE:5,LOG_TOP:6,LEAVES:7,PLANKS:8,GLASS:9,BRICK:10,BEDROCK:11,WATER:12,COBBLE:13,COAL_ORE:14,IRON_ORE:15,GOLD_ORE:16,DIAMOND_ORE:17,GRAVEL:18,SANDSTONE_TOP:19,SANDSTONE_SIDE:20,SNOW:21,ICE:22,OBSIDIAN:23,CACTUS_SIDE:24,CACTUS_TOP:25,CRAFT_TOP:26,CRAFT_SIDE:27,FURNACE_TOP:28,FURNACE_FRONT:29,BIRCH_SIDE:30,BIRCH_TOP:31,BIRCH_LEAVES:32,LAVA:33,CORAL_PINK:34,CORAL_PURPLE:35,CORAL_BLUE:36,SEAWEED:37,DEAD_LOG_SIDE:38,DEAD_LOG_TOP:39,STONE_BRICK:40,MOSSY_BRICK:41,CRACKED_BRICK:42,PATH_TOP:43,PATH_SIDE:44,TORCH:45,COBWEB:46,RAIL:47,CHEST_TOP:48,CHEST_SIDE:49,CHEST_FRONT:50,WOOL_RED:51,WOOL_WHITE:52,BOOKSHELF:53,LANTERN:54,HAY_SIDE:55,HAY_TOP:56,DRIPSTONE:57,CALCITE:58,AMETHYST_BLOCK:59,AMETHYST_CLUSTER:60,MOSS:61,GLOW_LICHEN:62,SMOOTH_BASALT:63,FARMLAND_DRY:64,FARMLAND_WET:65,WHEAT0:66,WHEAT1:67,WHEAT2:68,WHEAT3:69,CARROT0:70,CARROT1:71,CARROT2:72,POTATO0:73,POTATO1:74,POTATO2:75,PUMPKIN_TOP:76,PUMPKIN_SIDE:77,PUMPKIN_FACE:78,MELON_TOP:79,MELON_SIDE:80,PUMPKIN_STEM:81,DEAD_BUSH:82,TALL_GRASS:83,FLOWER_DANDELION:84,FLOWER_POPPY:85,FLOWER_CORNFLOWER:86,SPRUCE_SIDE:87,SPRUCE_TOP:88,SPRUCE_LEAVES:89,ACACIA_SIDE:90,ACACIA_TOP:91,ACACIA_LEAVES:92,CHERRY_SIDE:93,CHERRY_TOP:94,CHERRY_LEAVES:95,DRY_GRASS_TOP:96,DRY_GRASS_SIDE:97,BAMBOO:98,MANGROVE_SIDE:99,MANGROVE_TOP:100,MANGROVE_LEAVES:101,MANGROVE_ROOTS:102,PALM_SIDE:103,PALM_TOP:104,PALM_LEAVES:105,MAPLE_SIDE:106,MAPLE_TOP:107,MAPLE_LEAVES_RED:108,MAPLE_LEAVES_ORANGE:109,MAPLE_LEAVES_YELLOW:110,FLOWER_ALLIUM:111,FLOWER_TULIP:112,FLOWER_OXEYE:113,DOOR_WOOD:114,DOOR_TOP:115,DOOR_BOTTOM:116,BED_TOP:117,BED_SIDE:118,BED_END:119,
COPPER:120,COPPER_EXPOSED:121,COPPER_WEATHERED:122,COPPER_OXIDIZED:123,
// New decorative / structural tiles
TNT_SIDE:124,
WOOL_ORANGE:125,WOOL_MAGENTA:126,WOOL_LIGHT_BLUE:127,WOOL_YELLOW:128,WOOL_LIME:129,WOOL_PINK:130,WOOL_GRAY:131,WOOL_LIGHT_GRAY:132,WOOL_CYAN:133,WOOL_PURPLE:134,WOOL_BLUE:135,WOOL_BROWN:136,WOOL_GREEN:137,WOOL_BLACK:138,
TERRACOTTA:139,TERRACOTTA_RED:140,TERRACOTTA_ORANGE:141,TERRACOTTA_YELLOW:142,TERRACOTTA_LIME:143,TERRACOTTA_GREEN:144,TERRACOTTA_CYAN:145,TERRACOTTA_LIGHT_BLUE:146,TERRACOTTA_BLUE:147,TERRACOTTA_PURPLE:148,TERRACOTTA_MAGENTA:149,TERRACOTTA_PINK:150,TERRACOTTA_BROWN:151,TERRACOTTA_GRAY:152,TERRACOTTA_LIGHT_GRAY:153,TERRACOTTA_BLACK:154,TERRACOTTA_WHITE:155,
CONCRETE_RED:156,CONCRETE_ORANGE:157,CONCRETE_YELLOW:158,CONCRETE_LIME:159,CONCRETE_GREEN:160,CONCRETE_CYAN:161,CONCRETE_LIGHT_BLUE:162,CONCRETE_BLUE:163,CONCRETE_PURPLE:164,CONCRETE_MAGENTA:165,CONCRETE_PINK:166,CONCRETE_BROWN:167,CONCRETE_GRAY:168,CONCRETE_LIGHT_GRAY:169,CONCRETE_BLACK:170,CONCRETE_WHITE:171,
GLAZED_WHITE:172,GLAZED_ORANGE:173,GLAZED_MAGENTA:174,GLAZED_CYAN:175,GLAZED_BLUE:176,GLAZED_LIME:177,
BANNER_WHITE:178,BANNER_RED:179,BANNER_BLUE:180,BANNER_GREEN:181,BANNER_YELLOW:182,BANNER_BLACK:183,
NETHER_BRICK:184,NETHERRACK:185,CRYING_OBSIDIAN:186,
CHISELED_STONE_BRICK:187,MOSSY_COBBLE:188,
// Redstone component tiles
REDSTONE_DUST_OFF:189,REDSTONE_DUST_ON:190,
REDSTONE_TORCH_OFF:191,REDSTONE_TORCH_ON:192,
LEVER_SIDE:193,LEVER_ON:194,
REPEATER_OFF:195,REPEATER_ON:196,
PISTON_SIDE:197,PISTON_TOP:198,PISTON_FACE:199,PISTON_STICKY_FACE:200,
PISTON_EXTENSION:201,
DISPENSER_FRONT:202,DISPENSER_SIDE:203,
DROPPER_FRONT:204,
HOPPER_SIDE:205,HOPPER_INSIDE:206,
OBSERVER_FACE:207,OBSERVER_BACK:208,OBSERVER_SIDE:209};const B={AIR:0,GRASS:1,DIRT:2,STONE:3,SAND:4,LOG:5,LEAVES:6,PLANKS:7,GLASS:8,BRICK:9,BEDROCK:10,WATER:11,COBBLE:12,COAL_ORE:13,IRON_ORE:14,GOLD_ORE:15,DIAMOND_ORE:16,GRAVEL:17,SANDSTONE:18,SNOW:19,ICE:20,OBSIDIAN:21,CACTUS:22,CRAFTING:23,FURNACE:24,BIRCH_LOG:25,BIRCH_LEAVES:26,LAVA:27,CORAL_PINK:28,CORAL_PURPLE:29,CORAL_BLUE:30,SEAWEED:31,DEAD_LOG:32,STONE_BRICK:33,MOSSY_BRICK:34,CRACKED_BRICK:35,PATH:36,TORCH:37,COBWEB:38,RAIL:39,CHEST:40,WOOL_RED:41,WOOL_WHITE:42,BOOKSHELF:43,LANTERN:44,HAY:45,DRIPSTONE:46,CALCITE:47,AMETHYST_BLOCK:48,AMETHYST_CLUSTER:49,MOSS:50,GLOW_LICHEN:51,SMOOTH_BASALT:52,FARMLAND:53,FARMLAND_WET:54,WHEAT:55,CARROT:56,POTATO:57,PUMPKIN:58,MELON:59,DEAD_BUSH:60,TALL_GRASS:61,FLOWER_DANDELION:62,FLOWER_POPPY:63,FLOWER_CORNFLOWER:64,SPRUCE_LOG:65,SPRUCE_LEAVES:66,ACACIA_LOG:67,ACACIA_LEAVES:68,CHERRY_LOG:69,CHERRY_LEAVES:70,DRY_GRASS:71,CHERRY_PETALS:72,BAMBOO:73,MANGROVE_LOG:74,MANGROVE_LEAVES:75,MANGROVE_ROOTS:76,PALM_LOG:77,PALM_LEAVES:78,MAPLE_LOG:79,MAPLE_LEAVES_RED:80,MAPLE_LEAVES_ORANGE:81,MAPLE_LEAVES_YELLOW:82,FLOWER_ALLIUM:83,FLOWER_TULIP:84,FLOWER_OXEYE:85,DOOR_BOTTOM_N_CLOSED:86,DOOR_BOTTOM_N_OPEN:87,DOOR_BOTTOM_E_CLOSED:88,DOOR_BOTTOM_E_OPEN:89,DOOR_BOTTOM_S_CLOSED:90,DOOR_BOTTOM_S_OPEN:91,DOOR_BOTTOM_W_CLOSED:92,DOOR_BOTTOM_W_OPEN:93,DOOR_TOP_N_CLOSED:94,DOOR_TOP_N_OPEN:95,DOOR_TOP_E_CLOSED:96,DOOR_TOP_E_OPEN:97,DOOR_TOP_S_CLOSED:98,DOOR_TOP_S_OPEN:99,DOOR_TOP_W_CLOSED:100,DOOR_TOP_W_OPEN:101,BED:102,STAIRS_N:103,STAIRS_E:104,STAIRS_S:105,STAIRS_W:106,
COPPER:107,COPPER_EXPOSED:108,COPPER_WEATHERED:109,COPPER_OXIDIZED:110,
SLAB_WOOD:111,SLAB_STONE:112,SLAB_SANDSTONE:113,SLAB_BRICK:114,
FENCE_OAK:115,FENCE_STONE:116,FENCE_GATE_OAK:117,FENCE_GATE_STONE:118,
WALL_STONE:119,WALL_BRICK:120,WALL_MOSSY:121,
// New blocks
TNT:122,
WOOL_ORANGE:123,WOOL_MAGENTA:124,WOOL_LIGHT_BLUE:125,WOOL_YELLOW:126,WOOL_LIME:127,WOOL_PINK:128,WOOL_GRAY:129,WOOL_LIGHT_GRAY:130,WOOL_CYAN:131,WOOL_PURPLE:132,WOOL_BLUE:133,WOOL_BROWN:134,WOOL_GREEN:135,WOOL_BLACK:136,
TERRACOTTA:137,TERRACOTTA_RED:138,TERRACOTTA_ORANGE:139,TERRACOTTA_YELLOW:140,TERRACOTTA_LIME:141,TERRACOTTA_GREEN:142,TERRACOTTA_CYAN:143,TERRACOTTA_LIGHT_BLUE:144,TERRACOTTA_BLUE:145,TERRACOTTA_PURPLE:146,TERRACOTTA_MAGENTA:147,TERRACOTTA_PINK:148,TERRACOTTA_BROWN:149,TERRACOTTA_GRAY:150,TERRACOTTA_LIGHT_GRAY:151,TERRACOTTA_BLACK:152,TERRACOTTA_WHITE:153,
CONCRETE_RED:154,CONCRETE_ORANGE:155,CONCRETE_YELLOW:156,CONCRETE_LIME:157,CONCRETE_GREEN:158,CONCRETE_CYAN:159,CONCRETE_LIGHT_BLUE:160,CONCRETE_BLUE:161,CONCRETE_PURPLE:162,CONCRETE_MAGENTA:163,CONCRETE_PINK:164,CONCRETE_BROWN:165,CONCRETE_GRAY:166,CONCRETE_LIGHT_GRAY:167,CONCRETE_BLACK:168,CONCRETE_WHITE:169,
GLAZED_TERRACOTTA_WHITE:170,GLAZED_TERRACOTTA_ORANGE:171,GLAZED_TERRACOTTA_MAGENTA:172,GLAZED_TERRACOTTA_CYAN:173,GLAZED_TERRACOTTA_BLUE:174,GLAZED_TERRACOTTA_LIME:175,
BANNER_WHITE:176,BANNER_RED:177,BANNER_BLUE:178,BANNER_GREEN:179,BANNER_YELLOW:180,BANNER_BLACK:181,
PRESSURE_PLATE_WOOD:182,PRESSURE_PLATE_STONE:183,
BUTTON_WOOD:184,BUTTON_STONE:185,
NETHER_BRICK:186,NETHERRACK:187,CRYING_OBSIDIAN:188,
CHISELED_STONE_BRICK:189,MOSSY_COBBLE:190,VINE:191,
SNOW_BLOCK:192,BLUE_ICE:193,
// ---- Redstone components ----
LEVER:194,
REDSTONE_DUST:195,
REDSTONE_TORCH_OFF:196,REDSTONE_TORCH_ON:197,
REPEATER:198,
PISTON:199,PISTON_STICKY:200,
PISTON_HEAD:201,PISTON_HEAD_STICKY:202,
DISPENSER:203,
DROPPER:204,
HOPPER:205,
OBSERVER:206};const BLOCKS={[B.GRASS]:{name:"Grass",top:T.GRASS_TOP,side:T.GRASS_SIDE,bottom:T.DIRT,breakTime:0.9},[B.DIRT]:{name:"Dirt",all:T.DIRT,breakTime:0.75},[B.STONE]:{name:"Stone",all:T.STONE,breakTime:7.5},[B.SAND]:{name:"Sand",all:T.SAND,breakTime:0.75},[B.LOG]:{name:"Oak Log",top:T.LOG_TOP,side:T.LOG_SIDE,bottom:T.LOG_TOP,breakTime:3.0},[B.LEAVES]:{name:"Leaves",all:T.LEAVES,transparent:true,breakTime:0.3},[B.PLANKS]:{name:"Planks",all:T.PLANKS,breakTime:3.0},[B.GLASS]:{name:"Glass",all:T.GLASS,transparent:true,breakTime:0.45},[B.BRICK]:{name:"Brick",all:T.BRICK,breakTime:10.0},[B.BEDROCK]:{name:"Bedrock",all:T.BEDROCK,unbreakable:true},[B.WATER]:{name:"Water",all:T.WATER,transparent:true,fluid:true},[B.COBBLE]:{name:"Cobblestone",all:T.COBBLE,breakTime:10.0},[B.COAL_ORE]:{name:"Coal Ore",all:T.COAL_ORE,breakTime:8.0},[B.IRON_ORE]:{name:"Iron Ore",all:T.IRON_ORE,breakTime:9.0},[B.GOLD_ORE]:{name:"Gold Ore",all:T.GOLD_ORE,breakTime:9.0},[B.DIAMOND_ORE]:{name:"Diamond Ore",all:T.DIAMOND_ORE,breakTime:11.0},[B.GRAVEL]:{name:"Gravel",all:T.GRAVEL,breakTime:0.9},[B.SANDSTONE]:{name:"Sandstone",top:T.SANDSTONE_TOP,side:T.SANDSTONE_SIDE,bottom:T.SANDSTONE_TOP,breakTime:4.0},[B.SNOW]:{name:"Snow Block",all:T.SNOW,breakTime:1.0},[B.ICE]:{name:"Ice",all:T.ICE,breakTime:0.75},[B.OBSIDIAN]:{name:"Obsidian",all:T.OBSIDIAN,breakTime:45.0},[B.CACTUS]:{name:"Cactus",top:T.CACTUS_TOP,side:T.CACTUS_SIDE,bottom:T.CACTUS_TOP,breakTime:0.6},[B.CRAFTING]:{name:"Crafting Table",top:T.CRAFT_TOP,side:T.CRAFT_SIDE,bottom:T.PLANKS,breakTime:3.75},[B.FURNACE]:{name:"Furnace",top:T.FURNACE_TOP,side:T.FURNACE_FRONT,bottom:T.FURNACE_TOP,breakTime:13.0},[B.BIRCH_LOG]:{name:"Birch Log",top:T.BIRCH_TOP,side:T.BIRCH_SIDE,bottom:T.BIRCH_TOP,breakTime:3.0},[B.BIRCH_LEAVES]:{name:"Birch Leaves",all:T.BIRCH_LEAVES,transparent:true,breakTime:0.3},[B.LAVA]:{name:"Lava",all:T.LAVA,fluid:true,emissive:true,damage:true},[B.CORAL_PINK]:{name:"Pink Coral",all:T.CORAL_PINK,transparent:true,cross:true,breakTime:0.4},[B.CORAL_PURPLE]:{name:"Purple Coral",all:T.CORAL_PURPLE,transparent:true,cross:true,breakTime:0.4},[B.CORAL_BLUE]:{name:"Blue Coral",all:T.CORAL_BLUE,transparent:true,cross:true,breakTime:0.4},[B.SEAWEED]:{name:"Seaweed",all:T.SEAWEED,transparent:true,cross:true,breakTime:0.2},[B.DEAD_LOG]:{name:"Dead Log",top:T.DEAD_LOG_TOP,side:T.DEAD_LOG_SIDE,bottom:T.DEAD_LOG_TOP,breakTime:2.4},[B.STONE_BRICK]:{name:"Stone Bricks",all:T.STONE_BRICK,breakTime:9.0},[B.MOSSY_BRICK]:{name:"Mossy Bricks",all:T.MOSSY_BRICK,breakTime:9.0},[B.CRACKED_BRICK]:{name:"Cracked Bricks",all:T.CRACKED_BRICK,breakTime:9.0},[B.PATH]:{name:"Path",top:T.PATH_TOP,side:T.PATH_SIDE,bottom:T.DIRT,breakTime:0.7},[B.TORCH]:{name:"Torch",all:T.TORCH,transparent:true,emissive:true,breakTime:0.1,torch:true},[B.COBWEB]:{name:"Cobweb",all:T.COBWEB,transparent:true,breakTime:1.2,cross:true},[B.RAIL]:{name:"Rail",all:T.RAIL,transparent:true,breakTime:0.5,flat:true},[B.CHEST]:{name:"Chest",top:T.CHEST_TOP,side:T.CHEST_SIDE,bottom:T.CHEST_TOP,front:T.CHEST_FRONT,breakTime:4.0},[B.WOOL_RED]:{name:"Red Wool",all:T.WOOL_RED,breakTime:1.0},[B.WOOL_WHITE]:{name:"White Wool",all:T.WOOL_WHITE,breakTime:1.0},[B.BOOKSHELF]:{name:"Bookshelf",top:T.PLANKS,side:T.BOOKSHELF,bottom:T.PLANKS,breakTime:4.0},[B.LANTERN]:{name:"Lantern",all:T.LANTERN,transparent:true,emissive:true,breakTime:0.8,lanternBox:true},[B.HAY]:{name:"Hay Bale",top:T.HAY_TOP,side:T.HAY_SIDE,bottom:T.HAY_TOP,breakTime:1.2},[B.DRIPSTONE]:{name:"Dripstone",all:T.DRIPSTONE,breakTime:8.0},[B.CALCITE]:{name:"Calcite",all:T.CALCITE,breakTime:5.0},[B.AMETHYST_BLOCK]:{name:"Amethyst Block",all:T.AMETHYST_BLOCK,breakTime:6.0},[B.AMETHYST_CLUSTER]:{name:"Amethyst Cluster",all:T.AMETHYST_CLUSTER,transparent:true,emissive:true,cross:true,breakTime:2.0},[B.MOSS]:{name:"Moss Block",all:T.MOSS,breakTime:0.6},[B.GLOW_LICHEN]:{name:"Glow Lichen",all:T.GLOW_LICHEN,transparent:true,emissive:true,cross:true,breakTime:0.4},[B.SMOOTH_BASALT]:{name:"Smooth Basalt",all:T.SMOOTH_BASALT,breakTime:7.0},
[B.DEAD_BUSH]:{name:"Dead Bush",all:T.DEAD_BUSH,transparent:true,crossPlant:true,breakTime:0.2},
[B.TALL_GRASS]:{name:"Grass",all:T.TALL_GRASS,transparent:true,crossPlant:true,breakTime:0.2},
[B.FLOWER_DANDELION]:{name:"Dandelion",all:T.FLOWER_DANDELION,transparent:true,crossPlant:true,breakTime:0.2},
[B.FLOWER_POPPY]:{name:"Poppy",all:T.FLOWER_POPPY,transparent:true,crossPlant:true,breakTime:0.2},
[B.FLOWER_CORNFLOWER]:{name:"Cornflower",all:T.FLOWER_CORNFLOWER,transparent:true,crossPlant:true,breakTime:0.2},
[B.FARMLAND]:{name:"Farmland",top:T.FARMLAND_DRY,side:T.DIRT,bottom:T.DIRT,breakTime:0.65,farmland:true},
[B.FARMLAND_WET]:{name:"Wet Farmland",top:T.FARMLAND_WET,side:T.DIRT,bottom:T.DIRT,breakTime:0.65,farmland:true,wet:true},
[B.WHEAT]:{name:"Wheat",all:T.WHEAT0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.WHEAT0,T.WHEAT1,T.WHEAT2,T.WHEAT3],maxStage:3,seed:200,harvest:{id:201,min:1,max:2},seedDrop:{id:200,min:0,max:2}},
[B.CARROT]:{name:"Carrot",all:T.CARROT0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.CARROT0,T.CARROT0,T.CARROT1,T.CARROT2],maxStage:3,seed:202,harvest:{id:202,min:1,max:3},seedDrop:{id:202,min:0,max:0}},
[B.POTATO]:{name:"Potato",all:T.POTATO0,transparent:true,cross:true,crop:true,breakTime:0.2,stages:[T.POTATO0,T.POTATO0,T.POTATO1,T.POTATO2],maxStage:3,seed:203,harvest:{id:203,min:1,max:3},seedDrop:{id:203,min:0,max:0}},
[B.PUMPKIN]:{name:"Pumpkin",top:T.PUMPKIN_TOP,side:T.PUMPKIN_SIDE,front:T.PUMPKIN_FACE,bottom:T.PUMPKIN_TOP,breakTime:1.0},
[B.MELON]:{name:"Melon",top:T.MELON_TOP,side:T.MELON_SIDE,bottom:T.MELON_TOP,breakTime:1.0,harvestItem:{id:205,min:3,max:7}},
[B.SPRUCE_LOG]:{name:"Spruce Log",top:T.SPRUCE_TOP,side:T.SPRUCE_SIDE,bottom:T.SPRUCE_TOP,breakTime:3.0},
[B.SPRUCE_LEAVES]:{name:"Spruce Leaves",all:T.SPRUCE_LEAVES,transparent:true,breakTime:0.3},
[B.ACACIA_LOG]:{name:"Acacia Log",top:T.ACACIA_TOP,side:T.ACACIA_SIDE,bottom:T.ACACIA_TOP,breakTime:3.0},
[B.ACACIA_LEAVES]:{name:"Acacia Leaves",all:T.ACACIA_LEAVES,transparent:true,breakTime:0.3},
[B.CHERRY_LOG]:{name:"Cherry Log",top:T.CHERRY_TOP,side:T.CHERRY_SIDE,bottom:T.CHERRY_TOP,breakTime:3.0},
[B.CHERRY_LEAVES]:{name:"Cherry Leaves",all:T.CHERRY_LEAVES,transparent:true,breakTime:0.3},
[B.DRY_GRASS]:{name:"Savanna Grass",top:T.DRY_GRASS_TOP,side:T.DRY_GRASS_SIDE,bottom:T.DIRT,breakTime:0.9},
[B.CHERRY_PETALS]:{name:"Cherry Petals",all:T.CHERRY_LEAVES,transparent:true,crossPlant:true,breakTime:0.2},
[B.BAMBOO]:{name:"Bamboo",all:T.BAMBOO,transparent:true,bamboo:true,breakTime:0.5},
[B.MANGROVE_LOG]:{name:"Mangrove Log",top:T.MANGROVE_TOP,side:T.MANGROVE_SIDE,bottom:T.MANGROVE_TOP,breakTime:3.0},
[B.MANGROVE_LEAVES]:{name:"Mangrove Leaves",all:T.MANGROVE_LEAVES,transparent:true,breakTime:0.3},
[B.MANGROVE_ROOTS]:{name:"Mangrove Roots",all:T.MANGROVE_ROOTS,breakTime:0.7},
[B.PALM_LOG]:{name:"Palm Log",top:T.PALM_TOP,side:T.PALM_SIDE,bottom:T.PALM_TOP,breakTime:2.6},
[B.PALM_LEAVES]:{name:"Palm Leaves",all:T.PALM_LEAVES,transparent:true,breakTime:0.3},
[B.MAPLE_LOG]:{name:"Maple Log",top:T.MAPLE_TOP,side:T.MAPLE_SIDE,bottom:T.MAPLE_TOP,breakTime:3.0},
[B.MAPLE_LEAVES_RED]:{name:"Red Maple Leaves",all:T.MAPLE_LEAVES_RED,transparent:true,breakTime:0.3},
[B.MAPLE_LEAVES_ORANGE]:{name:"Orange Maple Leaves",all:T.MAPLE_LEAVES_ORANGE,transparent:true,breakTime:0.3},
[B.MAPLE_LEAVES_YELLOW]:{name:"Yellow Maple Leaves",all:T.MAPLE_LEAVES_YELLOW,transparent:true,breakTime:0.3},
[B.FLOWER_ALLIUM]:{name:"Allium",all:T.FLOWER_ALLIUM,transparent:true,crossPlant:true,breakTime:0.2},
[B.FLOWER_TULIP]:{name:"Tulip",all:T.FLOWER_TULIP,transparent:true,crossPlant:true,breakTime:0.2},
[B.FLOWER_OXEYE]:{name:"Oxeye Daisy",all:T.FLOWER_OXEYE,transparent:true,crossPlant:true,breakTime:0.2},
};
// ---- Copper blocks (4 oxidation stages) ----
// Copper oxidizes over time. An axe can strip/polish it back one stage.
BLOCKS[B.COPPER]={name:'Copper Block',all:T.COPPER,breakTime:12.0,toolClass:'pickaxe',copper:true,oxidation:0};
BLOCKS[B.COPPER_EXPOSED]={name:'Exposed Copper',all:T.COPPER_EXPOSED,breakTime:12.0,toolClass:'pickaxe',copper:true,oxidation:1};
BLOCKS[B.COPPER_WEATHERED]={name:'Weathered Copper',all:T.COPPER_WEATHERED,breakTime:12.0,toolClass:'pickaxe',copper:true,oxidation:2};
BLOCKS[B.COPPER_OXIDIZED]={name:'Oxidized Copper',all:T.COPPER_OXIDIZED,breakTime:12.0,toolClass:'pickaxe',copper:true,oxidation:3};
// ---- Slabs (half-height blocks) ----
BLOCKS[B.SLAB_WOOD]={name:'Oak Slab',all:T.PLANKS,transparent:true,slab:true,breakTime:3.0,toolClass:'axe'};
BLOCKS[B.SLAB_STONE]={name:'Stone Slab',all:T.STONE,transparent:true,slab:true,breakTime:7.5,toolClass:'pickaxe'};
BLOCKS[B.SLAB_SANDSTONE]={name:'Sandstone Slab',top:T.SANDSTONE_TOP,side:T.SANDSTONE_SIDE,bottom:T.SANDSTONE_TOP,transparent:true,slab:true,breakTime:4.0,toolClass:'pickaxe'};
BLOCKS[B.SLAB_BRICK]={name:'Brick Slab',all:T.BRICK,transparent:true,slab:true,breakTime:10.0,toolClass:'pickaxe'};
// ---- Fences ----
BLOCKS[B.FENCE_OAK]={name:'Oak Fence',all:T.PLANKS,transparent:true,fence:true,breakTime:3.0,toolClass:'axe'};
BLOCKS[B.FENCE_STONE]={name:'Stone Fence',all:T.COBBLE,transparent:true,fence:true,breakTime:8.0,toolClass:'pickaxe'};
BLOCKS[B.FENCE_GATE_OAK]={name:'Oak Fence Gate',all:T.PLANKS,transparent:true,fenceGate:true,fenceGateOpen:false,breakTime:3.0,toolClass:'axe'};
BLOCKS[B.FENCE_GATE_STONE]={name:'Stone Fence Gate',all:T.COBBLE,transparent:true,fenceGate:true,fenceGateOpen:false,breakTime:8.0,toolClass:'pickaxe'};
// ---- Walls ----
BLOCKS[B.WALL_STONE]={name:'Stone Wall',all:T.STONE_BRICK,transparent:true,wall:true,breakTime:9.0,toolClass:'pickaxe'};
BLOCKS[B.WALL_BRICK]={name:'Brick Wall',all:T.BRICK,transparent:true,wall:true,breakTime:10.0,toolClass:'pickaxe'};
BLOCKS[B.WALL_MOSSY]={name:'Mossy Wall',all:T.MOSSY_BRICK,transparent:true,wall:true,breakTime:9.0,toolClass:'pickaxe'};
// ---- TNT ----
BLOCKS[B.TNT]={name:'TNT',all:T.TNT_SIDE,breakTime:0.0};
// ---- Wool (16 colors) ----
const WOOL_COLORS=[
  [B.WOOL_ORANGE,'Orange Wool',T.WOOL_ORANGE],
  [B.WOOL_MAGENTA,'Magenta Wool',T.WOOL_MAGENTA],
  [B.WOOL_LIGHT_BLUE,'Light Blue Wool',T.WOOL_LIGHT_BLUE],
  [B.WOOL_YELLOW,'Yellow Wool',T.WOOL_YELLOW],
  [B.WOOL_LIME,'Lime Wool',T.WOOL_LIME],
  [B.WOOL_PINK,'Pink Wool',T.WOOL_PINK],
  [B.WOOL_GRAY,'Gray Wool',T.WOOL_GRAY],
  [B.WOOL_LIGHT_GRAY,'Light Gray Wool',T.WOOL_LIGHT_GRAY],
  [B.WOOL_CYAN,'Cyan Wool',T.WOOL_CYAN],
  [B.WOOL_PURPLE,'Purple Wool',T.WOOL_PURPLE],
  [B.WOOL_BLUE,'Blue Wool',T.WOOL_BLUE],
  [B.WOOL_BROWN,'Brown Wool',T.WOOL_BROWN],
  [B.WOOL_GREEN,'Green Wool',T.WOOL_GREEN],
  [B.WOOL_BLACK,'Black Wool',T.WOOL_BLACK],
];
for(const[id,name,tile]of WOOL_COLORS)BLOCKS[id]={name,all:tile,breakTime:1.2};
// ---- Terracotta (17 colors) ----
const TERRACOTTA_DEFS=[
  [B.TERRACOTTA,'Terracotta',T.TERRACOTTA],
  [B.TERRACOTTA_RED,'Red Terracotta',T.TERRACOTTA_RED],
  [B.TERRACOTTA_ORANGE,'Orange Terracotta',T.TERRACOTTA_ORANGE],
  [B.TERRACOTTA_YELLOW,'Yellow Terracotta',T.TERRACOTTA_YELLOW],
  [B.TERRACOTTA_LIME,'Lime Terracotta',T.TERRACOTTA_LIME],
  [B.TERRACOTTA_GREEN,'Green Terracotta',T.TERRACOTTA_GREEN],
  [B.TERRACOTTA_CYAN,'Cyan Terracotta',T.TERRACOTTA_CYAN],
  [B.TERRACOTTA_LIGHT_BLUE,'Light Blue Terracotta',T.TERRACOTTA_LIGHT_BLUE],
  [B.TERRACOTTA_BLUE,'Blue Terracotta',T.TERRACOTTA_BLUE],
  [B.TERRACOTTA_PURPLE,'Purple Terracotta',T.TERRACOTTA_PURPLE],
  [B.TERRACOTTA_MAGENTA,'Magenta Terracotta',T.TERRACOTTA_MAGENTA],
  [B.TERRACOTTA_PINK,'Pink Terracotta',T.TERRACOTTA_PINK],
  [B.TERRACOTTA_BROWN,'Brown Terracotta',T.TERRACOTTA_BROWN],
  [B.TERRACOTTA_GRAY,'Gray Terracotta',T.TERRACOTTA_GRAY],
  [B.TERRACOTTA_LIGHT_GRAY,'Light Gray Terracotta',T.TERRACOTTA_LIGHT_GRAY],
  [B.TERRACOTTA_BLACK,'Black Terracotta',T.TERRACOTTA_BLACK],
  [B.TERRACOTTA_WHITE,'White Terracotta',T.TERRACOTTA_WHITE],
];
for(const[id,name,tile]of TERRACOTTA_DEFS)BLOCKS[id]={name,all:tile,breakTime:6.25,toolClass:'pickaxe'};
// ---- Concrete (16 colors) ----
const CONCRETE_DEFS=[
  [B.CONCRETE_RED,'Red Concrete',T.CONCRETE_RED],
  [B.CONCRETE_ORANGE,'Orange Concrete',T.CONCRETE_ORANGE],
  [B.CONCRETE_YELLOW,'Yellow Concrete',T.CONCRETE_YELLOW],
  [B.CONCRETE_LIME,'Lime Concrete',T.CONCRETE_LIME],
  [B.CONCRETE_GREEN,'Green Concrete',T.CONCRETE_GREEN],
  [B.CONCRETE_CYAN,'Cyan Concrete',T.CONCRETE_CYAN],
  [B.CONCRETE_LIGHT_BLUE,'Light Blue Concrete',T.CONCRETE_LIGHT_BLUE],
  [B.CONCRETE_BLUE,'Blue Concrete',T.CONCRETE_BLUE],
  [B.CONCRETE_PURPLE,'Purple Concrete',T.CONCRETE_PURPLE],
  [B.CONCRETE_MAGENTA,'Magenta Concrete',T.CONCRETE_MAGENTA],
  [B.CONCRETE_PINK,'Pink Concrete',T.CONCRETE_PINK],
  [B.CONCRETE_BROWN,'Brown Concrete',T.CONCRETE_BROWN],
  [B.CONCRETE_GRAY,'Gray Concrete',T.CONCRETE_GRAY],
  [B.CONCRETE_LIGHT_GRAY,'Light Gray Concrete',T.CONCRETE_LIGHT_GRAY],
  [B.CONCRETE_BLACK,'Black Concrete',T.CONCRETE_BLACK],
  [B.CONCRETE_WHITE,'White Concrete',T.CONCRETE_WHITE],
];
for(const[id,name,tile]of CONCRETE_DEFS)BLOCKS[id]={name,all:tile,breakTime:6.0,toolClass:'pickaxe'};
// ---- Glazed Terracotta (6 pattern colors) ----
const GLAZED_DEFS=[
  [B.GLAZED_TERRACOTTA_WHITE,'White Glazed Terracotta',T.GLAZED_WHITE],
  [B.GLAZED_TERRACOTTA_ORANGE,'Orange Glazed Terracotta',T.GLAZED_ORANGE],
  [B.GLAZED_TERRACOTTA_MAGENTA,'Magenta Glazed Terracotta',T.GLAZED_MAGENTA],
  [B.GLAZED_TERRACOTTA_CYAN,'Cyan Glazed Terracotta',T.GLAZED_CYAN],
  [B.GLAZED_TERRACOTTA_BLUE,'Blue Glazed Terracotta',T.GLAZED_BLUE],
  [B.GLAZED_TERRACOTTA_LIME,'Lime Glazed Terracotta',T.GLAZED_LIME],
];
for(const[id,name,tile]of GLAZED_DEFS)BLOCKS[id]={name,all:tile,breakTime:6.25,toolClass:'pickaxe'};
// ---- Banners (6 colors) ----
const BANNER_DEFS=[
  [B.BANNER_WHITE,'White Banner',T.BANNER_WHITE],
  [B.BANNER_RED,'Red Banner',T.BANNER_RED],
  [B.BANNER_BLUE,'Blue Banner',T.BANNER_BLUE],
  [B.BANNER_GREEN,'Green Banner',T.BANNER_GREEN],
  [B.BANNER_YELLOW,'Yellow Banner',T.BANNER_YELLOW],
  [B.BANNER_BLACK,'Black Banner',T.BANNER_BLACK],
];
for(const[id,name,tile]of BANNER_DEFS)BLOCKS[id]={name,all:tile,transparent:true,flat:true,breakTime:1.0};
// ---- Pressure Plates (flat redstone inputs) ----
BLOCKS[B.PRESSURE_PLATE_WOOD]={name:'Wooden Pressure Plate',all:T.PLANKS,transparent:true,flat:true,breakTime:0.5,pressurePlate:true};
BLOCKS[B.PRESSURE_PLATE_STONE]={name:'Stone Pressure Plate',all:T.STONE,transparent:true,flat:true,breakTime:0.5,pressurePlate:true,toolClass:'pickaxe'};
// ---- Buttons (flat redstone inputs) ----
BLOCKS[B.BUTTON_WOOD]={name:'Wooden Button',all:T.PLANKS,transparent:true,flat:true,breakTime:0.5,button:true};
BLOCKS[B.BUTTON_STONE]={name:'Stone Button',all:T.STONE,transparent:true,flat:true,breakTime:0.5,button:true,toolClass:'pickaxe'};
// ---- Nether blocks (for ruined portals) ----
BLOCKS[B.NETHER_BRICK]={name:'Nether Brick',all:T.NETHER_BRICK,breakTime:10.0,toolClass:'pickaxe'};
BLOCKS[B.NETHERRACK]={name:'Netherrack',all:T.NETHERRACK,breakTime:0.4,toolClass:'pickaxe'};
BLOCKS[B.CRYING_OBSIDIAN]={name:'Crying Obsidian',all:T.CRYING_OBSIDIAN,breakTime:45.0,emissive:true};
// ---- Structure specialty blocks ----
BLOCKS[B.CHISELED_STONE_BRICK]={name:'Chiseled Stone Brick',all:T.CHISELED_STONE_BRICK,breakTime:10.0,toolClass:'pickaxe'};
BLOCKS[B.MOSSY_COBBLE]={name:'Mossy Cobblestone',all:T.MOSSY_COBBLE,breakTime:10.0,toolClass:'pickaxe'};
BLOCKS[B.VINE]={name:'Vine',all:T.LEAVES,transparent:true,crossPlant:true,breakTime:0.2};
BLOCKS[B.SNOW_BLOCK]={name:'Snow Block',all:T.SNOW,breakTime:1.0,toolClass:'shovel'};
BLOCKS[B.BLUE_ICE]={name:'Blue Ice',all:T.ICE,breakTime:2.8,toolClass:'pickaxe'};
// ---- Redstone components ----
BLOCKS[B.LEVER]={name:'Lever',all:T.LEVER_SIDE,transparent:true,flat:true,breakTime:0.5,lever:true,powered:false};
BLOCKS[B.REDSTONE_DUST]={name:'Redstone Dust',all:T.REDSTONE_DUST_OFF,transparent:true,flat:true,breakTime:0.0,redstoneDust:true,powered:false,signal:0};
BLOCKS[B.REDSTONE_TORCH_OFF]={name:'Redstone Torch',all:T.REDSTONE_TORCH_OFF,transparent:true,breakTime:0.0,redstoneTorch:true,powered:false};
BLOCKS[B.REDSTONE_TORCH_ON]={name:'Redstone Torch (On)',all:T.REDSTONE_TORCH_ON,transparent:true,breakTime:0.0,redstoneTorch:true,powered:true,emissive:true};
BLOCKS[B.REPEATER]={name:'Repeater',all:T.REPEATER_OFF,transparent:true,flat:true,breakTime:0.0,repeater:true,powered:false,facing:0,delay:1};
BLOCKS[B.PISTON]={name:'Piston',top:T.PISTON_FACE,side:T.PISTON_SIDE,bottom:T.PISTON_SIDE,breakTime:1.5,piston:true,sticky:false,extended:false,facing:1};
BLOCKS[B.PISTON_STICKY]={name:'Sticky Piston',top:T.PISTON_STICKY_FACE,side:T.PISTON_SIDE,bottom:T.PISTON_SIDE,breakTime:1.5,piston:true,sticky:true,extended:false,facing:1};
BLOCKS[B.PISTON_HEAD]={name:'Piston Head',all:T.PISTON_EXTENSION,transparent:true,breakTime:0.0,pistonHead:true,sticky:false};
BLOCKS[B.PISTON_HEAD_STICKY]={name:'Sticky Piston Head',all:T.PISTON_EXTENSION,transparent:true,breakTime:0.0,pistonHead:true,sticky:true};
BLOCKS[B.DISPENSER]={name:'Dispenser',top:T.DISPENSER_SIDE,side:T.DISPENSER_SIDE,front:T.DISPENSER_FRONT,bottom:T.DISPENSER_SIDE,breakTime:3.5,toolClass:'pickaxe',dispenser:true,facing:0,inventory:[]};
BLOCKS[B.DROPPER]={name:'Dropper',top:T.DISPENSER_SIDE,side:T.DISPENSER_SIDE,front:T.DROPPER_FRONT,bottom:T.DISPENSER_SIDE,breakTime:3.5,toolClass:'pickaxe',dropper:true,facing:0,inventory:[]};
BLOCKS[B.HOPPER]={name:'Hopper',top:T.HOPPER_INSIDE,side:T.HOPPER_SIDE,bottom:T.HOPPER_SIDE,breakTime:3.0,toolClass:'pickaxe',hopper:true,inventory:[],cooldown:0};
BLOCKS[B.OBSERVER]={name:'Observer',top:T.OBSERVER_SIDE,side:T.OBSERVER_SIDE,front:T.OBSERVER_FACE,back:T.OBSERVER_BACK,bottom:T.OBSERVER_SIDE,breakTime:3.0,toolClass:'pickaxe',observer:true,facing:0,powered:false};
// Wooden doors: half(top/bottom) x facing(N/E/S/W) x open/closed = 16 block IDs.
// Stored as distinct numeric IDs (no metadata), mirroring the WHEAT0../CARROT0.. pattern.
// Rendered flat for now (placeholder look); real geometry comes in a later pass.
(function registerDoors(){const halves=[['bottom','BOTTOM'],['top','TOP']];const facings=[['N',0],['E',1],['S',2],['W',3]];const states=[['CLOSED',false],['OPEN',true]];
  for(const[half,HALF]of halves){for(const[F,facing]of facings){for(const[ST,open]of states){
    const id=B['DOOR_'+HALF+'_'+F+'_'+ST];
    BLOCKS[id]={name:"Wooden Door",all:T.PLANKS,transparent:true,flat:true,breakTime:3.0,door:true,doorHalf:half,doorFacing:facing,doorOpen:open};
  }}}
})();
// Bed: a comfy block you can sleep in at night to skip to morning. Rendered as
// a full block for simplicity, with a soft red mattress + white pillow top, red
// cloth sides and a wooden footboard/headboard end texture.
BLOCKS[B.BED]={name:"Bed",top:T.BED_TOP,side:T.BED_SIDE,bottom:T.PLANKS,front:T.BED_END,breakTime:1.0,bed:true};
// Wooden Stairs: a half-step block (full lower slab + a back upper step) used for
// roofs and easy climbing. Four facing variants (N/E/S/W) are stored as distinct
// block IDs, mirroring the door pattern. They share the oak PLANKS texture and a
// custom `stairs` render path (see render.js pushStairs). Marked transparent so a
// stair's neighbours still draw the faces it doesn't fully cover.
(function registerStairs(){const facings=[['N',0],['E',1],['S',2],['W',3]];
  for(const[F,facing]of facings){const id=B['STAIRS_'+F];
    BLOCKS[id]={name:"Wooden Stairs",all:T.PLANKS,transparent:true,stairs:true,stairFacing:facing,toolClass:'axe',breakTime:3.0};
  }
})();
const ITEM_APPLE=100;const ITEM_SEEDS=200,ITEM_WHEAT=201,ITEM_CARROT=202,ITEM_POTATO=203,ITEM_BREAD=204,ITEM_MELON_SLICE=205,ITEM_PUMPKIN_PIE=206,ITEM_BAKED_POTATO=207,ITEM_HOE=210;
// Mob drops (meat / materials) and the rideable boat item
const ITEM_PORKCHOP=230,ITEM_BEEF=231,ITEM_CHICKEN=232,ITEM_MUTTON=233,ITEM_LEATHER=234,ITEM_FEATHER=235,ITEM_BOAT=240;
// Fishing + minecart additions
const ITEM_FISHING_ROD=241,ITEM_FISH=242,ITEM_COOKED_FISH=243,ITEM_PUFFERFISH=244,ITEM_MINECART=245,ITEM_DOOR=246;
const ITEMS={[ITEM_APPLE]:{name:'Apple',emoji:'🍎',food:4},[ITEM_SEEDS]:{name:'Seeds',emoji:'🌱',plant:B.WHEAT},[ITEM_WHEAT]:{name:'Wheat',emoji:'🌾'},[ITEM_CARROT]:{name:'Carrot',emoji:'🥕',food:3,plant:B.CARROT},[ITEM_POTATO]:{name:'Potato',emoji:'🥔',food:1,plant:B.POTATO},[ITEM_BREAD]:{name:'Bread',emoji:'🍞',food:5},[ITEM_MELON_SLICE]:{name:'Melon Slice',emoji:'🍉',food:2},[ITEM_PUMPKIN_PIE]:{name:'Pumpkin Pie',emoji:'🥧',food:8},[ITEM_BAKED_POTATO]:{name:'Baked Potato',emoji:'🍠',food:5},[ITEM_HOE]:{name:'Hoe',emoji:'🪓',tool:'hoe'},
[ITEM_PORKCHOP]:{name:'Porkchop',emoji:'🥩',food:6},[ITEM_BEEF]:{name:'Beef',emoji:'🥩',food:6},[ITEM_CHICKEN]:{name:'Chicken',emoji:'🍗',food:4},[ITEM_MUTTON]:{name:'Mutton',emoji:'🍖',food:5},[ITEM_LEATHER]:{name:'Leather',emoji:'🟫'},[ITEM_FEATHER]:{name:'Feather',emoji:'🪶'},
[ITEM_BOAT]:{name:'Boat',emoji:'🛶',boat:true},
[ITEM_FISHING_ROD]:{name:'Fishing Rod',emoji:'🎣',fishingRod:true},
[ITEM_FISH]:{name:'Raw Fish',emoji:'🐟',food:2},
[ITEM_COOKED_FISH]:{name:'Cooked Fish',emoji:'🍤',food:5},
[ITEM_PUFFERFISH]:{name:'Pufferfish',emoji:'🐡',food:1},
[ITEM_MINECART]:{name:'Minecart',emoji:'🛒',minecart:true},
[ITEM_DOOR]:{name:'Wooden Door',emoji:'🚪',door:true}};
// Tool material tiers: wood→stone→iron→gold→diamond
const TOOL_MATERIALS={
  wood:   {name:'Wood',     speed:2,    durability:60,   tier:1, color:'#9c6b3c'},
  stone:  {name:'Stone',     speed:4,    durability:132,  tier:2, color:'#8a8a8a'},
  iron:   {name:'Iron',     speed:6,    durability:251,  tier:3, color:'#d8d8d8'},
  gold:   {name:'Gold',     speed:12,   durability:33,   tier:1, color:'#f7d24a'},
  diamond:{name:'Diamond', speed:8,    durability:1562, tier:4, color:'#4fe6df'},
};
// Tool types
const TOOL_KINDS={pickaxe:{name:'Pickaxe',emoji:'⛏'},axe:{name:'Axe',emoji:'🪓'},shovel:{name:'Shovel',emoji:'🥄'}};
// Tool item IDs (211-225): pickaxe/axe/shovel per material
const ITEM_STICK=208;ITEMS[ITEM_STICK]={name:'Stick',emoji:'🥢'};
const ITEM_PICK_WOOD=211,ITEM_PICK_STONE=212,ITEM_PICK_IRON=213,ITEM_PICK_GOLD=214,ITEM_PICK_DIAMOND=215;
const ITEM_AXE_WOOD=216,ITEM_AXE_STONE=217,ITEM_AXE_IRON=218,ITEM_AXE_GOLD=219,ITEM_AXE_DIAMOND=220;
const ITEM_SHOVEL_WOOD=221,ITEM_SHOVEL_STONE=222,ITEM_SHOVEL_IRON=223,ITEM_SHOVEL_GOLD=224,ITEM_SHOVEL_DIAMOND=225;
// Register all tool items
(function registerTools(){
  const kinds=[['pickaxe',[ITEM_PICK_WOOD,ITEM_PICK_STONE,ITEM_PICK_IRON,ITEM_PICK_GOLD,ITEM_PICK_DIAMOND]],
               ['axe',[ITEM_AXE_WOOD,ITEM_AXE_STONE,ITEM_AXE_IRON,ITEM_AXE_GOLD,ITEM_AXE_DIAMOND]],
               ['shovel',[ITEM_SHOVEL_WOOD,ITEM_SHOVEL_STONE,ITEM_SHOVEL_IRON,ITEM_SHOVEL_GOLD,ITEM_SHOVEL_DIAMOND]]];
  const mats=['wood','stone','iron','gold','diamond'];
  for(const[kind,ids]of kinds){for(let i=0;i<mats.length;i++){const mat=mats[i];const m=TOOL_MATERIALS[mat];
    ITEMS[ids[i]]={name:m.name+TOOL_KINDS[kind].name,emoji:TOOL_KINDS[kind].emoji,tool:kind,material:mat,
      toolClass:kind,maxDur:m.durability,toolColor:m.color};}}
})();
// Tag each block with its preferred tool class and minimum tier
(function tagBlockTools(){
  const pick=[B.STONE,B.COBBLE,B.BRICK,B.STONE_BRICK,B.MOSSY_BRICK,B.CRACKED_BRICK,B.COAL_ORE,B.IRON_ORE,
    B.GOLD_ORE,B.DIAMOND_ORE,B.OBSIDIAN,B.SANDSTONE,B.ICE,B.FURNACE,B.DRIPSTONE,B.CALCITE,B.AMETHYST_BLOCK,
    B.SMOOTH_BASALT,B.MOSS,
    B.COPPER,B.COPPER_EXPOSED,B.COPPER_WEATHERED,B.COPPER_OXIDIZED,
    B.SLAB_STONE,B.SLAB_SANDSTONE,B.SLAB_BRICK,
    B.FENCE_STONE,B.FENCE_GATE_STONE,
    B.WALL_STONE,B.WALL_BRICK,B.WALL_MOSSY,
    B.NETHER_BRICK,B.NETHERRACK,B.CHISELED_STONE_BRICK,B.MOSSY_COBBLE,B.BLUE_ICE,
    B.TERRACOTTA,B.TERRACOTTA_RED,B.TERRACOTTA_ORANGE,B.TERRACOTTA_YELLOW,B.TERRACOTTA_LIME,
    B.TERRACOTTA_GREEN,B.TERRACOTTA_CYAN,B.TERRACOTTA_LIGHT_BLUE,B.TERRACOTTA_BLUE,B.TERRACOTTA_PURPLE,
    B.TERRACOTTA_MAGENTA,B.TERRACOTTA_PINK,B.TERRACOTTA_BROWN,B.TERRACOTTA_GRAY,B.TERRACOTTA_LIGHT_GRAY,
    B.TERRACOTTA_BLACK,B.TERRACOTTA_WHITE,
    B.CONCRETE_RED,B.CONCRETE_ORANGE,B.CONCRETE_YELLOW,B.CONCRETE_LIME,B.CONCRETE_GREEN,
    B.CONCRETE_CYAN,B.CONCRETE_LIGHT_BLUE,B.CONCRETE_BLUE,B.CONCRETE_PURPLE,B.CONCRETE_MAGENTA,
    B.CONCRETE_PINK,B.CONCRETE_BROWN,B.CONCRETE_GRAY,B.CONCRETE_LIGHT_GRAY,B.CONCRETE_BLACK,B.CONCRETE_WHITE,
    B.GLAZED_TERRACOTTA_WHITE,B.GLAZED_TERRACOTTA_ORANGE,B.GLAZED_TERRACOTTA_MAGENTA,
    B.GLAZED_TERRACOTTA_CYAN,B.GLAZED_TERRACOTTA_BLUE,B.GLAZED_TERRACOTTA_LIME,
    B.PRESSURE_PLATE_STONE,B.BUTTON_STONE];
  const axe=[B.LOG,B.PLANKS,B.BIRCH_LOG,B.CRAFTING,B.BOOKSHELF,B.CHEST,B.DEAD_LOG,B.MANGROVE_LOG,B.PALM_LOG,B.MAPLE_LOG,B.MANGROVE_ROOTS,
    B.SLAB_WOOD,B.FENCE_OAK,B.FENCE_GATE_OAK];
  const shovel=[B.GRASS,B.DIRT,B.SAND,B.GRAVEL,B.SNOW,B.PATH,B.FARMLAND,B.FARMLAND_WET];
  // Minimum tool tier required to get a drop
  const minTier={[B.IRON_ORE]:2,[B.GOLD_ORE]:3,[B.DIAMOND_ORE]:3,[B.OBSIDIAN]:4,[B.STONE]:1,[B.COBBLE]:1,
    [B.COAL_ORE]:1,[B.AMETHYST_BLOCK]:1,[B.AMETHYST_CLUSTER]:1};
  for(const id of pick)if(BLOCKS[id])BLOCKS[id].toolClass='pickaxe';
  for(const id of axe)if(BLOCKS[id])BLOCKS[id].toolClass='axe';
  for(const id of shovel)if(BLOCKS[id])BLOCKS[id].toolClass='shovel';
  for(const id in minTier)if(BLOCKS[id])BLOCKS[id].minTier=minTier[id];
})();
// ---- Redstone item ----
const ITEM_REDSTONE=260;
ITEMS[ITEM_REDSTONE]={name:'Redstone',emoji:'🔴',placesBlock:B.REDSTONE_DUST};
// Tool helpers
function isTool(id){return !!(ITEMS[id]&&ITEMS[id].material&&ITEMS[id].toolClass);}
function toolDef(id){return isTool(id)?ITEMS[id]:null;}
const STACK_MAX=64;
// Tools do not stack
function maxStackOf(id){return isTool(id)?1:STACK_MAX;}function dropFor(id){if(id===B.GRASS)return Math.random()<0.18?ITEM_SEEDS:B.DIRT;if(id===B.STONE)return B.COBBLE;if(id===B.GLASS)return null;if(id===B.ICE)return null;if(id===B.LAVA)return null;if(id===B.LEAVES||id===B.BIRCH_LEAVES||id===B.MANGROVE_LEAVES||id===B.PALM_LEAVES||id===B.MAPLE_LEAVES_RED||id===B.MAPLE_LEAVES_ORANGE||id===B.MAPLE_LEAVES_YELLOW)return Math.random()<0.2?ITEM_APPLE:null;if(id===B.COBWEB)return null;if(id===B.PATH)return B.DIRT;if(id===B.GLOW_LICHEN)return null;if(id===B.FARMLAND||id===B.FARMLAND_WET)return B.DIRT;if(id===B.MELON)return null;if(id===B.DEAD_BUSH)return null;if(id===B.TALL_GRASS)return Math.random()<0.125?ITEM_SEEDS:null;if(id===B.STAIRS_E||id===B.STAIRS_S||id===B.STAIRS_W)return B.STAIRS_N;
// Copper: always drops the raw copper block (no stage change on break)
if(id===B.COPPER_EXPOSED||id===B.COPPER_WEATHERED||id===B.COPPER_OXIDIZED)return id;
// Redstone torch: drop the on-version as item
if(id===B.REDSTONE_TORCH_OFF)return B.REDSTONE_TORCH_ON;
// Redstone dust: drop redstone item
if(id===B.REDSTONE_DUST)return ITEM_REDSTONE;
// Piston head cannot be broken by player directly
if(id===B.PISTON_HEAD||id===B.PISTON_HEAD_STICKY)return null;
return id;}
// Recipe categories for tab filtering
const RECIPE_CATEGORIES=[
  {id:'all',name:'All',emoji:'📖'},
  {id:'building',name:'Building',emoji:'🧱'},
  {id:'tools',name:'Tools',emoji:'⛏'},
  {id:'food',name:'Food',emoji:'🍞'},
  {id:'deco',name:'Deco',emoji:'✨'},
  {id:'redstone',name:'Redstone',emoji:'🔴'},
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
// Wooden Door: 6 planks in a 2x3 column → 1 door item
{cat:'building',pattern:[[B.PLANKS,B.PLANKS],[B.PLANKS,B.PLANKS],[B.PLANKS,B.PLANKS]],out:{id:ITEM_DOOR,count:1}},
{cat:'building',pattern:[[B.SNOW,B.SNOW],[B.SNOW,B.SNOW]],out:{id:B.ICE,count:1}},
// Wooden Stairs: 6 planks in a staircase pattern → 4 stairs (roofs / climbing)
{cat:'building',pattern:[[B.PLANKS,null,null],[B.PLANKS,B.PLANKS,null],[B.PLANKS,B.PLANKS,B.PLANKS]],out:{id:B.STAIRS_N,count:4}},
// Bed: 3 wool over 3 planks (sleep through the night to skip to morning)
{cat:'deco',pattern:[[B.WOOL_RED,B.WOOL_RED,B.WOOL_RED],[B.PLANKS,B.PLANKS,B.PLANKS]],out:{id:B.BED,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.WOOL_WHITE,B.WOOL_WHITE],[B.PLANKS,B.PLANKS,B.PLANKS]],out:{id:B.BED,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,null,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.FURNACE,count:2}},
{cat:'building',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.OBSIDIAN,count:1}},
{cat:'building',pattern:[[B.SAND,B.SAND,B.SAND]],out:{id:B.SANDSTONE,count:3}},
{cat:'deco',pattern:[[B.AMETHYST_CLUSTER,B.AMETHYST_CLUSTER],[B.AMETHYST_CLUSTER,B.AMETHYST_CLUSTER]],out:{id:B.AMETHYST_BLOCK,count:1}},
{cat:'building',pattern:[[B.MOSS,B.MOSS],[B.MOSS,B.MOSS]],out:{id:B.GRASS,count:4}},
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS],[null,B.PLANKS]],out:{id:ITEM_HOE,count:1}},
// Boat: 5 planks in a U shape (ride on water/lakes)
{cat:'tools',pattern:[[B.PLANKS,null,B.PLANKS],[B.PLANKS,B.PLANKS,B.PLANKS]],out:{id:ITEM_BOAT,count:1}},
// Fishing rod: 3 sticks diagonally + 2 cobweb "string" down the side
{cat:'tools',pattern:[[null,null,ITEM_STICK],[null,ITEM_STICK,B.COBWEB],[ITEM_STICK,null,B.COBWEB]],out:{id:ITEM_FISHING_ROD,count:1}},
// Minecart: 5 iron in a U shape (ride along rails)
{cat:'tools',pattern:[[B.IRON_ORE,null,B.IRON_ORE],[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE]],out:{id:ITEM_MINECART,count:1}},
// Rails: 6 iron in two columns + a stick in the middle → 8 rails
{cat:'building',pattern:[[B.IRON_ORE,null,B.IRON_ORE],[B.IRON_ORE,ITEM_STICK,B.IRON_ORE],[B.IRON_ORE,null,B.IRON_ORE]],out:{id:B.RAIL,count:8}},
// Stick
{cat:'tools',pattern:[[B.PLANKS],[B.PLANKS]],out:{id:ITEM_STICK,count:4}},
// Pickaxes
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS,B.PLANKS],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE,B.GOLD_ORE,B.GOLD_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE,B.DIAMOND_ORE,B.DIAMOND_ORE],[null,ITEM_STICK,null],[null,ITEM_STICK,null]],out:{id:ITEM_PICK_DIAMOND,count:1}},
// Axes
{cat:'tools',pattern:[[B.PLANKS,B.PLANKS],[B.PLANKS,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE,B.COBBLE],[B.COBBLE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE,B.IRON_ORE],[B.IRON_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE,B.GOLD_ORE],[B.GOLD_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE,B.DIAMOND_ORE],[B.DIAMOND_ORE,ITEM_STICK],[null,ITEM_STICK]],out:{id:ITEM_AXE_DIAMOND,count:1}},
// Shovels
{cat:'tools',pattern:[[B.PLANKS],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_WOOD,count:1}},
{cat:'tools',pattern:[[B.COBBLE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_STONE,count:1}},
{cat:'tools',pattern:[[B.IRON_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_IRON,count:1}},
{cat:'tools',pattern:[[B.GOLD_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_GOLD,count:1}},
{cat:'tools',pattern:[[B.DIAMOND_ORE],[ITEM_STICK],[ITEM_STICK]],out:{id:ITEM_SHOVEL_DIAMOND,count:1}},
{cat:'food',pattern:[[ITEM_WHEAT,ITEM_WHEAT,ITEM_WHEAT]],out:{id:ITEM_BREAD,count:1}},
// Cook raw fish over coal (campfire-style craft) → cooked fish
{cat:'food',pattern:[[ITEM_FISH],[B.COAL_ORE]],out:{id:ITEM_COOKED_FISH,count:1}},
{cat:'food',pattern:[[B.PUMPKIN]],out:{id:ITEM_SEEDS,count:4}},
{cat:'food',pattern:[[B.PUMPKIN,ITEM_WHEAT],[ITEM_WHEAT,B.PUMPKIN]],out:{id:ITEM_PUMPKIN_PIE,count:1}},
{cat:'food',pattern:[[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE],[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE],[ITEM_MELON_SLICE,ITEM_MELON_SLICE,ITEM_MELON_SLICE]],out:{id:B.MELON,count:1}},
// ---- Copper block ----
{cat:'building',pattern:[[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE],[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE],[B.IRON_ORE,B.IRON_ORE,B.IRON_ORE]],out:{id:B.COPPER,count:1}},
// ---- Slabs: 3 of material in a row → 6 slabs ----
{cat:'building',pattern:[[B.PLANKS,B.PLANKS,B.PLANKS]],out:{id:B.SLAB_WOOD,count:6}},
{cat:'building',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.SLAB_STONE,count:6}},
{cat:'building',pattern:[[B.SANDSTONE,B.SANDSTONE,B.SANDSTONE]],out:{id:B.SLAB_SANDSTONE,count:6}},
{cat:'building',pattern:[[B.BRICK,B.BRICK,B.BRICK]],out:{id:B.SLAB_BRICK,count:6}},
// ---- Fences: 4 planks/cobble + 2 sticks in rows → 3 fences ----
{cat:'building',pattern:[[B.PLANKS,ITEM_STICK,B.PLANKS],[B.PLANKS,ITEM_STICK,B.PLANKS]],out:{id:B.FENCE_OAK,count:3}},
{cat:'building',pattern:[[B.COBBLE,ITEM_STICK,B.COBBLE],[B.COBBLE,ITEM_STICK,B.COBBLE]],out:{id:B.FENCE_STONE,count:3}},
// ---- Fence gates: 2 sticks + 4 planks/cobble → 1 gate ----
{cat:'building',pattern:[[ITEM_STICK,B.PLANKS,ITEM_STICK],[ITEM_STICK,B.PLANKS,ITEM_STICK]],out:{id:B.FENCE_GATE_OAK,count:1}},
{cat:'building',pattern:[[ITEM_STICK,B.COBBLE,ITEM_STICK],[ITEM_STICK,B.COBBLE,ITEM_STICK]],out:{id:B.FENCE_GATE_STONE,count:1}},
// ---- Walls: 6 of material in 2 rows → 6 walls ----
{cat:'building',pattern:[[B.STONE_BRICK,B.STONE_BRICK,B.STONE_BRICK],[B.STONE_BRICK,B.STONE_BRICK,B.STONE_BRICK]],out:{id:B.WALL_STONE,count:6}},
{cat:'building',pattern:[[B.BRICK,B.BRICK,B.BRICK],[B.BRICK,B.BRICK,B.BRICK]],out:{id:B.WALL_BRICK,count:6}},
{cat:'building',pattern:[[B.MOSSY_BRICK,B.MOSSY_BRICK,B.MOSSY_BRICK],[B.MOSSY_BRICK,B.MOSSY_BRICK,B.MOSSY_BRICK]],out:{id:B.WALL_MOSSY,count:6}},
// ---- TNT: 4 sand + 5 coal in checkerboard → 1 TNT ----
{cat:'building',pattern:[[B.SAND,B.COAL_ORE,B.SAND],[B.COAL_ORE,B.SAND,B.COAL_ORE],[B.SAND,B.COAL_ORE,B.SAND]],out:{id:B.TNT,count:1}},
// ---- Wool dye recipes (wool_red/white + tint → colored wool) ----
{cat:'deco',pattern:[[B.WOOL_WHITE,B.WOOL_ORANGE]],out:{id:B.WOOL_ORANGE,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.FLOWER_ALLIUM]],out:{id:B.WOOL_MAGENTA,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.FLOWER_CORNFLOWER]],out:{id:B.WOOL_LIGHT_BLUE,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.FLOWER_DANDELION]],out:{id:B.WOOL_YELLOW,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.MOSS]],out:{id:B.WOOL_LIME,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.FLOWER_TULIP]],out:{id:B.WOOL_PINK,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.GRAVEL]],out:{id:B.WOOL_GRAY,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.COBWEB]],out:{id:B.WOOL_LIGHT_GRAY,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.SEAWEED]],out:{id:B.WOOL_CYAN,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.AMETHYST_BLOCK]],out:{id:B.WOOL_PURPLE,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.FLOWER_CORNFLOWER,B.FLOWER_CORNFLOWER]],out:{id:B.WOOL_BLUE,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.DEAD_LOG]],out:{id:B.WOOL_BROWN,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.LEAVES]],out:{id:B.WOOL_GREEN,count:1}},
{cat:'deco',pattern:[[B.WOOL_WHITE,B.COAL_ORE]],out:{id:B.WOOL_BLACK,count:1}},
// ---- Terracotta: 8 clay (cobble proxy) around central fire (lava) → 8 terracotta ----
{cat:'building',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.LAVA,B.COBBLE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.TERRACOTTA,count:8}},
// ---- Dyed Terracotta: terracotta + dye source ----
{cat:'deco',pattern:[[B.TERRACOTTA,B.FLOWER_TULIP]],out:{id:B.TERRACOTTA_RED,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.WOOL_ORANGE]],out:{id:B.TERRACOTTA_ORANGE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.FLOWER_DANDELION]],out:{id:B.TERRACOTTA_YELLOW,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.MOSS]],out:{id:B.TERRACOTTA_LIME,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.LEAVES]],out:{id:B.TERRACOTTA_GREEN,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.SEAWEED]],out:{id:B.TERRACOTTA_CYAN,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.FLOWER_CORNFLOWER]],out:{id:B.TERRACOTTA_BLUE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.AMETHYST_BLOCK]],out:{id:B.TERRACOTTA_PURPLE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.FLOWER_ALLIUM]],out:{id:B.TERRACOTTA_MAGENTA,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.FLOWER_TULIP,B.COBWEB]],out:{id:B.TERRACOTTA_PINK,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.DEAD_LOG]],out:{id:B.TERRACOTTA_BROWN,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.GRAVEL]],out:{id:B.TERRACOTTA_GRAY,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.COBWEB]],out:{id:B.TERRACOTTA_LIGHT_GRAY,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.COAL_ORE]],out:{id:B.TERRACOTTA_BLACK,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA,B.SNOW]],out:{id:B.TERRACOTTA_WHITE,count:1}},
// ---- Glazed Terracotta: smelt colored terracotta (use furnace proxy: terracotta+lava) ----
{cat:'deco',pattern:[[B.TERRACOTTA_WHITE,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_WHITE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA_ORANGE,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_ORANGE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA_MAGENTA,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_MAGENTA,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA_CYAN,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_CYAN,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA_BLUE,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_BLUE,count:1}},
{cat:'deco',pattern:[[B.TERRACOTTA_LIME,B.LAVA]],out:{id:B.GLAZED_TERRACOTTA_LIME,count:1}},
// ---- Concrete: 4 sand + 4 gravel + dye → 8 concrete ----
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.FLOWER_POPPY,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_RED,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.WOOL_ORANGE,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_ORANGE,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.FLOWER_DANDELION,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_YELLOW,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.MOSS,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_LIME,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.LEAVES,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_GREEN,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.SEAWEED,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_CYAN,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.FLOWER_CORNFLOWER,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_BLUE,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.AMETHYST_BLOCK,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_PURPLE,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.FLOWER_ALLIUM,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_GRAY,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.COAL_ORE,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_BLACK,count:8}},
{cat:'building',pattern:[[B.SAND,B.GRAVEL,B.SAND],[B.GRAVEL,B.SNOW,B.GRAVEL],[B.SAND,B.GRAVEL,B.SAND]],out:{id:B.CONCRETE_WHITE,count:8}},
// ---- Banners: 6 wool of a color (top 2 rows) + 1 stick (middle bottom) → 1 banner ----
{cat:'deco',pattern:[[B.WOOL_WHITE,B.WOOL_WHITE,B.WOOL_WHITE],[B.WOOL_WHITE,B.WOOL_WHITE,B.WOOL_WHITE],[null,ITEM_STICK,null]],out:{id:B.BANNER_WHITE,count:1}},
{cat:'deco',pattern:[[B.WOOL_RED,B.WOOL_RED,B.WOOL_RED],[B.WOOL_RED,B.WOOL_RED,B.WOOL_RED],[null,ITEM_STICK,null]],out:{id:B.BANNER_RED,count:1}},
{cat:'deco',pattern:[[B.WOOL_BLUE,B.WOOL_BLUE,B.WOOL_BLUE],[B.WOOL_BLUE,B.WOOL_BLUE,B.WOOL_BLUE],[null,ITEM_STICK,null]],out:{id:B.BANNER_BLUE,count:1}},
{cat:'deco',pattern:[[B.WOOL_GREEN,B.WOOL_GREEN,B.WOOL_GREEN],[B.WOOL_GREEN,B.WOOL_GREEN,B.WOOL_GREEN],[null,ITEM_STICK,null]],out:{id:B.BANNER_GREEN,count:1}},
{cat:'deco',pattern:[[B.WOOL_YELLOW,B.WOOL_YELLOW,B.WOOL_YELLOW],[B.WOOL_YELLOW,B.WOOL_YELLOW,B.WOOL_YELLOW],[null,ITEM_STICK,null]],out:{id:B.BANNER_YELLOW,count:1}},
{cat:'deco',pattern:[[B.WOOL_BLACK,B.WOOL_BLACK,B.WOOL_BLACK],[B.WOOL_BLACK,B.WOOL_BLACK,B.WOOL_BLACK],[null,ITEM_STICK,null]],out:{id:B.BANNER_BLACK,count:1}},
// ---- Pressure Plates: 2 planks/stone in a row → 1 plate ----
{cat:'building',pattern:[[B.PLANKS,B.PLANKS]],out:{id:B.PRESSURE_PLATE_WOOD,count:1}},
{cat:'building',pattern:[[B.STONE,B.STONE]],out:{id:B.PRESSURE_PLATE_STONE,count:1}},
// ---- Buttons: 1 plank/stone → 1 button ----
{cat:'building',pattern:[[B.PLANKS]],out:{id:B.BUTTON_WOOD,count:1}},
{cat:'building',pattern:[[B.STONE]],out:{id:B.BUTTON_STONE,count:1}},
// ---- Redstone components ----
// Lever: cobble + stick
{cat:'redstone',pattern:[[ITEM_STICK],[B.COBBLE]],out:{id:B.LEVER,count:1}},
// Redstone Torch: redstone on a stick
{cat:'redstone',pattern:[[ITEM_REDSTONE],[ITEM_STICK]],out:{id:B.REDSTONE_TORCH_ON,count:1}},
// Repeater: 2 redstone torches + 1 redstone dust + 3 stone
{cat:'redstone',pattern:[[B.REDSTONE_TORCH_ON,ITEM_REDSTONE,B.REDSTONE_TORCH_ON],[B.STONE,B.STONE,B.STONE]],out:{id:B.REPEATER,count:1}},
// Piston: 3 planks + 4 cobble + 1 iron + 1 redstone
{cat:'redstone',pattern:[[B.PLANKS,B.PLANKS,B.PLANKS],[B.COBBLE,B.IRON_ORE,B.COBBLE],[B.COBBLE,ITEM_REDSTONE,B.COBBLE]],out:{id:B.PISTON,count:1}},
// Sticky Piston: piston + slime (use seaweed as slime proxy)
{cat:'redstone',pattern:[[B.SEAWEED],[B.PISTON]],out:{id:B.PISTON_STICKY,count:1}},
// Dispenser: 7 cobble + 1 bow (cobweb proxy) + 1 redstone
{cat:'redstone',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,B.COBWEB,B.COBBLE],[B.COBBLE,ITEM_REDSTONE,B.COBBLE]],out:{id:B.DISPENSER,count:1}},
// Dropper: 7 cobble + 1 redstone
{cat:'redstone',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[B.COBBLE,null,B.COBBLE],[B.COBBLE,ITEM_REDSTONE,B.COBBLE]],out:{id:B.DROPPER,count:1}},
// Hopper: 5 iron + 1 chest
{cat:'redstone',pattern:[[B.IRON_ORE,null,B.IRON_ORE],[B.IRON_ORE,B.CHEST,B.IRON_ORE],[null,B.IRON_ORE,null]],out:{id:B.HOPPER,count:1}},
// Observer: 6 cobble + 2 redstone + 1 quartz (amethyst proxy)
{cat:'redstone',pattern:[[B.COBBLE,B.COBBLE,B.COBBLE],[ITEM_REDSTONE,B.AMETHYST_BLOCK,ITEM_REDSTONE],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:B.OBSERVER,count:1}},
// Redstone dust: from coal ore as a proxy drop recipe
{cat:'redstone',pattern:[[B.COAL_ORE,B.IRON_ORE]],out:{id:ITEM_REDSTONE,count:4}},
];
// Achievement definitions: stat=counter key, goal=target value
const ACHIEVEMENTS=[
  {id:'first_block',icon:'\u26cf',name:'First Strike',desc:'Break 1 block',stat:'mined',goal:1},
  {id:'miner_50',icon:'\ud83e\udea8',name:'\u63a1\u6398\u898b\u7fd2\u3044',desc:'Break 50 blocks',stat:'mined',goal:50},
  {id:'miner_500',icon:'\u26f0',name:'Pickaxe Master',desc:'Break 500 blocks',stat:'mined',goal:500},
  {id:'builder_1',icon:'\ud83e\uddf1',name:'First Build',desc:'Place 1 block',stat:'placed',goal:1},
  {id:'builder_100',icon:'\ud83c\udfdb',name:'Architect',desc:'Place 100 blocks',stat:'placed',goal:100},
  {id:'first_craft',icon:'\ud83d\udee0',name:'Crafter Initiate',desc:'Craft an item for the first time',stat:'crafted',goal:1},
  {id:'craft_25',icon:'\ud83c\udfed',name:'Skilled Crafter',desc:'Craft 25 times',stat:'crafted',goal:25},
  {id:'workbench',icon:'\ud83e\udea7',name:'Workbench Debut',desc:'Place and open a crafting table',stat:'workbench',goal:1},
  {id:'tree_chop',icon:'\ud83e\udeb5',name:'Lumberjack',desc:'Collect 10 logs',stat:'wood',goal:10},
  {id:'farmer',icon:'\ud83c\udf3e',name:'Budding Farmer',desc:'Harvest 1 crop',stat:'harvest',goal:1},
  {id:'farmer_30',icon:'\ud83d\ude9c',name:'Bountiful Harvest',desc:'Harvest 30 crops',stat:'harvest',goal:30},
  {id:'gourmet',icon:'\ud83c\udf7d',name:'Gourmet',desc:'Eat 10 times',stat:'eaten',goal:10},
  {id:'hunter',icon:'\ud83c\udf56',name:'Hunter',desc:'Defeat your first animal',stat:'hunt',goal:1},
  {id:'hunter_10',icon:'\ud83d\udcaa',name:'Big Game Hunter',desc:'Defeat 10 animals',stat:'hunt',goal:10},
  {id:'hunter_50',icon:'\ud83c\udff9',name:'Apex Predator',desc:'Defeat 50 animals',stat:'hunt',goal:50},
  // --- New: per-species hunting achievements ---
  {id:'kill_pig',icon:'\ud83d\udc37',name:'Pork Chop',desc:'Defeat a pig',stat:'kill_pig',goal:1},
  {id:'kill_sheep',icon:'\ud83d\udc11',name:'Shear Terror',desc:'Defeat a sheep',stat:'kill_sheep',goal:1},
  {id:'kill_cow',icon:'\ud83d\udc04',name:'Cowboy',desc:'Defeat a cow',stat:'kill_cow',goal:1},
  {id:'kill_chicken',icon:'\ud83d\udc14',name:'Fowl Play',desc:'Defeat a chicken',stat:'kill_chicken',goal:1},
  {id:'zookeeper',icon:'\ud83d\udc3e',name:'Zookeeper',desc:'Defeat every kind of animal',stat:'species_killed',goal:4},
  {id:'tame_wolf',icon:'\ud83d\udc3a',name:'Best Friend',desc:'Tame a wolf with meat',stat:'tame_wolf',goal:1},
  {id:'diamond',icon:'\ud83d\udc8e',name:'Diamonds!',desc:'Mine diamond ore',stat:'diamond',goal:1},
  {id:'obsidian',icon:'\ud83d\udfea',name:'Obsidian Getter',desc:'Obtain obsidian',stat:'obsidian',goal:1},
  {id:'swimmer',icon:'\ud83c\udfca',name:'Swimmer',desc:'Submerge in water',stat:'swim',goal:1},
  {id:'flyer',icon:'\ud83d\udd4a',name:'Creative Mode',desc:'Use fly mode',stat:'fly',goal:1},
  {id:'night',icon:'\ud83c\udf19',name:'Nightfall',desc:'Experience your first night',stat:'night',goal:1},
  // --- New: biome / exploration achievements ---
  {id:'biome_desert',icon:'\ud83c\udfdc',name:'Sandstorm',desc:'Reach the Desert biome',stat:'biome_desert',goal:1},
  {id:'biome_snowy',icon:'\u2744',name:'Cold Front',desc:'Reach the Snowy biome',stat:'biome_snowy',goal:1},
  {id:'biome_mountains',icon:'\u26f0',name:'Summit Seeker',desc:'Reach the Mountains biome',stat:'biome_mountains',goal:1},
  {id:'biome_ocean',icon:'\ud83c\udf0a',name:'Open Water',desc:'Reach the Ocean biome',stat:'biome_ocean',goal:1},
  {id:'biome_jungle',icon:'\ud83c\udf34',name:'Into the Jungle',desc:'Reach the Jungle biome',stat:'biome_jungle',goal:1},
  {id:'biome_swamp',icon:'\ud83d\udc0a',name:'Swamp Thing',desc:'Reach the Swamp biome',stat:'biome_swamp',goal:1},
  {id:'biome_mesa',icon:'\ud83c\udfd4',name:'Painted Cliffs',desc:'Reach the Mesa biome',stat:'biome_mesa',goal:1},
  {id:'biome_volcano',icon:'\ud83c\udf0b',name:'Into the Fire',desc:'Reach the Volcano biome',stat:'biome_volcano',goal:1},
  // --- New: fishing + minecart achievements ---
  {id:'first_fish',icon:'\ud83c\udfa3',name:'\u91e3\u308a\u30c7\u30d3\u30e5\u30fc',desc:'Catch your first fish',stat:'fish',goal:1},
  {id:'angler',icon:'\ud83d\udc1f',name:'Angler',desc:'Catch 20 fish',stat:'fish',goal:20},
  {id:'minecart_ride',icon:'\ud83d\uded2',name:'\u30c8\u30ed\u30c3\u30b3\u4e57\u308a',desc:'Ride a minecart',stat:'minecart',goal:1},
  {id:'globetrotter',icon:'\ud83e\udded',name:'Globetrotter',desc:'Visit 5 different biomes',stat:'biomes_visited',goal:5},
  {id:'explorer_all',icon:'\ud83c\udf0d',name:'World Explorer',desc:'Visit all 10 biomes',stat:'biomes_visited',goal:10},
  // Redstone achievements
  {id:'redstone_lever',icon:'🔴',name:'Power On',desc:'Flip a lever for the first time',stat:'lever_flip',goal:1},
  {id:'redstone_piston',icon:'🟫',name:'Push It',desc:'Activate a piston',stat:'piston_fire',goal:1},
  {id:'redstone_builder',icon:'⚙',name:'Circuit Builder',desc:'Place 10 redstone components',stat:'redstone_placed',goal:10},
];
const isMobile=('ontouchstart'in window)&&/Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac|iPad/i.test(navigator.userAgent));if(isMobile)document.body.classList.add('is-mobile');
// World schema version — bump when dimensions change to invalidate saved data.
const WORLD_VERSION="15-redstone-piston-hopper-observer";
// SEED is resolved per active world (see worlds.js). If no world is active yet
// (home screen showing), fall back to a temporary random seed; it is replaced
// once a world is actually loaded via loadActiveWorld().
let SEED=(Math.random()*2147483646+1)|0;
function loadActiveWorld(){
  if(typeof WORLDS==='undefined'||!WORLDS.hasActive())return false;
  const w=WORLDS.active();
  if(w&&Number.isFinite(w.seed))SEED=w.seed|0;
  // Per-world schema invalidation: if a saved world predates the current
  // WORLD_VERSION, drop its terrain/crops so it regenerates cleanly.
  if(WORLDS.getItem('world_version')!==WORLD_VERSION){
    WORLDS.removeItem('edits');
    WORLDS.removeItem('crops');
    WORLDS.removeItem('player');
    WORLDS.setItem('world_version',WORLD_VERSION);
  }
  return true;
}
