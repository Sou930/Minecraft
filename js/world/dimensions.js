"use strict";
// ===========================================================================
//  DIMENSIONS — Nether / Deep Dark / End
//  Separate world buffers + generation + portal teleport system
// ===========================================================================

// ---- New block IDs (appended after existing B.* range) --------------------
// Nether
B.QUARTZ_ORE         = 261;
B.QUARTZ_BLOCK       = 262;
B.GLOWSTONE          = 263;
B.NETHER_WART_BLOCK  = 264;
B.SOUL_SAND          = 265;
B.MAGMA_BLOCK        = 266;
B.NETHER_PORTAL      = 267;  // portal frame (visual only)

// Deep Dark / Sculk
B.SCULK              = 268;
B.SCULK_VEIN         = 269;
B.SCULK_CATALYST     = 270;
B.SCULK_SHRIEKER     = 271;
B.REINFORCED_DEEPSLATE = 272;

// End
B.END_STONE          = 273;
B.END_STONE_BRICK    = 274;
B.PURPUR_BLOCK       = 275;
B.CHORUS_PLANT       = 276;
B.END_PORTAL         = 277;  // visual only
B.OBSIDIAN_PILLAR    = 278;  // pillar block (same as obsidian but marked)
B.DRAGON_EGG         = 279;

// Shared portal blocks
B.OBSIDIAN_PORTAL_FRAME = 280;  // inert portal frame

// Register new blocks -----------------------------------------
// Note: T.* tiles for new blocks resolve after atlas.js runs.
// We use lazy getters so they pick up the tile IDs defined in config.js T object.
function _dimTile(name,fallback){return (T[name]!==undefined)?T[name]:fallback;}

BLOCKS[B.QUARTZ_ORE]={name:'Nether Quartz Ore',get all(){return _dimTile('QUARTZ_ORE_TILE',T.NETHERRACK);},breakTime:4.0,toolClass:'pickaxe',ore:true,netherOre:true};
BLOCKS[B.QUARTZ_BLOCK]={name:'Quartz Block',get all(){return _dimTile('QUARTZ_BLOCK_TILE',T.SMOOTH_STONE);},breakTime:4.0,toolClass:'pickaxe'};
BLOCKS[B.GLOWSTONE]={name:'Glowstone',get all(){return _dimTile('GLOWSTONE_TILE',T.NETHERRACK);},breakTime:0.3,emissive:true,light:15};
BLOCKS[B.NETHER_WART_BLOCK]={name:'Nether Wart Block',get all(){return _dimTile('NETHER_WART_TILE',T.NETHER_BRICK);},breakTime:1.0};
BLOCKS[B.SOUL_SAND]={name:'Soul Sand',get all(){return _dimTile('SOUL_SAND_TILE',T.GRAVEL);},breakTime:0.75,toolClass:'shovel',soulSand:true};
BLOCKS[B.MAGMA_BLOCK]={name:'Magma Block',get all(){return _dimTile('NETHERRACK_TILE',T.LAVA);},breakTime:2.5,toolClass:'pickaxe',emissive:true,light:3,damage:true};
BLOCKS[B.NETHER_PORTAL]={name:'Nether Portal',get all(){return _dimTile('NETHER_PORTAL_TILE',T.GLASS);},transparent:true,fluid:false,emissive:true,light:11,portal:true,portalDimension:'nether'};

BLOCKS[B.SCULK]={name:'Sculk',get all(){return _dimTile('SCULK_TILE',T.DEEPSLATE);},breakTime:0.6,emissive:true,light:1,sculk:true};
BLOCKS[B.SCULK_VEIN]={name:'Sculk Vein',get all(){return _dimTile('SCULK_VEIN_TILE',T.DEEPSLATE);},transparent:true,flat:true,breakTime:0.2,sculk:true};
BLOCKS[B.SCULK_CATALYST]={name:'Sculk Catalyst',get all(){return _dimTile('SCULK_CATALYST_TILE',T.DEEPSLATE);},breakTime:3.0,emissive:true,light:6,sculk:true};
BLOCKS[B.SCULK_SHRIEKER]={name:'Sculk Shrieker',get all(){return _dimTile('SCULK_SHRIEKER_TILE',T.DEEPSLATE);},breakTime:3.0,sculk:true,shrieker:true};
BLOCKS[B.REINFORCED_DEEPSLATE]={name:'Reinforced Deepslate',all:T.DEEPSLATE,breakTime:55.0,toolClass:'pickaxe',unbreakable:false};

BLOCKS[B.END_STONE]={name:'End Stone',get all(){return _dimTile('END_STONE_TILE',T.SANDSTONE_TOP);},breakTime:3.0,toolClass:'pickaxe'};
BLOCKS[B.END_STONE_BRICK]={name:'End Stone Brick',get all(){return _dimTile('END_STONE_BRICK_TILE',T.SANDSTONE_SIDE);},breakTime:4.0,toolClass:'pickaxe'};
BLOCKS[B.PURPUR_BLOCK]={name:'Purpur Block',get all(){return _dimTile('PURPUR_TILE',T.AMETHYST_BLOCK);},breakTime:6.0,toolClass:'pickaxe'};
BLOCKS[B.CHORUS_PLANT]={name:'Chorus Plant',get all(){return _dimTile('CHORUS_PLANT_TILE',T.LEAVES);},transparent:true,crossPlant:true,breakTime:0.4};
BLOCKS[B.END_PORTAL]={name:'End Portal',get all(){return _dimTile('END_PORTAL_TILE',T.GLASS);},transparent:true,fluid:false,emissive:true,light:15,portal:true,portalDimension:'end',unbreakable:true};
BLOCKS[B.OBSIDIAN_PILLAR]={name:'Obsidian Pillar',all:T.OBSIDIAN,breakTime:45.0};
BLOCKS[B.DRAGON_EGG]={name:'Dragon Egg',get all(){return _dimTile('DRAGON_EGG_TILE',T.AMETHYST_CLUSTER);},breakTime:0.0,dragonEgg:true};
BLOCKS[B.OBSIDIAN_PORTAL_FRAME]={name:'Portal Frame',all:T.OBSIDIAN,breakTime:45.0};

// blockLightEmission for new blocks
const _origBLE=blockLightEmission;
// Patch blockLightEmission to handle new blocks
(function patchBlockLight(){
  const extras={
    [B.GLOWSTONE]:15,
    [B.MAGMA_BLOCK]:3,
    [B.NETHER_PORTAL]:11,
    [B.SCULK_CATALYST]:6,
    [B.SCULK]:1,
    [B.END_PORTAL]:15,
  };
  // Re-wrap
  const orig=blockLightEmission;
  window._dimBLE=function(id){
    if(id in extras)return extras[id];
    return orig(id);
  };
})();

// ===========================================================================
//  DIMENSION STATE
// ===========================================================================
const DIM = {
  OVERWORLD: 0,
  NETHER:    1,
  DEEP_DARK: 2,
  END:       3,
};

let currentDimension = DIM.OVERWORLD;

// Separate world buffers for each dimension
// Each is WORLD_W * WORLD_H * WORLD_D bytes (same grid size)
const netherWorld   = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);
const deepDarkWorld = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);
const endWorld      = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);

