const atlasCanvas=document.createElement('canvas');atlasCanvas.width=ATLAS_W;atlasCanvas.height=ATLAS_H;(function drawAtlas(){const ctx=atlasCanvas.getContext('2d');ctx.clearRect(0,0,ATLAS_W,ATLAS_H);function tileOrigin(t){return[(t%ATLAS_TILES)*TILE_PX,Math.floor(t/ATLAS_TILES)*TILE_PX];}
function noisy(t,base,variants,density){const[ox,oy]=tileOrigin(t);const rnd=mulberry32(1000+t);ctx.fillStyle=base;ctx.fillRect(ox,oy,TILE_PX,TILE_PX);const n=Math.floor(TILE_PX*TILE_PX*density/4);for(let i=0;i<n;i++){ctx.fillStyle=variants[Math.floor(rnd()*variants.length)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}}
// Grass top
noisy(T.GRASS_TOP,'#67ad3e',['#58a034','#74bd4a','#4f9530','#6cb544','#7fc955'],0.9);
{const[ox,oy]=tileOrigin(T.GRASS_TOP);const rnd=mulberry32(9101);const cols=['#4f9530','#7fc955','#58a034'];for(let i=0;i<10;i++){const cx=Math.floor(rnd()*15)*2,cy=Math.floor(rnd()*15)*2;ctx.fillStyle=cols[Math.floor(rnd()*cols.length)];ctx.fillRect(ox+cx,oy+cy,2,2);if(rnd()<0.6)ctx.fillRect(ox+cx+2,oy+cy,2,2);if(rnd()<0.5)ctx.fillRect(ox+cx,oy+cy+2,2,2);}}
// Dirt
noisy(T.DIRT,'#8b5d3b',['#7a5132','#9a6a44','#6f4a2d','#84583a','#a07550'],0.85);
{const[ox,oy]=tileOrigin(T.DIRT);const rnd=mulberry32(9102);ctx.fillStyle='#5e3f28';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Stone
noisy(T.STONE,'#8a8a8a',['#7d7d7d','#969696','#737373','#828282','#6b6b6b'],0.75);
{const[ox,oy]=tileOrigin(T.STONE);const rnd=mulberry32(9103);ctx.fillStyle='#646464';for(let i=0;i<5;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,4,2);if(rnd()<0.5)ctx.fillRect(ox+cx,oy+cy+2,2,2);}ctx.fillStyle='#9c9c9c';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Sand
noisy(T.SAND,'#e0cd92',['#d6c386','#ecd8a2','#cdba7d','#e3d098'],0.7);
{const[ox,oy]=tileOrigin(T.SAND);const rnd=mulberry32(9104);ctx.fillStyle='#cab578';for(let y=2;y<TILE_PX;y+=10)for(let x=0;x<TILE_PX;x+=2)if(rnd()<0.4)ctx.fillRect(ox+x,oy+y,2,2);}
noisy(T.BEDROCK,'#3a3a3a',['#2c2c2c','#474747','#222222','#515151'],0.9);noisy(T.WATER,'#2e63c4',['#2a5cb8','#3a70d2','#2657ad','#3569c9'],0.55);
// Grass side
{noisy(T.GRASS_SIDE,'#8b5d3b',['#7a5132','#9a6a44','#6f4a2d','#84583a'],0.8);const[ox,oy]=tileOrigin(T.GRASS_SIDE);const rnd=mulberry32(2001);
 ctx.fillStyle='#5e3f28';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+10+Math.floor(rnd()*10)*2,2,2);
 ctx.fillStyle='#67ad3e';ctx.fillRect(ox,oy,TILE_PX,7);
 for(let x=0;x<TILE_PX;x+=2){const h=6+Math.floor(rnd()*5)*2;ctx.fillStyle=rnd()<0.4?'#58a034':(rnd()<0.5?'#74bd4a':'#67ad3e');ctx.fillRect(ox+x,oy,2,h);}
 ctx.fillStyle='#7fc955';for(let x=0;x<TILE_PX;x+=2)if(rnd()<0.4)ctx.fillRect(ox+x,oy,2,2);}
{const[ox,oy]=tileOrigin(T.LOG_SIDE);const rnd=mulberry32(2002);ctx.fillStyle='#6b4a2a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=4){ctx.fillStyle=['#5c3f23','#7a5631','#634526','#71502d'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}}
{const[ox,oy]=tileOrigin(T.LOG_TOP);ctx.fillStyle='#6b4a2a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#c9a86b';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#8a6a3c';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
// Leaves
{noisy(T.LEAVES,'#3e8a28',['#347a20','#499b31','#2e711b','#418f2b','#56a83a'],0.95);const[ox,oy]=tileOrigin(T.LEAVES);const rnd=mulberry32(2003);
 ctx.fillStyle='#235e16';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 ctx.fillStyle='#62bd45';for(let i=0;i<12;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 for(let i=0;i<10;i++){ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}}
{const[ox,oy]=tileOrigin(T.PLANKS);const rnd=mulberry32(2004);ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let i=0;i<60;i++){ctx.fillStyle=['#a37e45','#bb945a','#9c7840'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
ctx.fillStyle='#7d5d30';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);ctx.fillRect(ox+8,oy+2,2,6);ctx.fillRect(ox+22,oy+10,2,6);ctx.fillRect(ox+14,oy+18,2,6);ctx.fillRect(ox+4,oy+26,2,6);}
{const[ox,oy]=tileOrigin(T.GLASS);ctx.fillStyle='#cfeffb';ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);ctx.fillRect(ox+TILE_PX-2,oy,2,TILE_PX);ctx.fillStyle='rgba(220,245,255,0.95)';for(let i=0;i<10;i++)ctx.fillRect(ox+4+i*2,oy+22-i*2,2,2);for(let i=0;i<6;i++)ctx.fillRect(ox+16+i*2,oy+26-i*2,2,2);}
{const[ox,oy]=tileOrigin(T.BRICK);ctx.fillStyle='#9e3d2e';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(2005);for(let i=0;i<50;i++){ctx.fillStyle=['#933527','#aa4634','#8c3023'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
ctx.fillStyle='#d8d0c4';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);for(let y=0;y<TILE_PX;y+=16){ctx.fillRect(ox+16,oy+y+2,2,6);ctx.fillRect(ox,oy+y+10,2,6);ctx.fillRect(ox+30,oy+y+10,2,6);}}
{noisy(T.COBBLE,'#7c7c7c',['#6e6e6e','#8b8b8b','#646464'],0.5);const[ox,oy]=tileOrigin(T.COBBLE);const rnd=mulberry32(2006);for(let i=0;i<9;i++){const cx=4+Math.floor(rnd()*12)*2,cy=4+Math.floor(rnd()*12)*2,r=3+Math.floor(rnd()*3)*2;ctx.fillStyle=rnd()<0.5?'#8f8f8f':'#696969';ctx.fillRect(ox+cx-r/2,oy+cy-r/2,r,r);ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.strokeRect(ox+cx-r/2,oy+cy-r/2,r,r);}}
function oreTile(t,colors,seed){noisy(t,'#8a8a8a',['#7d7d7d','#969696','#737373','#828282'],0.7);const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);for(let i=0;i<5;i++){const cx=4+Math.floor(rnd()*11)*2,cy=4+Math.floor(rnd()*11)*2;const main=colors[0],hi=colors[1],lo=colors[2];ctx.fillStyle=main;ctx.fillRect(ox+cx,oy+cy,4,4);ctx.fillRect(ox+cx-2,oy+cy,2,2);ctx.fillRect(ox+cx+4,oy+cy+2,2,2);ctx.fillStyle=hi;ctx.fillRect(ox+cx,oy+cy,2,2);ctx.fillStyle=lo;ctx.fillRect(ox+cx+2,oy+cy+2,2,2);}}
oreTile(T.COAL_ORE,['#2b2b2b','#4a4a4a','#161616'],3001);oreTile(T.IRON_ORE,['#d8af93','#ecd2bd','#b08363'],3002);oreTile(T.GOLD_ORE,['#fcd84b','#ffeea0','#d4a017'],3003);oreTile(T.DIAMOND_ORE,['#5fe3e0','#b7fffc','#2da9b8'],3004);{noisy(T.GRAVEL,'#8a8178',['#79716a','#9a9186','#6c645e','#a39a8d'],0.9);const[ox,oy]=tileOrigin(T.GRAVEL);const rnd=mulberry32(3005);for(let i=0;i<14;i++){const cx=2+Math.floor(rnd()*13)*2,cy=2+Math.floor(rnd()*13)*2;ctx.fillStyle=['#5e564f','#aaa195','#776f66','#948b80'][Math.floor(rnd()*4)];ctx.fillRect(ox+cx,oy+cy,4,2);ctx.fillRect(ox+cx+(rnd()<.5?0:2),oy+cy+2,2,2);}}
{noisy(T.SANDSTONE_TOP,'#e0d3a0',['#d6c992','#e9dcab','#cdbf86'],0.6);const[ox,oy]=tileOrigin(T.SANDSTONE_SIDE);noisy(T.SANDSTONE_SIDE,'#dcce98',['#d2c489','#e5d8a6'],0.5);ctx.fillStyle='#c5b573';ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2);const rnd=mulberry32(3006);for(let y=8;y<TILE_PX-4;y+=8){for(let x=0;x<TILE_PX;x+=4)
if(rnd()<0.8){ctx.fillStyle=rnd()<.5?'#c9b878':'#bfae6c';ctx.fillRect(ox+x,oy+y+(rnd()<.3?2:0),4,2);}}}
noisy(T.SNOW,'#f4f8fb',['#e8eef5','#ffffff','#dde6ef','#eef3f8'],0.55);{noisy(T.ICE,'#9cc8f0',['#8fbfe9','#aad3f7','#84b6e3'],0.45);const[ox,oy]=tileOrigin(T.ICE);ctx.fillStyle='rgba(255,255,255,0.75)';for(let i=0;i<9;i++)ctx.fillRect(ox+4+i*2,oy+20-i*2,2,2);for(let i=0;i<6;i++)ctx.fillRect(ox+18+i*2,oy+28-i*2,2,2);ctx.fillStyle='rgba(255,255,255,0.4)';for(let i=0;i<5;i++)ctx.fillRect(ox+8+i*2,oy+28-i*2,2,2);}
{noisy(T.OBSIDIAN,'#17111f',['#100b17','#1f1729','#0b0810','#241b30'],0.85);const[ox,oy]=tileOrigin(T.OBSIDIAN);const rnd=mulberry32(3007);ctx.fillStyle='#5a3b8a';for(let i=0;i<7;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#8e6ac2';for(let i=0;i<3;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.CACTUS_SIDE);noisy(T.CACTUS_SIDE,'#2f7e2a',['#276f22','#388d32','#1f6420'],0.7);ctx.fillStyle='#1d5c1d';for(let x=4;x<TILE_PX;x+=8)ctx.fillRect(ox+x,oy,2,TILE_PX);ctx.fillStyle='#dfe9c8';const rnd=mulberry32(3008);for(let i=0;i<8;i++)ctx.fillRect(ox+2+Math.floor(rnd()*14)*2,oy+2+Math.floor(rnd()*14)*2,1,2);}
{const[ox,oy]=tileOrigin(T.CACTUS_TOP);noisy(T.CACTUS_TOP,'#2f7e2a',['#276f22','#388d32'],0.6);ctx.fillStyle='#9fcf7a';ctx.fillRect(ox+6,oy+6,20,20);ctx.fillStyle='#6fae57';ctx.fillRect(ox+10,oy+10,12,12);}
{const[ox,oy]=tileOrigin(T.CRAFT_TOP);noisy(T.CRAFT_TOP,'#b08a4f',['#a37e45','#bb945a','#9c7840'],0.6);ctx.strokeStyle='#6f5326';ctx.lineWidth=2;ctx.strokeRect(ox+3,oy+3,TILE_PX-6,TILE_PX-6);ctx.fillStyle='#6f5326';ctx.fillRect(ox+15,oy+3,2,TILE_PX-6);ctx.fillRect(ox+3,oy+15,TILE_PX-6,2);}
{const[ox,oy]=tileOrigin(T.CRAFT_SIDE);noisy(T.CRAFT_SIDE,'#a8814a',['#9c7840','#b58c52'],0.6);ctx.fillStyle='#7d5d30';ctx.fillRect(ox,oy,TILE_PX,4);ctx.fillStyle='#8a6a3c';ctx.fillRect(ox+4,oy+8,10,10);ctx.fillRect(ox+18,oy+8,10,10);ctx.fillStyle='#5e4622';ctx.fillRect(ox+6,oy+10,6,6);ctx.fillRect(ox+20,oy+10,6,6);}
{noisy(T.FURNACE_TOP,'#7c7c7c',['#6e6e6e','#8b8b8b','#646464'],0.6);const[ox,oy]=tileOrigin(T.FURNACE_FRONT);noisy(T.FURNACE_FRONT,'#7c7c7c',['#6e6e6e','#8b8b8b','#646464'],0.6);ctx.fillStyle='#3a3a3a';ctx.fillRect(ox+8,oy+14,16,12);ctx.fillStyle='#1d1d1d';ctx.fillRect(ox+10,oy+16,12,8);ctx.fillStyle='#ff8c1a';ctx.fillRect(ox+12,oy+20,2,4);ctx.fillRect(ox+16,oy+18,2,6);ctx.fillRect(ox+20,oy+21,2,3);ctx.fillStyle='#ffd23e';ctx.fillRect(ox+14,oy+21,2,3);ctx.fillRect(ox+18,oy+20,2,4);}
{const[ox,oy]=tileOrigin(T.BIRCH_SIDE);const rnd=mulberry32(2010);ctx.fillStyle='#e8e6e0';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#dedcd4','#f0eee8','#e4e2da','#eceae4'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}
ctx.fillStyle='#2e2a26';for(let i=0;i<9;i++){const bx=Math.floor(rnd()*12)*2,by=Math.floor(rnd()*15)*2;ctx.fillRect(ox+bx,oy+by,4+Math.floor(rnd()*3)*2,2);}
ctx.fillStyle='#55504a';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*14)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.BIRCH_TOP);ctx.fillStyle='#e8e6e0';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#d6c49a';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#b09a6c';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.BIRCH_LEAVES,'#6fae44',['#609a38','#7fbe52','#558b30','#76b54a'],0.95);const[ox,oy]=tileOrigin(T.BIRCH_LEAVES);const rnd=mulberry32(2011);for(let i=0;i<26;i++){ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}}
// Lava
{noisy(T.LAVA,'#d83a0c',['#b82f08','#e8530f','#a82806','#cf3a0a'],0.6);const[ox,oy]=tileOrigin(T.LAVA);const rnd=mulberry32(4001);ctx.fillStyle='#3a1505';for(let i=0;i<7;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,4+Math.floor(rnd()*2)*2,2);}
ctx.fillStyle='#ffb028';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#fff0a0';for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Coral tiles
function coralTile(t,main,hi,shadow,seed){const[ox,oy]=tileOrigin(t);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(seed);
function branch(x,y,len,wob){let cx=x;for(let i=0;i<len;i++){const yy=y-i*2;if(yy<2)break;const w=i<len*0.35?4:2; // thicker near the base
  ctx.fillStyle=shadow;ctx.fillRect(ox+cx,oy+yy,w,2);
  ctx.fillStyle=main;ctx.fillRect(ox+cx,oy+yy,Math.max(2,w-2),2);
  if(rnd()<wob)cx+=rnd()<0.5?-2:2;cx=Math.max(2,Math.min(TILE_PX-6,cx));
  if(i>2&&i<len-1&&rnd()<0.22){const sx=cx+(rnd()<0.5?-4:4);const sy=yy-2;if(sx>2&&sx<TILE_PX-4&&sy>2){ctx.fillStyle=main;ctx.fillRect(ox+sx,oy+sy,2,2);ctx.fillRect(ox+sx,oy+sy-2,2,2);ctx.fillStyle=hi;ctx.fillRect(ox+sx,oy+sy-4,2,2);}}
  if(i===len-1){ctx.fillStyle=hi;ctx.fillRect(ox+cx-2,oy+yy,6,2);ctx.fillRect(ox+cx,oy+yy-2,2,2);}
}}
const baseX=12+Math.floor(rnd()*4);
branch(baseX,TILE_PX-2,9+Math.floor(rnd()*3),0.28);
branch(baseX-6,TILE_PX-2,6+Math.floor(rnd()*3),0.34);
branch(baseX+6,TILE_PX-2,6+Math.floor(rnd()*3),0.34);
if(rnd()<0.7)branch(baseX-2,TILE_PX-2,7+Math.floor(rnd()*3),0.3);
ctx.fillStyle=hi;for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
ctx.fillStyle=main;for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
coralTile(T.CORAL_PINK,'#f0589a','#ffb0d6','#c23f78',4002);coralTile(T.CORAL_PURPLE,'#a45ce0','#d7b0f5','#7a3cb0',4003);coralTile(T.CORAL_BLUE,'#3f9bf2','#9fd0ff','#2c6fc0',4004);
// Seaweed
{const[ox,oy]=tileOrigin(T.SEAWEED);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(4005);for(let s=0;s<4;s++){let x=4+s*7;const cols=['#1f8a3a','#2aa84a','#187a30','#34bf58'];ctx.fillStyle=cols[s%cols.length];for(let y=TILE_PX-2;y>2;y-=2){ctx.fillRect(ox+x,oy+y,2,2);if(rnd()<0.5)x+=rnd()<0.5?-2:2;x=Math.max(2,Math.min(TILE_PX-3,x));}}}
// Dead log
{const[ox,oy]=tileOrigin(T.DEAD_LOG_SIDE);const rnd=mulberry32(4006);ctx.fillStyle='#6a6056';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=4){ctx.fillStyle=['#5a5048','#766b5f','#625850','#6f655b'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}
ctx.fillStyle='#3e362e';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,4+Math.floor(rnd()*2)*2);}
{const[ox,oy]=tileOrigin(T.DEAD_LOG_TOP);ctx.fillStyle='#6a6056';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#857a6c';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#4e463c';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
// Dead bush
{const[ox,oy]=tileOrigin(T.DEAD_BUSH);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 const dark='#4f3a20',mid='#6e5029',lite='#8a663a';
 function twig(x,y,dir,len,col){ctx.fillStyle=col;let cx=x,cy=y;for(let i=0;i<len;i++){if(cx<1||cx>TILE_PX-2||cy<1)break;ctx.fillRect(ox+cx,oy+cy,2,2);
   cy-=2; if(i%2===0)cx+=dir*2;}
 }
 ctx.fillStyle=mid;ctx.fillRect(ox+15,oy+16,2,14);
 ctx.fillStyle=dark;ctx.fillRect(ox+15,oy+24,2,6);
 ctx.fillStyle=lite;ctx.fillRect(ox+15,oy+16,1,8);
 twig(15,22,-1,5,mid); twig(17,20, 1,5,lite);
 twig(15,18,-1,4,lite);twig(17,16, 1,5,mid);
 twig(15,14, 0,5,dark);
 twig(11,16,-1,3,mid); twig(21,18,1,3,mid);}
// Tall grass: a tuft of short green blades on a transparent tile (cross plant)
{const[ox,oy]=tileOrigin(T.TALL_GRASS);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 const rnd=mulberry32(9301);const cols=['#4f9530','#58a034','#67ad3e','#74bd4a'];
 // several blades fanning out from the base, slightly bending
 const blades=[[10,1],[13,-1],[16,0],[19,1],[22,-1],[14,1],[18,-1]];
 for(const[bx,dir]of blades){const col=cols[Math.floor(rnd()*cols.length)];const hgt=8+Math.floor(rnd()*4)*2;
   ctx.fillStyle=col;let cx=bx;for(let i=0;i<hgt/2;i++){const y=TILE_PX-2-i*2;if(y<2)break;ctx.fillRect(ox+cx,oy+y,2,2);if(i%2===1)cx+=dir*2;cx=Math.max(2,Math.min(TILE_PX-4,cx));}}
}
// Generic flower helper: green stem + small leaves + a coloured blossom head
function flowerTile(t,seed,petal,petalHi,center){const[ox,oy]=tileOrigin(t);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 const rnd=mulberry32(seed);const stemX=15;
 // stem
 ctx.fillStyle='#3f8a2e';for(let y=TILE_PX-2;y>12;y-=2)ctx.fillRect(ox+stemX,oy+y,2,2);
 ctx.fillStyle='#56a83a';ctx.fillRect(ox+stemX,oy+TILE_PX-2,2,2);
 // a couple of leaves on the stem
 ctx.fillStyle='#4f9530';ctx.fillRect(ox+stemX-2,oy+22,2,2);ctx.fillRect(ox+stemX+2,oy+18,2,2);
 // blossom: 3x3 ring of petals around a centre at (stemX,10)
 const bx=stemX,by=10;
 ctx.fillStyle=petal;
 ctx.fillRect(ox+bx-2,oy+by-2,2,2);ctx.fillRect(ox+bx,oy+by-2,2,2);ctx.fillRect(ox+bx+2,oy+by-2,2,2);
 ctx.fillRect(ox+bx-2,oy+by,2,2);                                   ctx.fillRect(ox+bx+2,oy+by,2,2);
 ctx.fillRect(ox+bx-2,oy+by+2,2,2);ctx.fillRect(ox+bx,oy+by+2,2,2);ctx.fillRect(ox+bx+2,oy+by+2,2,2);
 ctx.fillStyle=petalHi;ctx.fillRect(ox+bx,oy+by-2,2,2);ctx.fillRect(ox+bx-2,oy+by,2,2);
 // centre
 ctx.fillStyle=center;ctx.fillRect(ox+bx,oy+by,2,2);
 return rnd;
}
flowerTile(T.FLOWER_DANDELION,9311,'#f7d524','#ffe96a','#e0a800');   // yellow dandelion
flowerTile(T.FLOWER_POPPY,9312,'#e23b32','#ff6b62','#3a2a16');       // red poppy, dark centre
flowerTile(T.FLOWER_CORNFLOWER,9313,'#4a6cd8','#7d96f0','#243a8a');  // blue cornflower
// Stone brick masonry
function brickMasonry(t,base,variants,seed){noisy(t,base,variants,0.45);const[ox,oy]=tileOrigin(t);ctx.fillStyle='rgba(40,40,40,0.55)';ctx.fillRect(ox,oy+15,TILE_PX,2);ctx.fillRect(ox+15,oy,2,16);ctx.fillRect(ox+7,oy+16,2,16);ctx.fillRect(ox+23,oy+16,2,16);ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.strokeRect(ox+1,oy+1,30,30);return seed;}
brickMasonry(T.STONE_BRICK,'#8d8d8d',['#7f7f7f','#9a9a9a','#757575','#868686'],5001);
// Mossy brick
{brickMasonry(T.MOSSY_BRICK,'#7f867b',['#727a6e','#8c9384','#6a7165','#7c8377'],5002);const[ox,oy]=tileOrigin(T.MOSSY_BRICK);const rnd=mulberry32(5012);ctx.fillStyle='#4e7a3a';for(let i=0;i<22;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#3c6630';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Cracked brick
{brickMasonry(T.CRACKED_BRICK,'#888888',['#7a7a7a','#959595','#6f6f6f','#828282'],5003);const[ox,oy]=tileOrigin(T.CRACKED_BRICK);ctx.strokeStyle='#3a3a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ox+6,oy+4);ctx.lineTo(ox+12,oy+14);ctx.lineTo(ox+9,oy+24);ctx.lineTo(ox+18,oy+30);ctx.moveTo(ox+24,oy+6);ctx.lineTo(ox+20,oy+16);ctx.lineTo(ox+28,oy+22);ctx.stroke();}
// Path
{noisy(T.PATH_TOP,'#9a7a4e',['#8a6c44','#a8875a','#806440','#917252'],0.55);const[ox,oy]=tileOrigin(T.PATH_TOP);const rnd=mulberry32(5004);ctx.fillStyle='#6f5436';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2+Math.floor(rnd()*2)*2,2);ctx.strokeStyle='rgba(60,45,28,0.5)';ctx.lineWidth=1;ctx.strokeRect(ox+1,oy+1,30,30);}
{noisy(T.PATH_SIDE,'#8b5d3b',['#7a5132','#9a6a44','#6f4a2d'],0.7);const[ox,oy]=tileOrigin(T.PATH_SIDE);ctx.fillStyle='#9a7a4e';ctx.fillRect(ox,oy,TILE_PX,5);}
// Torch
{const[ox,oy]=tileOrigin(T.TORCH);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+13,oy+12,6,20);
 ctx.fillStyle='#7a5631';ctx.fillRect(ox+13,oy+12,2,20);
 ctx.fillStyle='#5c3f23';ctx.fillRect(ox+17,oy+12,2,20);
 ctx.fillStyle='#e8530f';ctx.fillRect(ox+12,oy+7,8,7);
 ctx.fillStyle='#ff8c1a';ctx.fillRect(ox+13,oy+5,6,8);
 ctx.fillStyle='#ffd23e';ctx.fillRect(ox+14,oy+5,4,7);
 ctx.fillStyle='#fff6c0';ctx.fillRect(ox+15,oy+6,2,4);}
// Cobweb
{const[ox,oy]=tileOrigin(T.COBWEB);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);ctx.strokeStyle='rgba(235,238,242,0.8)';ctx.lineWidth=1;const cx=ox+16,cy=oy+16;for(let a=0;a<8;a++){const ang=a*Math.PI/4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ang)*15,cy+Math.sin(ang)*15);ctx.stroke();}
for(let r=4;r<=14;r+=4){ctx.beginPath();for(let a=0;a<=8;a++){const ang=a*Math.PI/4;const px=cx+Math.cos(ang)*r,py=cy+Math.sin(ang)*r;if(a===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();}}
// Rail
{const[ox,oy]=tileOrigin(T.RAIL);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#6b4a2a';for(let y=2;y<TILE_PX;y+=8)ctx.fillRect(ox+2,oy+y,28,3);ctx.fillStyle='#b8b8b8';ctx.fillRect(ox+8,oy,3,TILE_PX);ctx.fillRect(ox+21,oy,3,TILE_PX);ctx.fillStyle='#e0e0e0';ctx.fillRect(ox+8,oy,1,TILE_PX);ctx.fillRect(ox+21,oy,1,TILE_PX);}
// Chest
function chestBody(t,withLock){noisy(t,'#9c6f3a',['#8c632f','#a87b44','#835c2c'],0.5);const[ox,oy]=tileOrigin(t);ctx.fillStyle='#5e4222';ctx.fillRect(ox,oy+10,TILE_PX,2);ctx.strokeStyle='#5e4222';ctx.lineWidth=2;ctx.strokeRect(ox+1,oy+1,30,30);if(withLock){ctx.fillStyle='#4a4a4a';ctx.fillRect(ox+13,oy+8,6,8);ctx.fillStyle='#dcdcdc';ctx.fillRect(ox+14,oy+10,4,3);}}
chestBody(T.CHEST_SIDE,false);chestBody(T.CHEST_FRONT,true);{noisy(T.CHEST_TOP,'#a87b44',['#9c6f3a','#b5874f','#8c632f'],0.5);const[ox,oy]=tileOrigin(T.CHEST_TOP);ctx.strokeStyle='#5e4222';ctx.lineWidth=2;ctx.strokeRect(ox+2,oy+2,28,28);ctx.fillStyle='#4a4a4a';ctx.fillRect(ox+14,oy+1,4,4);}
// Wool
{noisy(T.WOOL_RED,'#b0382f',['#a3302a','#c14138','#992c26','#b53b32'],0.85);}
{noisy(T.WOOL_WHITE,'#ece9e4',['#e2dfd9','#f4f1ec','#d8d5cf','#e8e5e0'],0.85);}
// Bookshelf
{const[ox,oy]=tileOrigin(T.BOOKSHELF);ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#7d5d30';ctx.fillRect(ox,oy,TILE_PX,4);ctx.fillRect(ox,oy+14,TILE_PX,4);ctx.fillRect(ox,oy+28,TILE_PX,4);const rnd=mulberry32(5006);const cols=['#b0382f','#3a6ec1','#3a9a4a','#c9a02a','#8e4fc2','#c96a2a'];for(let row=0;row<2;row++){let x=2;while(x<TILE_PX-2){const w=2+Math.floor(rnd()*2)*2;ctx.fillStyle=cols[Math.floor(rnd()*cols.length)];ctx.fillRect(ox+x,oy+5+row*14,w,8);x+=w+1;}}}
// Lantern
{const[ox,oy]=tileOrigin(T.LANTERN);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#4a4a4a';ctx.fillRect(ox+15,oy+2,2,4);ctx.fillRect(ox+10,oy+6,12,2);ctx.fillRect(ox+10,oy+22,12,2);ctx.fillRect(ox+10,oy+6,2,16);ctx.fillRect(ox+20,oy+6,2,16);ctx.fillStyle='#ffd23e';ctx.fillRect(ox+12,oy+8,8,14);ctx.fillStyle='#fff6c0';ctx.fillRect(ox+14,oy+10,4,8);}
// Hay bale
{noisy(T.HAY_SIDE,'#cBa83e',['#bd9b35','#d9b748','#b0902f','#c8a53b'],0.6);const[ox,oy]=tileOrigin(T.HAY_SIDE);ctx.fillStyle='#8a6f22';ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2);ctx.fillRect(ox,oy+15,TILE_PX,2);const rnd=mulberry32(5007);ctx.fillStyle='#a8862a';for(let i=0;i<30;i++)ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,1);}
{noisy(T.HAY_TOP,'#d9b748',['#cBa83e','#e4c456','#c19a33'],0.6);const[ox,oy]=tileOrigin(T.HAY_TOP);ctx.strokeStyle='#8a6f22';ctx.lineWidth=2;ctx.strokeRect(ox+5,oy+5,22,22);ctx.fillStyle='#b8962e';ctx.fillRect(ox+13,oy+13,6,6);}
// Dripstone
{noisy(T.DRIPSTONE,'#9a6f55',['#8a614a','#a87c60','#7e5742','#946a51'],0.7);const[ox,oy]=tileOrigin(T.DRIPSTONE);const rnd=mulberry32(6001);ctx.fillStyle='#6f4d39';for(let x=0;x<TILE_PX;x+=4){if(rnd()<0.6){const h=6+Math.floor(rnd()*10)*2;ctx.fillRect(ox+x,oy,2,h);}}ctx.fillStyle='#b58a6e';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Calcite
{noisy(T.CALCITE,'#e7e4dc',['#dcd9d0','#f1efe9','#d3d0c7','#e9e6df'],0.5);const[ox,oy]=tileOrigin(T.CALCITE);const rnd=mulberry32(6002);ctx.fillStyle='#c8c4ba';for(let i=0;i<10;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,4,2);ctx.fillRect(ox+cx,oy+cy,2,4);}ctx.fillStyle='#fbfaf6';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Amethyst block
{noisy(T.AMETHYST_BLOCK,'#8a52c9',['#7a45b8','#9b63da','#6f3da8','#8f57cf'],0.6);const[ox,oy]=tileOrigin(T.AMETHYST_BLOCK);const rnd=mulberry32(6003);ctx.fillStyle='#b487f0';for(let i=0;i<7;i++){const cx=Math.floor(rnd()*13)*2,cy=Math.floor(rnd()*13)*2;ctx.fillRect(ox+cx,oy+cy,4,4);ctx.fillStyle='#d7befb';ctx.fillRect(ox+cx,oy+cy,2,2);ctx.fillStyle='#b487f0';}ctx.fillStyle='#5e2f93';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Amethyst cluster
{const[ox,oy]=tileOrigin(T.AMETHYST_CLUSTER);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(6004);const cols=['#9b63da','#8a52c9','#b487f0','#7a45b8'];for(let s=0;s<6;s++){const bx=3+Math.floor(rnd()*13)*2;const h=8+Math.floor(rnd()*9);const top=Math.max(2,TILE_PX-2-h);const col=cols[Math.floor(rnd()*cols.length)];for(let y=TILE_PX-2;y>top;y-=2){const w=Math.max(2,Math.floor((y-top)/3)*2);ctx.fillStyle=col;ctx.fillRect(ox+bx,oy+y,w,2);}ctx.fillStyle='#e3d2fb';ctx.fillRect(ox+bx,oy+top,2,3);}}
// Moss
{noisy(T.MOSS,'#41702c',['#386425','#4a7e33','#2f5720','#447630'],0.9);const[ox,oy]=tileOrigin(T.MOSS);const rnd=mulberry32(6005);ctx.fillStyle='#5c9440';for(let i=0;i<20;i++)ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,2);ctx.fillStyle='#243f17';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,2);}
// Glow lichen
{const[ox,oy]=tileOrigin(T.GLOW_LICHEN);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(6006);const cols=['#5fd6a8','#7fe8c0','#4aba8e','#9af0d2'];for(let i=0;i<60;i++){const x=Math.floor(rnd()*16)*2,y=Math.floor(rnd()*16)*2;if((x+y)%4===0||rnd()<0.45){ctx.fillStyle=cols[Math.floor(rnd()*cols.length)];ctx.fillRect(ox+x,oy+y,2,2);}}}
// Smooth basalt
{noisy(T.SMOOTH_BASALT,'#4a4a52',['#42424a','#52525c','#3a3a42','#4d4d56'],0.5);const[ox,oy]=tileOrigin(T.SMOOTH_BASALT);ctx.fillStyle='#383840';for(let y=0;y<TILE_PX;y+=4)ctx.fillRect(ox,oy+y,TILE_PX,1);const rnd=mulberry32(6007);ctx.fillStyle='#5e5e68';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Dry farmland
{noisy(T.FARMLAND_DRY,'#7a5232',['#6d4a2c','#86593a','#634428','#7e5636'],0.7);const[ox,oy]=tileOrigin(T.FARMLAND_DRY);ctx.fillStyle='#5a3c22';for(let y=4;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,3);ctx.fillStyle='#8a5f3c';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);}
// Wet farmland
{noisy(T.FARMLAND_WET,'#4e3420',['#46301d','#553a25','#3e2a19','#4a3322'],0.7);const[ox,oy]=tileOrigin(T.FARMLAND_WET);ctx.fillStyle='#33220f',ctx.globalAlpha=1;for(let y=4;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,3);ctx.fillStyle='#5c3f28';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);ctx.fillStyle='rgba(60,90,150,0.25)';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);}
// Crop tile helper
function cropTile(t,seed,grow,colStem,colHead,headStyle){const[ox,oy]=tileOrigin(t);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(seed);const n=4;for(let s=0;s<n;s++){const bx=4+s*7+Math.floor(rnd()*2)*2;const maxH=6+Math.floor(grow*22);const top=TILE_PX-2-maxH;ctx.fillStyle=colStem;for(let y=TILE_PX-2;y>top;y-=2)ctx.fillRect(ox+bx,oy+y,2,2);if(headStyle==='wheat'&&grow>0.5){ctx.fillStyle=colHead;for(let y=top;y<top+10&&y<TILE_PX-2;y+=2){ctx.fillRect(ox+bx-2,oy+y,2,2);ctx.fillRect(ox+bx+2,oy+y,2,2);}}else if(headStyle==='leaf'){ctx.fillStyle=colHead;ctx.fillRect(ox+bx-2,oy+top,6,4);if(grow>0.6)ctx.fillRect(ox+bx-3,oy+top+3,8,3);}}}
// Wheat stages
cropTile(T.WHEAT0,7001,0.12,'#5fae3e','#5fae3e','wheat');cropTile(T.WHEAT1,7001,0.4,'#6fae3a','#7fbe4a','wheat');cropTile(T.WHEAT2,7001,0.72,'#a8a83a','#d8c84a','wheat');cropTile(T.WHEAT3,7001,1.0,'#c8a838','#e8d24a','wheat');
// Carrot stages
cropTile(T.CARROT0,7002,0.3,'#3f9a30','#54bf40','leaf');cropTile(T.CARROT1,7002,0.65,'#3a9030','#4aba3a','leaf');cropTile(T.CARROT2,7002,1.0,'#358a2c','#46b038','leaf');{const[ox,oy]=tileOrigin(T.CARROT2);ctx.fillStyle='#e8822a';ctx.fillRect(ox+14,oy+26,4,4);ctx.fillRect(ox+15,oy+30,2,2);}
// Potato stages
cropTile(T.POTATO0,7003,0.3,'#4a9a40','#5fbf50','leaf');cropTile(T.POTATO1,7003,0.65,'#449038','#55ba48','leaf');cropTile(T.POTATO2,7003,1.0,'#3f8a34','#4eb040','leaf');{const[ox,oy]=tileOrigin(T.POTATO2);ctx.fillStyle='#d6c98a';ctx.fillRect(ox+13,oy+27,5,3);}
// Pumpkin
{noisy(T.PUMPKIN_TOP,'#d77a1e',['#c66f18','#e08522','#bb6614'],0.5);const[ox,oy]=tileOrigin(T.PUMPKIN_TOP);ctx.fillStyle='#7a5018';ctx.fillRect(ox+13,oy+13,6,6);ctx.fillStyle='#4e7a2a';ctx.fillRect(ox+14,oy+10,4,4);}
{noisy(T.PUMPKIN_SIDE,'#d77a1e',['#c66f18','#e08522','#bb6614','#cf7319'],0.5);const[ox,oy]=tileOrigin(T.PUMPKIN_SIDE);ctx.fillStyle='#a85c14';for(let x=4;x<TILE_PX;x+=7)ctx.fillRect(ox+x,oy,2,TILE_PX);ctx.fillStyle='#7a5018';ctx.fillRect(ox,oy,TILE_PX,3);}
{noisy(T.PUMPKIN_FACE,'#d77a1e',['#c66f18','#e08522','#bb6614','#cf7319'],0.5);const[ox,oy]=tileOrigin(T.PUMPKIN_FACE);ctx.fillStyle='#4a2a08';ctx.beginPath();ctx.moveTo(ox+6,oy+10);ctx.lineTo(ox+12,oy+10);ctx.lineTo(ox+9,oy+15);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(ox+20,oy+10);ctx.lineTo(ox+26,oy+10);ctx.lineTo(ox+23,oy+15);ctx.closePath();ctx.fill();ctx.fillRect(ox+8,oy+20,16,3);ctx.fillRect(ox+8,oy+20,2,3);ctx.fillRect(ox+22,oy+20,2,3);ctx.fillRect(ox+12,oy+23,2,2);ctx.fillRect(ox+18,oy+23,2,2);}
// Melon
{noisy(T.MELON_TOP,'#3a8a32',['#34802c','#429638','#2e7626'],0.5);}
{noisy(T.MELON_SIDE,'#4a9a3a',['#429034','#54a842','#3c8a30'],0.5);const[ox,oy]=tileOrigin(T.MELON_SIDE);ctx.fillStyle='#2e6a22';for(let x=2;x<TILE_PX;x+=8){ctx.beginPath();for(let y=0;y<TILE_PX;y+=2){const w=x+Math.sin((y/TILE_PX)*Math.PI*3)*2;ctx.fillRect(ox+w,oy+y,2,2);}}}
// Pumpkin stem
{const[ox,oy]=tileOrigin(T.PUMPKIN_STEM);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#4e7a2a';ctx.fillRect(ox+14,oy+8,4,20);}
// ---- Spruce (taiga conifer): dark reddish-brown bark, deep blue-green needles ----
{const[ox,oy]=tileOrigin(T.SPRUCE_SIDE);const rnd=mulberry32(2020);ctx.fillStyle='#4a3220';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#3d2a1a','#553a24','#43301e','#4f3722'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}ctx.fillStyle='#2c1d11';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,4);}
{const[ox,oy]=tileOrigin(T.SPRUCE_TOP);ctx.fillStyle='#4a3220';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#7a5836';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#3d2a1a';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.SPRUCE_LEAVES,'#2c5a34',['#23502b','#34663c','#1e4826','#2f6038'],0.95);const[ox,oy]=tileOrigin(T.SPRUCE_LEAVES);const rnd=mulberry32(2021);ctx.fillStyle='#163d1e';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#3f7848';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<8;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
// ---- Acacia (savanna): grey-brown bark, olive/golden-green flat canopy leaves ----
{const[ox,oy]=tileOrigin(T.ACACIA_SIDE);const rnd=mulberry32(2022);ctx.fillStyle='#6b5a48';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#5f4f3e','#776452','#675647','#71604e'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}ctx.fillStyle='#473b2e';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,3);ctx.fillStyle='#8a7560';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.ACACIA_TOP);ctx.fillStyle='#6b5a48';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#a08b5a';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#5f4f3e';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.ACACIA_LEAVES,'#7a9a3a',['#6f8e32','#86a844','#647f2c','#7f9f3e'],0.95);const[ox,oy]=tileOrigin(T.ACACIA_LEAVES);const rnd=mulberry32(2023);ctx.fillStyle='#566e22';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#9fc055';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<8;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
// ---- Cherry blossom: pale pinkish bark, bright pink petal-leaves ----
{const[ox,oy]=tileOrigin(T.CHERRY_SIDE);const rnd=mulberry32(2024);ctx.fillStyle='#5a4438';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#503c31','#65503f','#574236','#5e4839'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}ctx.fillStyle='#3a2a22';for(let i=0;i<9;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,3);ctx.fillStyle='#caa0a8';for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.CHERRY_TOP);ctx.fillStyle='#5a4438';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#caa888';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#503c31';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.CHERRY_LEAVES,'#f3a7c8',['#ef9bc0','#f7b6d2','#ea8fb6','#f4aecb'],0.95);const[ox,oy]=tileOrigin(T.CHERRY_LEAVES);const rnd=mulberry32(2025);ctx.fillStyle='#ffd9e8';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#e07ba6';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#ffffff';for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<7;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
// ---- Savanna dry grass: golden-tan grass top & side overlay ----
{noisy(T.DRY_GRASS_TOP,'#b6a14e',['#a89344','#c2ad58','#9e8a3e','#bba955'],0.9);const[ox,oy]=tileOrigin(T.DRY_GRASS_TOP);const rnd=mulberry32(9320);const cols=['#9e8a3e','#c8b766','#a89344'];for(let i=0;i<10;i++){const cx=Math.floor(rnd()*15)*2,cy=Math.floor(rnd()*15)*2;ctx.fillStyle=cols[Math.floor(rnd()*cols.length)];ctx.fillRect(ox+cx,oy+cy,2,2);if(rnd()<0.6)ctx.fillRect(ox+cx+2,oy+cy,2,2);}}
{noisy(T.DRY_GRASS_SIDE,'#8b5d3b',['#7a5132','#9a6a44','#6f4a2d','#84583a'],0.8);const[ox,oy]=tileOrigin(T.DRY_GRASS_SIDE);const rnd=mulberry32(9321);ctx.fillStyle='#5e3f28';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+10+Math.floor(rnd()*10)*2,2,2);ctx.fillStyle='#b6a14e';ctx.fillRect(ox,oy,TILE_PX,7);for(let x=0;x<TILE_PX;x+=2){const h=6+Math.floor(rnd()*5)*2;ctx.fillStyle=rnd()<0.4?'#a89344':(rnd()<0.5?'#c8b766':'#b6a14e');ctx.fillRect(ox+x,oy,2,h);}ctx.fillStyle='#c8b766';for(let x=0;x<TILE_PX;x+=2)if(rnd()<0.4)ctx.fillRect(ox+x,oy,2,2);}
// Bamboo: a slim vertical cane drawn on a transparent tile. Rendered as a thin
// column, so the tile is mostly filled by the cane with darker node bands and a
// couple of small leaf sprigs poking out the sides.
{const[ox,oy]=tileOrigin(T.BAMBOO);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 const cane='#7ba428',caneHi='#9bc24a',caneLo='#5f8420',node='#4a6618',leaf='#6fae3a';
 // main cane occupies the central columns of the tile
 const cx0=8,cw=16;
 ctx.fillStyle=cane;ctx.fillRect(ox+cx0,oy,cw,TILE_PX);
 // vertical shading: highlight on the left edge, shadow on the right
 ctx.fillStyle=caneHi;ctx.fillRect(ox+cx0,oy,4,TILE_PX);
 ctx.fillStyle=caneLo;ctx.fillRect(ox+cx0+cw-4,oy,4,TILE_PX);
 // node rings banding the cane every ~8px
 ctx.fillStyle=node;for(let y=2;y<TILE_PX;y+=8)ctx.fillRect(ox+cx0,oy+y,cw,2);
 // small leaf sprigs jutting from a couple of nodes
 ctx.fillStyle=leaf;
 ctx.fillRect(ox+cx0-5,oy+9,5,2);ctx.fillRect(ox+cx0-7,oy+11,4,2);
 ctx.fillRect(ox+cx0+cw,oy+19,5,2);ctx.fillRect(ox+cx0+cw+3,oy+21,4,2);
}
})();function tileUV(t){const col=t%ATLAS_TILES,row=Math.floor(t/ATLAS_TILES);const padU=0.5/ATLAS_W,padV=0.5/ATLAS_H;return{u1:col/ATLAS_TILES+padU,u2:(col+1)/ATLAS_TILES-padU,v1:1-(row+1)/ATLAS_ROWS+padV,v2:1-row/ATLAS_ROWS-padV,};}
/* ---------------------------------------------------------------------------
 * Per-material tool textures (pickaxe / axe / shovel / hoe + stick).
 * Each tool gets a 32x32 pixel-art canvas tinted with its material colour, so
 * a Diamond Pickaxe looks different from a Wooden Pickaxe etc. The generated
 * canvases are cached in TOOL_TEXTURES keyed by item id and consumed by the
 * inventory/hotbar/held-item renderers (see inventory.js makeItemNode).
 * ------------------------------------------------------------------------- */
const TOOL_TEXTURES={};
(function buildToolTextures(){
  const TP=32; // texture resolution
  // Material head palettes: [base, highlight, shadow]
  const HEAD={
    wood:   ['#9c6b3c','#c08c54','#6f4a24'],
    stone:  ['#8a8a8a','#aeaeae','#5f5f5f'],
    iron:   ['#d8d8d8','#f2f2f2','#9a9a9a'],
    gold:   ['#f7d24a','#fff0a0','#c79a16'],
    diamond:['#4fe6df','#a8fffb','#1f9aa0'],
  };
  const HANDLE=['#8a5a2c','#a8763f','#5e3a18']; // wooden stick handle
  function px(ctx,x,y,c){ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}
  function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  // Draw a diagonal wooden handle from bottom-left to upper area
  function handle(ctx){
    const[b,hi,sh]=HANDLE;
    for(let i=0;i<20;i++){const x=8+Math.floor(i*0.55),y=26-i;rect(ctx,x,y,3,2,b);px(ctx,x,y,hi);px(ctx,x+2,y+1,sh);}
  }
  function drawPick(ctx,mat){const[b,hi,sh]=HEAD[mat];handle(ctx);
    // arc-shaped head across the top
    const pts=[[6,9],[8,7],[11,6],[15,6],[19,6],[22,7],[24,9]];
    for(const[x,y]of pts){rect(ctx,x,y,3,3,b);px(ctx,x,y,hi);px(ctx,x+2,y+2,sh);}
    rect(ctx,14,8,4,4,b);px(ctx,15,9,hi);
  }
  function drawAxe(ctx,mat){const[b,hi,sh]=HEAD[mat];handle(ctx);
    // blade block near top-right
    rect(ctx,16,5,8,9,b);
    rect(ctx,14,7,2,5,b);
    for(let y=5;y<14;y++)px(ctx,16,y,hi);
    rect(ctx,22,6,2,7,sh);
    px(ctx,15,8,hi);px(ctx,15,9,hi);
  }
  function drawShovel(ctx,mat){const[b,hi,sh]=HEAD[mat];handle(ctx);
    // rounded scoop near top
    rect(ctx,12,4,8,8,b);
    rect(ctx,13,3,6,1,b);
    rect(ctx,13,12,6,2,b);
    for(let y=4;y<12;y++)px(ctx,12,y,hi);
    rect(ctx,18,5,2,7,sh);
  }
  function drawHoe(ctx,mat){const[b,hi,sh]=HEAD[mat];handle(ctx);
    rect(ctx,12,5,11,3,b);
    rect(ctx,12,8,3,4,b);
    for(let x=12;x<23;x++)px(ctx,x,5,hi);
    rect(ctx,12,10,3,2,sh);
  }
  const DRAW={pickaxe:drawPick,axe:drawAxe,shovel:drawShovel,hoe:drawHoe};
  function make(kind,mat){const c=document.createElement('canvas');c.width=TP;c.height=TP;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,TP,TP);(DRAW[kind]||drawPick)(ctx,mat);return c;}
  // Register a texture for every registered tool item (uses ITEMS metadata).
  for(const idStr in ITEMS){const id=+idStr;const it=ITEMS[id];if(it&&it.toolClass&&it.material&&DRAW[it.toolClass]){TOOL_TEXTURES[id]=make(it.toolClass,it.material);}}
  // The plain hoe (ITEM_HOE) has no material tier; give it a wood texture.
  if(typeof ITEM_HOE!=='undefined')TOOL_TEXTURES[ITEM_HOE]=make('hoe','wood');
  // Stick texture
  if(typeof ITEM_STICK!=='undefined'){const c=document.createElement('canvas');c.width=TP;c.height=TP;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const[b,hi,sh]=HANDLE;for(let i=0;i<18;i++){const x=12+Math.floor(i*0.25),y=25-i;rect(ctx,x,y,3,2,b);px(ctx,x,y,hi);px(ctx,x+2,y+1,sh);}TOOL_TEXTURES[ITEM_STICK]=c;}
})();
function toolTextureFor(id){return TOOL_TEXTURES[id]||null;}