// Backup of overworld so we can swap back
// We store a copy (not a reference) so we can restore it.
// The actual copy is populated after world generation completes (see main.js bootstrap).
const overworldWorld = new Uint8Array(WORLD_W * WORLD_H * WORLD_D);

// Saved player positions per dimension
const dimSavedPos = {
  [DIM.OVERWORLD]: null,
  [DIM.NETHER]:    null,
  [DIM.DEEP_DARK]: null,
  [DIM.END]:       null,
};

let netherGenerated   = false;
let deepDarkGenerated = false;
let endGenerated      = false;

// ===========================================================================
//  NETHER GENERATION
// ===========================================================================
function generateNether(){
  if(netherGenerated)return;
  netherGenerated=true;

  const rng=mulberry32((SEED^0xDEADBEEF)>>>0);
  const W=WORLD_W,H=WORLD_H,D=WORLD_D;
  const buf=netherWorld;
  const LAVA_SEA=20; // lava sea level
  const NETHER_CEILING=100;

  // Fill with Netherrack
  for(let y=0;y<H;y++){
    for(let z=0;z<D;z++){
      for(let x=0;x<W;x++){
        const i=blockIndex(x,y,z);
        if(y===0)buf[i]=B.BEDROCK;
        else if(y===1||y===2)buf[i]=(rng()<0.5?B.BEDROCK:B.NETHERRACK);
        else if(y>=NETHER_CEILING-2)buf[i]=B.BEDROCK;
        else if(y>=NETHER_CEILING-6)buf[i]=(rng()<0.6?B.BEDROCK:B.NETHERRACK);
        else buf[i]=B.NETHERRACK;
      }
    }
  }

  // Carve nether caves / open space using 3D noise
  for(let x=0;x<W;x++){
    for(let z=0;z<D;z++){
      for(let y=3;y<NETHER_CEILING-6;y++){
        const cave1=valueNoise3(x/22,y/10,z/22,501);
        const cave2=valueNoise3(x/15,y/8,z/15,503);
        if(cave1>0.52&&cave2>0.50){
          const i=blockIndex(x,y,z);
          buf[i]=y<=LAVA_SEA?B.LAVA:B.AIR;
        }
      }
    }
  }

  // Lava sea floor (fill low cavities with lava)
  for(let x=0;x<W;x++){
    for(let z=0;z<D;z++){
      for(let y=3;y<=LAVA_SEA;y++){
        const i=blockIndex(x,y,z);
        if(buf[i]===B.AIR)buf[i]=B.LAVA;
      }
    }
  }

  // Glowstone clusters on ceiling
  const glowCount=Math.floor((W*D)/2000)+80;
  for(let n=0;n<glowCount;n++){
    const cx=2+Math.floor(rng()*(W-4));
    const cz=2+Math.floor(rng()*(D-4));
    // Find ceiling
    let cy=-1;
    for(let y=NETHER_CEILING-7;y>=LAVA_SEA+4;y--){
      if(buf[blockIndex(cx,y,cz)]===B.NETHERRACK){cy=y;break;}
    }
    if(cy<0)continue;
    // Hang glowstone blob downward
    const blobSize=2+Math.floor(rng()*3);
    for(let dy=0;dy<=blobSize;dy++){
      for(let dx=-1;dx<=1;dx++){
        for(let dz=-1;dz<=1;dz++){
          if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)>2)continue;
          const bx=cx+dx,by=cy-dy,bz2=cz+dz;
          if(bx<0||bx>=W||by<1||by>=H||bz2<0||bz2>=D)continue;
          const bi=blockIndex(bx,by,bz2);
          if(buf[bi]===B.NETHERRACK||buf[bi]===B.AIR){
            buf[bi]=B.GLOWSTONE;
          }
        }
      }
    }
  }

  // Quartz ore veins
  const quartzCount=Math.floor((W*D)/800)+200;
  for(let n=0;n<quartzCount;n++){
    const ox=2+Math.floor(rng()*(W-4));
    const oz=2+Math.floor(rng()*(D-4));
    const oy=LAVA_SEA+2+Math.floor(rng()*(NETHER_CEILING-LAVA_SEA-10));
    for(let dx=-2;dx<=2;dx++){
      for(let dy=-1;dy<=1;dy++){
        for(let dz=-2;dz<=2;dz++){
          if(rng()<0.5)continue;
          const bx=ox+dx,by=oy+dy,bz2=oz+dz;
          if(bx<0||bx>=W||by<1||by>=H||bz2<0||bz2>=D)continue;
          const bi=blockIndex(bx,by,bz2);
          if(buf[bi]===B.NETHERRACK)buf[bi]=B.QUARTZ_ORE;
        }
      }
    }
  }

  // Nether Fortress — one large structure
  _buildNetherFortress(buf, rng, W, H, D);

  // Nether portal arrival position (center of map)
  dimSavedPos[DIM.NETHER]={
    x:W/2, y:LAVA_SEA+10, z:D/2
  };
}

// Build a simple Nether Fortress at a random location
function _buildNetherFortress(buf, rng, W, H, D){
  const fx=Math.floor(W*0.35+rng()*W*0.3);
  const fz=Math.floor(D*0.35+rng()*D*0.3);
  const fy=30; // base height

  const NB=B.NETHER_BRICK;
  const set=(x,y,z,id)=>{
    if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
    buf[blockIndex(x,y,z)]=id;
  };

  // Clear interior space
  for(let dx=-20;dx<=20;dx++){
    for(let dz=-20;dz<=20;dz++){
      for(let dy=0;dy<=12;dy++){
        const bi=blockIndex(fx+dx,fy+dy,fz+dz);
        if(fx+dx<0||fx+dx>=W||fy+dy<0||fy+dy>=H||fz+dz<0||fz+dz>=D)continue;
        buf[bi]=B.AIR;
      }
    }
  }

  // Main bridge hall (along Z axis)
  for(let dz=-18;dz<=18;dz++){
    for(let dx=-4;dx<=4;dx++){
      for(let dy=0;dy<=6;dy++){
        const isWall=(Math.abs(dx)===4||dy===0||dy===6);
        set(fx+dx,fy+dy,fz+dz,isWall?NB:B.AIR);
      }
    }
    // Floor
    for(let dx=-3;dx<=3;dx++) set(fx+dx,fy,fz+dz,NB);
    // Support pillars
    if(dz%6===0){
      for(let dy=-8;dy<=0;dy++) set(fx,fy+dy,fz+dz,NB);
      for(let dy=-8;dy<=0;dy++) set(fx-4,fy+dy,fz+dz,NB);
      for(let dy=-8;dy<=0;dy++) set(fx+4,fy+dy,fz+dz,NB);
    }
  }

  // Cross bridge (along X axis)
  for(let dx=-14;dx<=14;dx++){
    for(let dz2=-3;dz2<=3;dz2++){
      for(let dy=0;dy<=5;dy++){
        const isWall=(Math.abs(dz2)===3||dy===0||dy===5);
        set(fx+dx,fy+dy,fz+dz2,isWall?NB:B.AIR);
      }
    }
    if(dx%6===0){
      for(let dy=-8;dy<=0;dy++) set(fx+dx,fy+dy,fz,NB);
    }
  }

  // Central room
  for(let dx=-7;dx<=7;dx++){
    for(let dz2=-7;dz2<=7;dz2++){
      for(let dy=0;dy<=9;dy++){
        const isWall=(Math.abs(dx)===7||Math.abs(dz2)===7||dy===0||dy===9);
        set(fx+dx,fy+dy,fz+dz2,isWall?NB:B.AIR);
      }
    }
  }

  // Chest with loot in the central room
  set(fx+3,fy+1,fz+3,B.CHEST_BLOCK);
  set(fx-3,fy+1,fz-3,B.CHEST_BLOCK);

  // Torches along bridge
  for(let dz=-14;dz<=14;dz+=6){
    set(fx+4,fy+4,fz+dz,B.TORCH);
    set(fx-4,fy+4,fz+dz,B.TORCH);
  }
}

// ===========================================================================
//  DEEP DARK GENERATION
// ===========================================================================
function generateDeepDark(){
  if(deepDarkGenerated)return;
  deepDarkGenerated=true;

  const rng=mulberry32((SEED^0xAB3D1234)>>>0);
  const W=WORLD_W,H=WORLD_H,D=WORLD_D;
  const buf=deepDarkWorld;
  const FLOOR_Y=8;
  const CEILING_Y=72;

  // Fill everything with deepslate
  for(let i=0;i<buf.length;i++) buf[i]=B.DEEPSLATE;

  // Bedrock floor/ceiling
  for(let x=0;x<W;x++) for(let z=0;z<D;z++){
    buf[blockIndex(x,0,z)]=B.BEDROCK;
    buf[blockIndex(x,1,z)]=B.BEDROCK;
    for(let y=CEILING_Y;y<H;y++) buf[blockIndex(x,y,z)]=B.BEDROCK;
  }

  // Carve large cave chambers
  for(let x=0;x<W;x++){
    for(let z=0;z<D;z++){
      for(let y=FLOOR_Y;y<CEILING_Y;y++){
        const cave=valueNoise3(x/28,y/12,z/28,601);
        const cave2=valueNoise3(x/18,y/9,z/18,603);
        if(cave>0.48&&cave2>0.46){
          buf[blockIndex(x,y,z)]=B.AIR;
        }
      }
    }
  }

  // Sculk carpet on floors and walls (after carving)
  for(let x=1;x<W-1;x++){
    for(let z=1;z<D-1;z++){
      for(let y=FLOOR_Y;y<CEILING_Y-1;y++){
        const i=blockIndex(x,y,z);
        if(buf[i]!==B.AIR)continue;
        // Check if there is solid below
        const below=buf[blockIndex(x,y-1,z)];
        if(below===B.DEEPSLATE||below===B.SCULK){
          const sculkN=valueNoise3(x/15,y/5,z/15,605);
          if(sculkN>0.45)buf[blockIndex(x,y-1,z)]=B.SCULK;
          if(sculkN>0.60&&rng()<0.15)buf[blockIndex(x,y,z)]=B.SCULK_VEIN;
        }
      }
    }
  }

  // Sculk catalysts and shriekers (scattered)
  const catalystCount=Math.floor((W*D)/18000)+20;
  for(let n=0;n<catalystCount;n++){
    const cx=4+Math.floor(rng()<catalystCount?rng()*W:rng()*(W-8));
    const cz=4+Math.floor(rng()*(D-8));
    let cy=-1;
    for(let y=FLOOR_Y+1;y<CEILING_Y;y++){
      if(buf[blockIndex(cx,y,cz)]===B.AIR&&buf[blockIndex(cx,y-1,cz)]!==B.AIR){cy=y;break;}
    }
    if(cy<0)continue;
    buf[blockIndex(cx,cy-1,cz)]=B.SCULK;
    buf[blockIndex(cx,cy,cz)]=B.SCULK_CATALYST;
    if(rng()<0.35&&cy+1<CEILING_Y)buf[blockIndex(cx,cy+1,cz)]=B.SCULK_SHRIEKER;
  }

  // Ancient City
  _buildAncientCity(buf, rng, W, H, D, FLOOR_Y, CEILING_Y);
}

// Build the Ancient City structure
function _buildAncientCity(buf, rng, W, H, D, FLOOR_Y, CEILING_Y){
  const cx=Math.floor(W/2)+Math.floor((rng()-0.5)*W*0.2);
  const cz=Math.floor(D/2)+Math.floor((rng()-0.5)*D*0.2);
  const cy=FLOOR_Y+4;

  const set=(x,y,z,id)=>{
    if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
    buf[blockIndex(x,y,z)]=id;
  };

  const DS=B.DEEPSLATE;
  const RD=B.REINFORCED_DEEPSLATE;
  const SC=B.SCULK;

  // Clear city area
  for(let dx=-30;dx<=30;dx++){
    for(let dz2=-30;dz2<=30;dz2++){
      for(let dy=-2;dy<=20;dy++){
        const x=cx+dx,y=cy+dy,z=cz+dz2;
        if(x<0||x>=W||y<0||y>=H||z<0||z>=D)continue;
        buf[blockIndex(x,y,z)]=B.AIR;
      }
    }
  }

  // Floor
  for(let dx=-28;dx<=28;dx++){
    for(let dz2=-28;dz2<=28;dz2++){
      set(cx+dx,cy-1,cz+dz2,SC);
      set(cx+dx,cy-2,cz+dz2,DS);
    }
  }

  // Outer walls
  for(let dx=-28;dx<=28;dx++){
    for(let dy=0;dy<=12;dy++){
      set(cx+dx,cy+dy,cz-28,DS);
      set(cx+dx,cy+dy,cz+28,DS);
    }
  }
  for(let dz2=-28;dz2<=28;dz2++){
    for(let dy=0;dy<=12;dy++){
      set(cx-28,cy+dy,cz+dz2,DS);
      set(cx+28,cy+dy,cz+dz2,DS);
    }
  }

  // Central altar (reinforced deepslate)
  for(let dx=-5;dx<=5;dx++){
    for(let dz2=-5;dz2<=5;dz2++){
      for(let dy=0;dy<=3;dy++){
        const isShell=(Math.abs(dx)===5||Math.abs(dz2)===5||dy===0||dy===3);
        set(cx+dx,cy+dy,cz+dz2,isShell?RD:B.AIR);
      }
    }
  }
  // Chest on top of altar
  set(cx,cy+4,cz,B.CHEST_BLOCK);

  // Pillars around altar
  const pillarPositions=[[-10,-10],[-10,10],[10,-10],[10,10],[-16,0],[16,0],[0,-16],[0,16]];
  for(const[px,pz] of pillarPositions){
    for(let dy=0;dy<=10;dy++) set(cx+px,cy+dy,cz+pz,DS);
    // Soul lantern on top (use lantern as glow)
    set(cx+px,cy+11,cz+pz,B.LANTERN);
  }

  // Streets with sculk
  for(let dz2=-25;dz2<=25;dz2++){
    for(let dx=-3;dx<=3;dx++){
      set(cx+dx,cy-1,cz+dz2,SC);
    }
  }
  for(let dx=-25;dx<=25;dx++){
    for(let dz2=-3;dz2<=3;dz2++){
      set(cx+dx,cy-1,cz+dz2,SC);
    }
  }

  // Shriekers on streets
  for(let n=0;n<8;n++){
    const sx=cx+Math.floor((rng()-0.5)*50);
    const sz=cz+Math.floor((rng()-0.5)*50);
    set(sx,cy,sz,B.SCULK_SHRIEKER);
  }

  // Interior deepslate houses
  const houseOffsets=[[-16,-16],[16,-16],[-16,16],[16,16]];
  for(const[hx,hz] of houseOffsets){
    for(let dx=-4;dx<=4;dx++){
      for(let dz2=-4;dz2<=4;dz2++){
        for(let dy=0;dy<=5;dy++){
          const isShell=(Math.abs(dx)===4||Math.abs(dz2)===4||dy===0||dy===5);
          set(cx+hx+dx,cy+dy,cz+hz+dz2,isShell?DS:B.AIR);
        }
      }
    }
    // Door opening
    set(cx+hx,cy+1,cz+hz-4,B.AIR);
    set(cx+hx,cy+2,cz+hz-4,B.AIR);
    // Chest inside
    set(cx+hx+2,cy+1,cz+hz+2,B.CHEST_BLOCK);
  }
}

// ===========================================================================
//  END GENERATION
// ===========================================================================
function generateEnd(){
  if(endGenerated)return;
  endGenerated=true;

  const rng=mulberry32((SEED^0xE0DD1234)>>>0);
  const W=WORLD_W,H=WORLD_H,D=WORLD_D;
  const buf=endWorld;
  const VOID_Y=40; // main island surface

  // Start with all void (air)
  buf.fill(B.AIR);

  const set=(x,y,z,id)=>{
    if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
    buf[blockIndex(x,y,z)]=id;
  };

  // ---- Main Central Island ----
  const cx=Math.floor(W/2);
  const cz=Math.floor(D/2);
  _buildEndIsland(buf,rng,W,H,D,cx,cz,VOID_Y,55,true);

  // ---- Obsidian Pillars (10 pillars in a circle) ----
  const PILLAR_COUNT=10;
  const PILLAR_RADIUS=40;
  const pillarHeights=[50,58,54,62,56,48,60,52,58,54];
  const crystalPositions=[];
  for(let p=0;p<PILLAR_COUNT;p++){
    const angle=(p/PILLAR_COUNT)*Math.PI*2;
    const px=Math.floor(cx+Math.cos(angle)*PILLAR_RADIUS);
    const pz=Math.floor(cz+Math.sin(angle)*PILLAR_RADIUS);
    const ph=pillarHeights[p];
    // Build obsidian pillar
    for(let y=VOID_Y-2;y<=VOID_Y+ph;y++){
      for(let dx=-2;dx<=2;dx++){
        for(let dz2=-2;dz2<=2;dz2++){
          if(dx*dx+dz2*dz2>6)continue;
          set(px+dx,y,pz+dz2,B.OBSIDIAN);
        }
      }
    }
    // Ender Crystal on top (use AMETHYST_CLUSTER as glow placeholder)
    set(px,VOID_Y+ph+1,pz,B.AMETHYST_CLUSTER);
    crystalPositions.push({x:px,y:VOID_Y+ph+1,z:pz});
    // Iron cage around some crystals
    if(p%3===0){
      const chy=VOID_Y+ph;
      for(let dx=-2;dx<=2;dx++) set(px+dx,chy+2,pz-2,B.IRON_BARS);
      for(let dx=-2;dx<=2;dx++) set(px+dx,chy+2,pz+2,B.IRON_BARS);
      for(let dz2=-2;dz2<=2;dz2++) set(px-2,chy+2,pz+dz2,B.IRON_BARS);
      for(let dz2=-2;dz2<=2;dz2++) set(px+2,chy+2,pz+dz2,B.IRON_BARS);
    }
  }

  // ---- Dragon perch / End portal structure ----
  // Central fountain with End Portal blocks
  const portalY=VOID_Y+1;
  for(let dx=-4;dx<=4;dx++){
    for(let dz2=-4;dz2<=4;dz2++){
      if(Math.abs(dx)+Math.abs(dz2)===5){
        set(cx+dx,portalY,cz+dz2,B.END_STONE_BRICK);
        for(let dy=1;dy<=2;dy++) set(cx+dx,portalY+dy,cz+dz2,B.END_STONE_BRICK);
      }
    }
  }
  // End portal in the center
  for(let dx=-2;dx<=2;dx++){
    for(let dz2=-2;dz2<=2;dz2++){
      set(cx+dx,portalY,cz+dz2,B.END_PORTAL);
    }
  }
  // Dragon Egg on top of a pedestal
  for(let dy=0;dy<=2;dy++) set(cx,portalY+dy,cz,B.END_STONE_BRICK);
  set(cx,portalY+3,cz,B.DRAGON_EGG);

  // ---- Outer End Islands (smaller floating islands) ----
  const OUTER_ISLAND_COUNT=12;
  const OUTER_MIN_DIST=200;
  const OUTER_MAX_DIST=Math.min(W,D)/2-50;
  for(let n=0;n<OUTER_ISLAND_COUNT;n++){
    const angle=rng()*Math.PI*2;
    const dist=OUTER_MIN_DIST+rng()*(OUTER_MAX_DIST-OUTER_MIN_DIST);
    const ix=Math.floor(cx+Math.cos(angle)*dist);
    const iz=Math.floor(cz+Math.sin(angle)*dist);
    const iy=VOID_Y-5+Math.floor(rng()*20);
    const irad=15+Math.floor(rng()*25);
    if(ix<irad||ix>=W-irad||iz<irad||iz>=D-irad)continue;
    _buildEndIsland(buf,rng,W,H,D,ix,iz,iy,irad,false);
    // Chorus plants on outer islands
    _placeChorusPlants(buf,rng,W,H,D,ix,iz,iy,irad);
  }
}

// Build a floating End island (ellipsoid of end stone)
function _buildEndIsland(buf,rng,W,H,D,cx,cz,cy,radius,isMain){
  const set=(x,y,z,id)=>{
    if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
    buf[blockIndex(x,y,z)]=id;
  };

  const ry=Math.floor(radius*0.4);
  for(let dx=-radius;dx<=radius;dx++){
    for(let dz2=-radius;dz2<=radius;dz2++){
      for(let dy=-ry;dy<=ry;dy++){
        const wobble=valueNoise3((cx+dx)/20,(cy+dy)/10,(cz+dz2)/20,701)*0.3;
        const dist=(dx*dx)/(radius*radius)+(dz2*dz2)/(radius*radius)+(dy*dy)/(ry*ry);
        if(dist<=1+wobble-0.1){
          const id=(dy===ry||(dy===ry-1&&valueNoise3((cx+dx)/8,(cz+dz2)/8,0,703)>0.4))
            ?B.END_STONE:B.END_STONE;
          set(cx+dx,cy+dy,cz+dz2,id);
        }
      }
    }
  }
  // Top layer: end stone
  for(let dx=-radius+2;dx<=radius-2;dx++){
    for(let dz2=-radius+2;dz2<=radius-2;dz2++){
      const d2=dx*dx+dz2*dz2;
      if(d2>(radius-2)*(radius-2))continue;
      set(cx+dx,cy+ry,cz+dz2,B.END_STONE);
    }
  }
}

// Place Chorus Plants on an outer island
function _placeChorusPlants(buf,rng,W,H,D,cx,cz,cy,radius){
  const set=(x,y,z,id)=>{
    if(x<0||x>=W||y<0||y>=H||z<0||z>=D)return;
    buf[blockIndex(x,y,z)]=id;
  };

  const topY=cy+Math.floor(radius*0.4);
  const count=4+Math.floor(rng()*8);
  for(let n=0;n<count;n++){
    const dx=Math.floor((rng()-0.5)*radius*1.4);
    const dz=Math.floor((rng()-0.5)*radius*1.4);
    if(dx*dx+dz*dz>(radius-2)*(radius-2))continue;
    const px=cx+dx, pz=cz+dz;
    if(px<0||px>=W||pz<0||pz>=D)continue;
    const base=buf[blockIndex(px,topY,pz)];
    if(base!==B.END_STONE&&base!==B.AIR)continue;
    if(buf[blockIndex(px,topY,pz)]!==B.END_STONE)continue;
    // Grow chorus
    const height=2+Math.floor(rng()*5);
    for(let dy=1;dy<=height;dy++){
      set(px,topY+dy,pz,B.CHORUS_PLANT);
      if(dy>1&&rng()<0.4){
        const bx=px+(rng()<0.5?-1:1);
        set(bx,topY+dy,pz,B.CHORUS_PLANT);
      }
      if(dy>1&&rng()<0.4){
        const bz=pz+(rng()<0.5?-1:1);
        set(px,topY+dy,bz,B.CHORUS_PLANT);
      }
    }
  }
}

// ===========================================================================
//  DIMENSION PORTAL SYSTEM
// ===========================================================================

// Obsidian portal frames (for nether portals) — tracked positions
const netherPortalFrames=[];   // {x,y,z} of bottom-left corner
let portalCooldown=0;          // seconds before teleport fires again

// Called every frame
function updateDimensionPortals(dt){
  if(portalCooldown>0){portalCooldown-=dt;return;}
  if(!worldReady||!started||player.dead)return;

  const px=Math.floor(player.pos.x);
  const py=Math.floor(player.pos.y);
  const pz=Math.floor(player.pos.z);

  // Check block player is standing in
  const blk=getBlock(px,py,pz);
  const blk2=getBlock(px,py+1,pz);

  if((blk===B.NETHER_PORTAL||blk2===B.NETHER_PORTAL)&&(currentDimension===DIM.OVERWORLD||currentDimension===DIM.NETHER)){
    portalCooldown=3;
    _teleportTo(currentDimension===DIM.OVERWORLD?DIM.NETHER:DIM.OVERWORLD);
    return;
  }

  if((blk===B.END_PORTAL||blk2===B.END_PORTAL)&&(currentDimension===DIM.OVERWORLD||currentDimension===DIM.END)){
    portalCooldown=3;
    _teleportTo(currentDimension===DIM.OVERWORLD?DIM.END:DIM.OVERWORLD);
    return;
  }

  // Deep Dark: no portal, it's reached via special staircase (simulated as chest loot trigger)
}

// Teleport player to a dimension
function _teleportTo(dim){
  // Save current position
  dimSavedPos[currentDimension]={x:player.pos.x,y:player.pos.y,z:player.pos.z};

  // Swap world buffer
  _swapWorldTo(dim);

  // Place player
  const sp=dimSavedPos[dim];
  if(sp){
    player.pos.x=sp.x;
    player.pos.y=sp.y;
    player.pos.z=sp.z;
  } else {
    // Default spawn
    if(dim===DIM.NETHER){
      player.pos.x=WORLD_W/2;
      player.pos.y=35;
      player.pos.z=WORLD_D/2;
    } else if(dim===DIM.END){
      player.pos.x=WORLD_W/2;
      player.pos.y=55;
      player.pos.z=WORLD_D/2;
    } else if(dim===DIM.DEEP_DARK){
      player.pos.x=WORLD_W/2;
      player.pos.y=25;
      player.pos.z=WORLD_D/2;
    }
  }

  player.vel.x=0;player.vel.y=0;player.vel.z=0;
  player.onGround=false;

  // Show dimension notification
  _showDimNotification(dim);

  // Force full chunk rebuild
  if(typeof invalidateAllChunks==='function')invalidateAllChunks();

  currentDimension=dim;

  // Update sky/fog for dimension
  _applyDimensionSky(dim);
}

// Swap the live world buffer
function _swapWorldTo(dim){
  let src;
  switch(dim){
    case DIM.NETHER:
      if(!netherGenerated)generateNether();
      src=netherWorld; break;
    case DIM.DEEP_DARK:
      if(!deepDarkGenerated)generateDeepDark();
      src=deepDarkWorld; break;
    case DIM.END:
      if(!endGenerated)generateEnd();
      src=endWorld; break;
    default: // DIM.OVERWORLD
      src=overworldWorld;
  }
  // Copy src into the live world array (world is the UInt8Array used by render)
  if(src!==world)world.set(src);
}

// Apply sky colour / fog per dimension
function _applyDimensionSky(dim){
  if(typeof scene==='undefined')return;
  if(dim===DIM.NETHER){
    scene.clearColor=new BABYLON.Color4(0.18,0.05,0.02,1);
    scene.fogColor=new BABYLON.Color3(0.22,0.06,0.02);
    scene.fogDensity=0.012;
    if(typeof sunLight!=='undefined')sunLight.intensity=0;
    if(typeof hemiLight!=='undefined'){hemiLight.intensity=0.5;hemiLight.diffuse=new BABYLON.Color3(0.9,0.3,0.1);}
  } else if(dim===DIM.DEEP_DARK){
    scene.clearColor=new BABYLON.Color4(0.02,0.02,0.04,1);
    scene.fogColor=new BABYLON.Color3(0.02,0.02,0.04);
    scene.fogDensity=0.018;
    if(typeof sunLight!=='undefined')sunLight.intensity=0;
    if(typeof hemiLight!=='undefined'){hemiLight.intensity=0.2;hemiLight.diffuse=new BABYLON.Color3(0.1,0.3,0.5);}
  } else if(dim===DIM.END){
    scene.clearColor=new BABYLON.Color4(0.04,0.02,0.06,1);
    scene.fogColor=new BABYLON.Color3(0.04,0.02,0.06);
    scene.fogDensity=0.008;
    if(typeof sunLight!=='undefined')sunLight.intensity=0.3;
    if(typeof hemiLight!=='undefined'){hemiLight.intensity=0.6;hemiLight.diffuse=new BABYLON.Color3(0.6,0.4,0.9);}
  } else {
    // Overworld — restore defaults
    scene.fogDensity=0.0;
    if(typeof sunLight!=='undefined')sunLight.intensity=0.55;
    if(typeof hemiLight!=='undefined'){hemiLight.intensity=0.92;hemiLight.diffuse=new BABYLON.Color3(1,1,1);}
  }
}

// Show dimension name toast
function _showDimNotification(dim){
  const names={
    [DIM.OVERWORLD]:'🌍 Overworld',
    [DIM.NETHER]:   '🔥 The Nether',
    [DIM.DEEP_DARK]:'💀 Deep Dark',
    [DIM.END]:      '🐉 The End',
  };
  const el=document.getElementById('tool-break-msg');
  if(!el)return;
  el.textContent=`Entering ${names[dim]||'Unknown'}…`;
  el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>{el.style.opacity='0';},3000);
}

// ===========================================================================
//  NETHER PORTAL BUILDER
//  Player builds an obsidian frame (4×5) and uses flint & steel to ignite it.
//  We detect the frame and fill it with NETHER_PORTAL blocks.
// ===========================================================================
function tryIgniteNetherPortal(x,y,z){
  // Try to find a valid 4-wide × 5-tall obsidian frame surrounding (x,y,z)
  const dirs=[[1,0],[0,1]]; // try both orientations
  for(const[dx,dz] of dirs){
    for(let ox=0;ox<=3;ox++){
      for(let oy=0;oy<=4;oy++){
        // Try frame anchored at (x-dx*ox, y-oy, z-dz*ox)
        const bx=x-dx*ox, by=y-oy, bz=z-dz*ox;
        if(_isValidPortalFrame(bx,by,bz,dx,dz)){
          _fillPortal(bx,by,bz,dx,dz);
          // Also build a corresponding portal in the nether if not yet generated
          if(!netherGenerated)generateNether();
          // Place arrival portal in nether
          _ensureNetherArrivalPortal();
          showFloatingText(x,y+2,z,'🔥 Nether Portal ignited!');
          if(typeof ACH!=='undefined')ACH.flag('nether_portal');
          return true;
        }
      }
    }
  }
  return false;
}

function _isValidPortalFrame(bx,by,bz,dx,dz){
  // Frame: obsidian border of 4 wide × 5 tall
  // Interior: 2 wide × 3 tall
  for(let ox=0;ox<=3;ox++){
    for(let oy=0;oy<=4;oy++){
      const isEdge=(ox===0||ox===3||oy===0||oy===4);
      if(!isEdge)continue; // only check frame
      const fx=bx+dx*ox, fy=by+oy, fz=bz+dz*ox;
      if(getBlock(fx,fy,fz)!==B.OBSIDIAN)return false;
    }
  }
  return true;
}

function _fillPortal(bx,by,bz,dx,dz){
  for(let ox=1;ox<=2;ox++){
    for(let oy=1;oy<=3;oy++){
      const fx=bx+dx*ox, fy=by+oy, fz=bz+dz*ox;
      if(getBlock(fx,fy,fz)===B.AIR){
        world[blockIndex(fx,fy,fz)]=B.NETHER_PORTAL;
        // Also mark in overworld buffer
        overworldWorld[blockIndex(fx,fy,fz)]=B.NETHER_PORTAL;
        netherPortalFrames.push({x:fx,y:fy,z:fz});
      }
    }
  }
  if(typeof invalidateChunkAt==='function'){
    invalidateChunkAt(bx,by,bz);
    invalidateChunkAt(bx+dx*3,by+4,bz+dz*3);
  }
}

function _ensureNetherArrivalPortal(){
  // Place a matching portal structure in the nether world buffer
  const nx=Math.floor(WORLD_W/2);
  const nz=Math.floor(WORLD_D/2);
  const ny=32;
  // Clear space
  for(let dx=0;dx<=3;dx++) for(let dy=0;dy<=4;dy++) for(let dz=0;dz<=1;dz++){
    const i=blockIndex(nx+dx,ny+dy,nz+dz);
    if(nx+dx<WORLD_W&&ny+dy<WORLD_H&&nz+dz<WORLD_D) netherWorld[i]=B.AIR;
  }
  // Obsidian frame
  for(let dx=0;dx<=3;dx++){
    netherWorld[blockIndex(nx+dx,ny,nz)]=B.OBSIDIAN;
    netherWorld[blockIndex(nx+dx,ny+4,nz)]=B.OBSIDIAN;
  }
  for(let dy=0;dy<=4;dy++){
    netherWorld[blockIndex(nx,ny+dy,nz)]=B.OBSIDIAN;
    netherWorld[blockIndex(nx+3,ny+dy,nz)]=B.OBSIDIAN;
  }
  // Portal interior
  for(let dx=1;dx<=2;dx++) for(let dy=1;dy<=3;dy++){
    netherWorld[blockIndex(nx+dx,ny+dy,nz)]=B.NETHER_PORTAL;
  }
  // Floor
  for(let dx=-1;dx<=4;dx++) for(let dz=-1;dz<=2;dz++){
    const i=blockIndex(nx+dx,ny-1,nz+dz);
    if(nx+dx>=0&&nx+dx<WORLD_W&&nz+dz>=0&&nz+dz<WORLD_D) netherWorld[i]=B.NETHERRACK;
  }
}

// ===========================================================================
//  DEEP DARK ACCESS — via special staircase that appears in deep cave areas
//  When the player is below Y=8 in the overworld and finds a beacon loot block,
//  they can "activate" it to enter the Deep Dark.
// ===========================================================================
function tryEnterDeepDark(x,y,z){
  if(currentDimension!==DIM.OVERWORLD)return false;
  if(y>12)return false; // only near bedrock
  const blk=getBlock(x,y,z);
  if(blk!==B.AMETHYST_CLUSTER&&blk!==B.SCULK)return false; // use sculk/amethyst as trigger
  if(!deepDarkGenerated)generateDeepDark();
  portalCooldown=3;
  _teleportTo(DIM.DEEP_DARK);
  showFloatingText(x,y+2,z,'💀 Entering Deep Dark…');
  return true;
}

// ===========================================================================
//  WARDEN — Hostile mob triggered by Sculk Shrieker in Deep Dark
// ===========================================================================
let wardenAlertLevel=0;   // 0-3; reaches 3 → warden spawns
let wardenAlertTimer=0;
let wardenActive=false;
let wardenPos={x:0,y:0,z:0};
let wardenHP=500;
let wardenAttackTimer=0;

function updateWarden(dt){
  if(currentDimension!==DIM.DEEP_DARK)return;

  // Alert level decays over time
  if(wardenAlertTimer>0){wardenAlertTimer-=dt;}else if(wardenAlertLevel>0&&!wardenActive){wardenAlertLevel=Math.max(0,wardenAlertLevel-0.05*dt);}

  if(!wardenActive)return;

  // Move warden toward player
  const dx=player.pos.x-wardenPos.x;
  const dy=player.pos.y-wardenPos.y;
  const dz=player.pos.z-wardenPos.z;
  const dist=Math.hypot(dx,dy,dz);
  if(dist>1.5){
    const spd=2.5*dt;
    wardenPos.x+=dx/dist*spd;
    wardenPos.y+=dy/dist*spd*0.5;
    wardenPos.z+=dz/dist*spd;
  }

  // Warden sonic attack at range
  wardenAttackTimer+=dt;
  if(wardenAttackTimer>=3.0&&dist<30){
    wardenAttackTimer=0;
    if(typeof damage==='function')damage(8,'warden');
    showFloatingText(wardenPos.x,wardenPos.y+2,wardenPos.z,'💀 Warden shriek!');
  }

  // Melee attack
  if(dist<2.5&&wardenAttackTimer<-0.5){
    wardenAttackTimer=3;
    if(typeof damage==='function')damage(22,'warden');
  }

  // Render warden as big dark mesh (handled in a separate pass if render supports it)
  _renderWarden();
}

function alertWarden(){
  if(currentDimension!==DIM.DEEP_DARK)return;
  wardenAlertLevel++;
  wardenAlertTimer=10;
  showFloatingText(player.pos.x,player.pos.y+2,player.pos.z,
    `💀 Alert level: ${Math.floor(wardenAlertLevel)}/3`);
  if(wardenAlertLevel>=3&&!wardenActive){
    wardenActive=true;
    wardenHP=500;
    wardenPos={x:player.pos.x+10,y:player.pos.y,z:player.pos.z+10};
    showFloatingText(player.pos.x,player.pos.y+3,player.pos.z,'⚠️ WARDEN has spawned!');
    if(typeof ACH!=='undefined')ACH.flag('deep_dark_warden');
  }
}

let _wardenMesh=null;
function _renderWarden(){
  if(!wardenActive||typeof scene==='undefined')return;
  if(!_wardenMesh){
    _wardenMesh=BABYLON.MeshBuilder.CreateBox('warden',{width:1.4,height:3.0,depth:1.0},scene);
    const mat=new BABYLON.StandardMaterial('wardenMat',scene);
    mat.diffuseColor=new BABYLON.Color3(0.05,0.15,0.18);
    mat.emissiveColor=new BABYLON.Color3(0.0,0.3,0.4);
    _wardenMesh.material=mat;
  }
  _wardenMesh.position.set(wardenPos.x+0.5,wardenPos.y+1.5,wardenPos.z+0.5);
  _wardenMesh.setEnabled(true);
}

function damageWarden(amount){
  if(!wardenActive)return;
  wardenHP-=amount;
  showFloatingText(wardenPos.x,wardenPos.y+3,wardenPos.z,`Warden HP: ${wardenHP}`);
  if(wardenHP<=0){
    wardenActive=false;
    wardenAlertLevel=0;
    if(_wardenMesh)_wardenMesh.setEnabled(false);
    showFloatingText(wardenPos.x,wardenPos.y+4,wardenPos.z,'💀 Warden defeated!');
    if(typeof ACH!=='undefined')ACH.flag('warden_defeated');
    // Drop sculk catalyst + rare items
    if(typeof giveItem!=='undefined'){
      giveItem(B.SCULK_CATALYST,1);
      giveItem(B.REINFORCED_DEEPSLATE,2);
    }
  }
}

// ===========================================================================
//  ENDER DRAGON BOSS
// ===========================================================================
let dragonActive=false;
let dragonHP=200;
let dragonPos={x:WORLD_W/2,y:70,z:WORLD_D/2};
let dragonVel={x:0,y:0,z:0};
let dragonPhase=0; // 0=circling, 1=attacking, 2=landing
let dragonTimer=0;
let dragonAttackTimer=0;
let _dragonMesh=null;
let _dragonDefeated=false;

function initDragonIfNeeded(){
  if(currentDimension!==DIM.END||_dragonDefeated)return;
  if(!dragonActive){
    dragonActive=true;
    dragonHP=200;
    dragonPos={x:WORLD_W/2+30,y:72,z:WORLD_D/2};
    dragonVel={x:0,y:0,z:0};
    dragonPhase=0;
    dragonTimer=0;
    showFloatingText(player.pos.x,player.pos.y+4,player.pos.z,'🐉 Ender Dragon awakens!');
  }
}

function updateDragon(dt){
  if(!dragonActive||currentDimension!==DIM.END)return;

  dragonTimer+=dt;
  dragonAttackTimer+=dt;

  const cx=WORLD_W/2, cy=60, cz=WORLD_D/2;
  const dx=player.pos.x-dragonPos.x;
  const dy=player.pos.y-dragonPos.y;
  const dz=player.pos.z-dragonPos.z;
  const distToPlayer=Math.hypot(dx,dy,dz);

  if(dragonPhase===0){
    // Circle around center
    const angle=dragonTimer*0.4;
    const radius=45+Math.sin(dragonTimer*0.2)*10;
    const tx=cx+Math.cos(angle)*radius;
    const tz=cz+Math.sin(angle)*radius;
    const ty=cy+Math.sin(dragonTimer*0.3)*8;
    dragonVel.x+=(tx-dragonPos.x)*dt*0.8;
    dragonVel.y+=(ty-dragonPos.y)*dt*0.8;
    dragonVel.z+=(tz-dragonPos.z)*dt*0.8;
    dragonVel.x*=0.92;dragonVel.y*=0.92;dragonVel.z*=0.92;
    dragonPos.x+=dragonVel.x*dt;
    dragonPos.y+=dragonVel.y*dt;
    dragonPos.z+=dragonVel.z*dt;

    // Switch to attack every 12s
    if(dragonTimer>12){dragonTimer=0;dragonPhase=1;}
  } else if(dragonPhase===1){
    // Dive toward player
    const spd=18;
    dragonPos.x+=dx/distToPlayer*spd*dt;
    dragonPos.y+=dy/distToPlayer*spd*dt;
    dragonPos.z+=dz/distToPlayer*spd*dt;
    if(distToPlayer<6){
      if(typeof damage==='function')damage(15,'dragon');
      showFloatingText(dragonPos.x,dragonPos.y+2,dragonPos.z,'🔥 Dragon breath!');
      dragonPhase=0;dragonTimer=0;
    }
    if(dragonTimer>8){dragonPhase=0;dragonTimer=0;}
  }

  // Dragon breath attack at range
  if(dragonAttackTimer>8&&distToPlayer<40){
    dragonAttackTimer=0;
    if(typeof damage==='function')damage(7,'dragonBreath');
    showFloatingText(dragonPos.x,dragonPos.y+3,dragonPos.z,'💜 Dragon Breath!');
  }

  _renderDragon();
}

let _dragonMeshBody=null,_dragonMeshWing1=null,_dragonMeshWing2=null;
function _renderDragon(){
  if(typeof scene==='undefined')return;
  if(!_dragonMeshBody){
    const mat=new BABYLON.StandardMaterial('dragonMat',scene);
    mat.diffuseColor=new BABYLON.Color3(0.1,0.02,0.15);
    mat.emissiveColor=new BABYLON.Color3(0.15,0.0,0.25);

    _dragonMeshBody=BABYLON.MeshBuilder.CreateBox('dragonBody',{width:3,height:2,depth:6},scene);
    _dragonMeshBody.material=mat;

    const wingMat=new BABYLON.StandardMaterial('dragonWingMat',scene);
    wingMat.diffuseColor=new BABYLON.Color3(0.08,0.01,0.12);
    wingMat.emissiveColor=new BABYLON.Color3(0.1,0,0.2);
    wingMat.backFaceCulling=false;

    _dragonMeshWing1=BABYLON.MeshBuilder.CreateBox('dragonW1',{width:8,height:0.3,depth:4},scene);
    _dragonMeshWing1.material=wingMat;
    _dragonMeshWing2=BABYLON.MeshBuilder.CreateBox('dragonW2',{width:8,height:0.3,depth:4},scene);
    _dragonMeshWing2.material=wingMat;
  }
  const t=Date.now()/1000;
  const wingFlap=Math.sin(t*3)*0.4;
  _dragonMeshBody.position.set(dragonPos.x,dragonPos.y,dragonPos.z);
  _dragonMeshWing1.position.set(dragonPos.x-6,dragonPos.y+wingFlap,dragonPos.z);
  _dragonMeshWing2.position.set(dragonPos.x+6,dragonPos.y-wingFlap,dragonPos.z);
  _dragonMeshBody.setEnabled(true);
  _dragonMeshWing1.setEnabled(true);
  _dragonMeshWing2.setEnabled(true);
}

function damageDragon(amount){
  if(!dragonActive)return;
  dragonHP-=amount;
  showFloatingText(dragonPos.x,dragonPos.y+4,dragonPos.z,
    `🐉 Dragon HP: ${Math.max(0,dragonHP)}`);
  if(dragonHP<=0){
    dragonActive=false;
    _dragonDefeated=true;
    if(_dragonMeshBody)_dragonMeshBody.setEnabled(false);
    if(_dragonMeshWing1)_dragonMeshWing1.setEnabled(false);
    if(_dragonMeshWing2)_dragonMeshWing2.setEnabled(false);
    showFloatingText(dragonPos.x,dragonPos.y+5,dragonPos.z,'🐉 Ender Dragon defeated!');
    if(typeof ACH!=='undefined')ACH.flag('dragon_slain');
    // Dragon dies with a portal + egg
    const cx=Math.floor(WORLD_W/2),cz=Math.floor(WORLD_D/2);
    const endPortalY=42;
    world[blockIndex(cx,endPortalY,cz)]=B.DRAGON_EGG;
    endWorld[blockIndex(cx,endPortalY,cz)]=B.DRAGON_EGG;
    if(typeof invalidateChunkAt==='function')invalidateChunkAt(cx,endPortalY,cz);
    // Give XP
    if(typeof XP!=='undefined')XP.add(500);
  }
}

// ===========================================================================
//  DIMENSION HOTBAR / UI BUTTON
// ===========================================================================
function buildDimensionUI(){
  // Add dimension indicator to top-right status
  let dimEl=document.getElementById('dim-display');
  if(!dimEl){
    const statusEl=document.getElementById('status-overlay');
    if(statusEl){
      dimEl=document.createElement('span');
      dimEl.id='dim-display';
      dimEl.style.cssText='display:block;color:#c8a0ff;font-weight:bold;';
      statusEl.appendChild(dimEl);
    }
  }
  // Add portal button to inventory / hotbar area
  let portalBtn=document.getElementById('btn-portal-info');
  if(!portalBtn){
    const topRight=document.getElementById('top-right-buttons');
    if(topRight){
      portalBtn=document.createElement('button');
      portalBtn.id='btn-portal-info';
      portalBtn.title='Dimension Info';
      portalBtn.setAttribute('aria-label','Dimension Info');
      portalBtn.innerHTML='🌀';
      portalBtn.style.cssText='font-size:18px;padding:4px 6px;';
      portalBtn.addEventListener('click',showDimensionPanel);
      topRight.appendChild(portalBtn);
    }
  }
  updateDimensionUI();
}

function updateDimensionUI(){
  const dimEl=document.getElementById('dim-display');
  if(!dimEl)return;
  const names={[DIM.OVERWORLD]:'🌍 Overworld',[DIM.NETHER]:'🔥 Nether',[DIM.DEEP_DARK]:'💀 Deep Dark',[DIM.END]:'🐉 The End'};
  dimEl.textContent=names[currentDimension]||'?';
}

function showDimensionPanel(){
  let panel=document.getElementById('dim-panel-overlay');
  if(panel){panel.style.display=panel.style.display==='none'?'flex':'none';return;}

  panel=document.createElement('div');
  panel.id='dim-panel-overlay';
  panel.style.cssText=`position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:rgba(10,5,20,0.95);border:2px solid #6030a0;border-radius:10px;padding:20px;
    z-index:5000;color:#e0c0ff;font-family:monospace;min-width:300px;display:flex;flex-direction:column;gap:10px;`;

  panel.innerHTML=`
    <h3 style="margin:0;color:#c090ff;text-align:center;">🌀 Dimensions</h3>
    <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:10px;">
      <div style="color:#80ff80;font-weight:bold;">🌍 Overworld</div>
      <div style="font-size:12px;opacity:0.8;">Your home dimension. Build obsidian portal to travel to the Nether.</div>
    </div>
    <div style="background:rgba(255,100,0,0.1);border-radius:6px;padding:10px;border:1px solid rgba(255,100,0,0.3);">
      <div style="color:#ff8040;font-weight:bold;">🔥 Nether</div>
      <div style="font-size:12px;opacity:0.8;">Fire dimension with lava seas, Nether Fortress, Glowstone and Quartz ore. Build a 4×5 obsidian frame and right-click to ignite.</div>
    </div>
    <div style="background:rgba(0,30,50,0.3);border-radius:6px;padding:10px;border:1px solid rgba(0,100,150,0.3);">
      <div style="color:#40c0ff;font-weight:bold;">💀 Deep Dark</div>
      <div style="font-size:12px;opacity:0.8;">Ancient underground city with Sculk blocks and the Warden boss. Enter by digging very deep (Y<8) and activating a Sculk block.</div>
    </div>
    <div style="background:rgba(50,0,80,0.2);border-radius:6px;padding:10px;border:1px solid rgba(150,0,200,0.3);">
      <div style="color:#c080ff;font-weight:bold;">🐉 The End</div>
      <div style="font-size:12px;opacity:0.8;">Floating islands in the void. Defeat the Ender Dragon on the central island. Find the End Portal in the Overworld to travel there.</div>
    </div>
    <div style="text-align:center;font-size:13px;opacity:0.7;">Current: <strong style="color:#c8a0ff;">${['🌍 Overworld','🔥 Nether','💀 Deep Dark','🐉 The End'][currentDimension]||'Unknown'}</strong></div>
    <button id="dim-panel-close" style="background:rgba(150,50,200,0.3);color:#e0c0ff;border:1px solid #8040c0;border-radius:6px;padding:8px;cursor:pointer;font-family:monospace;">✕ Close</button>
  `;
  document.body.appendChild(panel);
  document.getElementById('dim-panel-close').addEventListener('click',()=>{panel.style.display='none';});
}

// ===========================================================================
//  INTEGRATE WITH MAIN LOOP
// ===========================================================================
// Patch main update to call dimension/warden/dragon updates
const _origDimUpdate=(typeof update==='function')?update:null;

// Called from main.js update
window.updateDimensions=function(dt){
  updateDimensionPortals(dt);
  updateWarden(dt);
  if(dragonActive)updateDragon(dt);
  if(currentDimension===DIM.END&&!_dragonDefeated&&worldReady&&started){
    initDragonIfNeeded();
  }
  updateDimensionUI();
};

// Expose for player interaction (right-click on sculk shrieker)
window.onBlockInteractDimension=function(bx,by,bz,blkId){
  if(blkId===B.SCULK_SHRIEKER){
    alertWarden();
    return true;
  }
  return false;
};

// Expose for combat (attacking warden / dragon)
window.tryHitDimensionBoss=function(targetX,targetY,targetZ,dmg){
  if(currentDimension===DIM.DEEP_DARK&&wardenActive){
    const d=Math.hypot(targetX-wardenPos.x,targetY-wardenPos.y,targetZ-wardenPos.z);
    if(d<4){damageWarden(dmg);return true;}
  }
  if(currentDimension===DIM.END&&dragonActive){
    const d=Math.hypot(targetX-dragonPos.x,targetY-dragonPos.y,targetZ-dragonPos.z);
    if(d<8){damageDragon(dmg);return true;}
  }
  return false;
};

// Expose portal ignition for right-click handling
window.tryIgnitePortal=tryIgniteNetherPortal;
window.tryEnterDeepDark=tryEnterDeepDark;
window.DIM=DIM;
window.getCurrentDimension=()=>currentDimension;
