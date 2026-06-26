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
// Torch — drawn to fill most of the tile width so it reads correctly when
// mapped onto the thin column geometry (pushColumn hw≈0.12, top≈0.62). The
// wooden handle occupies the lower ~2/3 and a layered flame sits on top.
{const[ox,oy]=tileOrigin(T.TORCH);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // Wooden handle (fills the lower portion, broad so it doesn't get too thin).
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+10,oy+14,12,18);
 ctx.fillStyle='#7d5836';ctx.fillRect(ox+10,oy+14,4,18);   // lit left edge
 ctx.fillStyle='#553820';ctx.fillRect(ox+19,oy+14,3,18);   // shaded right edge
 ctx.fillStyle='#4a3018';ctx.fillRect(ox+10,oy+14,12,2);    // grain line
 // Charred top of the handle just under the flame.
 ctx.fillStyle='#2c2016';ctx.fillRect(ox+11,oy+13,10,2);
 // Flame: outer → inner, brightest core.
 ctx.fillStyle='#d8420c';ctx.fillRect(ox+9,oy+4,14,11);     // outer red
 ctx.fillStyle='#ff7a18';ctx.fillRect(ox+11,oy+2,10,11);    // orange body
 ctx.fillStyle='#ffc12e';ctx.fillRect(ox+13,oy+2,6,9);      // yellow
 ctx.fillStyle='#fff4b8';ctx.fillRect(ox+14,oy+3,4,5);      // hot core
 ctx.fillStyle='#ffffff';ctx.fillRect(ox+15,oy+4,2,2);}     // white tip
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
// --- MANGROVE: reddish-brown bark, deep green leaves, tangled root block -----
{const[ox,oy]=tileOrigin(T.MANGROVE_SIDE);const rnd=mulberry32(2030);ctx.fillStyle='#5e3320';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#552d1c','#6b3c26','#5a3120','#623622'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}ctx.fillStyle='#3d2014';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,3);ctx.fillStyle='#7a4a30';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.MANGROVE_TOP);ctx.fillStyle='#5e3320';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#8a5a3a';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#3d2014';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.MANGROVE_LEAVES,'#3c7a3a',['#356f33','#458a42','#2f662e','#3f8038'],0.95);const[ox,oy]=tileOrigin(T.MANGROVE_LEAVES);const rnd=mulberry32(2031);ctx.fillStyle='#234d22';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#56a44f';for(let i=0;i<9;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<7;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
{const[ox,oy]=tileOrigin(T.MANGROVE_ROOTS);const rnd=mulberry32(2032);ctx.fillStyle='#4a2b1a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);// vertical tangled root strands
 const cols=['#5e3320','#6b3c26','#42271a','#54301f'];for(let s=0;s<7;s++){const sx=Math.floor(rnd()*15)*2;ctx.fillStyle=cols[Math.floor(rnd()*cols.length)];for(let y=0;y<TILE_PX;y+=2){const wob=Math.round(Math.sin((y/6)+s)*2/2)*2;ctx.fillRect(ox+Math.max(0,Math.min(TILE_PX-2,sx+wob)),oy+y,2,2);}}
 ctx.fillStyle='#2e1a0f';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,2);ctx.fillStyle='#7a4a30';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,2);}
// --- PALM (oasis): pale fibrous trunk, bright fan-frond leaves ---------------
{const[ox,oy]=tileOrigin(T.PALM_SIDE);const rnd=mulberry32(2033);ctx.fillStyle='#9c7b4a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#8f6f42','#a98a55','#937340','#a07d4c'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}// horizontal fibre rings
 ctx.fillStyle='#6f5530';for(let y=0;y<TILE_PX;y+=6)ctx.fillRect(ox,oy+y,TILE_PX,2);ctx.fillStyle='#bda06a';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.PALM_TOP);ctx.fillStyle='#9c7b4a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#bda06a';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#6f5530';ctx.lineWidth=2;ctx.strokeRect(ox+9,oy+9,14,14);}
{noisy(T.PALM_LEAVES,'#3f9a44',['#37893c','#4cae50','#319036','#43a047'],0.92);const[ox,oy]=tileOrigin(T.PALM_LEAVES);const rnd=mulberry32(2034);ctx.fillStyle='#256b29';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#67c66b';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<8;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
// --- MAPLE (autumn forest): grey-brown bark + red/orange/yellow foliage ------
{const[ox,oy]=tileOrigin(T.MAPLE_SIDE);const rnd=mulberry32(2035);ctx.fillStyle='#5b4a3a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#51412f','#665241','#574736','#5e4d3b'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}ctx.fillStyle='#3a2c1e';for(let i=0;i<9;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,3);ctx.fillStyle='#7a6750';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const[ox,oy]=tileOrigin(T.MAPLE_TOP);ctx.fillStyle='#5b4a3a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);ctx.fillStyle='#8a7458';ctx.fillRect(ox+4,oy+4,24,24);ctx.strokeStyle='#51412f';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}
{noisy(T.MAPLE_LEAVES_RED,'#c2362a',['#b22c22','#d24433','#a82720','#cb3b2c'],0.95);const[ox,oy]=tileOrigin(T.MAPLE_LEAVES_RED);const rnd=mulberry32(2036);ctx.fillStyle='#8a1f18';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#e8643f';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<7;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
{noisy(T.MAPLE_LEAVES_ORANGE,'#d97a26',['#cd6f1f','#e88a35','#c2661c','#df8030'],0.95);const[ox,oy]=tileOrigin(T.MAPLE_LEAVES_ORANGE);const rnd=mulberry32(2037);ctx.fillStyle='#a85614';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#f5a94f';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<7;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
{noisy(T.MAPLE_LEAVES_YELLOW,'#e3b62c',['#d7aa22','#efc63f','#cba01d','#e6bd34'],0.95);const[ox,oy]=tileOrigin(T.MAPLE_LEAVES_YELLOW);const rnd=mulberry32(2038);ctx.fillStyle='#b58c16';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#f7dc6a';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);for(let i=0;i<7;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
// --- New flowers for the FLOWER FIELD ---------------------------------------
flowerTile(T.FLOWER_ALLIUM,9314,'#b06cd8','#cf9bee','#7d3aa8');   // purple allium
flowerTile(T.FLOWER_TULIP,9315,'#e8552e','#ff8a5e','#3f8a2e');   // orange tulip
flowerTile(T.FLOWER_OXEYE,9316,'#f4f4f0','#ffffff','#f2c800');   // white oxeye daisy
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
// --- Wooden door (oak): warm planks matching T.PLANKS, drawn as two stacked
// halves. The TOP half carries a small glazed window with a lattice; the
// BOTTOM half has two recessed vertical panels. Both share an outer frame so
// the two tiles read as one continuous door when stacked vertically.
function doorBase(t,seed){const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);
 // warm oak plank body, same palette as PLANKS
 ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 for(let i=0;i<60;i++){ctx.fillStyle=['#a37e45','#bb945a','#9c7840'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
 // faint vertical wood grain
 ctx.fillStyle='#9c7840';for(let x=0;x<TILE_PX;x+=6)ctx.fillRect(ox+x,oy,1,TILE_PX);
 // dark outer frame so stacked halves frame the whole door
 ctx.fillStyle='#7d5d30';ctx.fillRect(ox,oy,2,TILE_PX);ctx.fillRect(ox+TILE_PX-2,oy,2,TILE_PX);
 return[ox,oy];}
// Top half: window with a lattice of glass panes set into the upper planks.
{const[ox,oy]=doorBase(T.DOOR_TOP,2050);
 ctx.fillStyle='#7d5d30';ctx.fillRect(ox,oy,TILE_PX,2); // top edge of the door
 // recessed window opening near the top
 const wx=ox+8,wy=oy+6,ww=16,wh=14;
 ctx.fillStyle='#5e4622';ctx.fillRect(wx-2,wy-2,ww+4,wh+4); // dark window frame
 ctx.fillStyle='#cfeffb';ctx.fillRect(wx,wy,ww,wh);          // glass
 // glass highlight streaks (reuse the glass-tile look)
 ctx.fillStyle='rgba(220,245,255,0.95)';for(let i=0;i<6;i++)ctx.fillRect(wx+2+i*2,wy+10-i*2,2,2);
 // lattice muntins splitting the pane into a small grid
 ctx.fillStyle='#5e4622';ctx.fillRect(wx+ww/2-1,wy,2,wh);ctx.fillRect(wx,wy+wh/2-1,ww,2);
 // a couple of frame nails
 ctx.fillStyle='#4e3a1c';ctx.fillRect(ox+6,oy+TILE_PX-6,2,2);ctx.fillRect(ox+24,oy+TILE_PX-6,2,2);}
// Bottom half: two tall recessed vertical panels carved into the planks.
{const[ox,oy]=doorBase(T.DOOR_BOTTOM,2051);
 ctx.fillStyle='#7d5d30';ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2); // bottom edge
 function panel(px,py,pw,ph){
  ctx.fillStyle='#7d5d30';ctx.fillRect(ox+px-1,oy+py-1,pw+2,ph+2);      // recessed border
  ctx.fillStyle='#a37e45';ctx.fillRect(ox+px,oy+py,pw,ph);             // sunken face
  ctx.fillStyle='#8a6a3c';ctx.fillRect(ox+px,oy+py,pw,1);ctx.fillRect(ox+px,oy+py,1,ph); // shadow edge
  ctx.fillStyle='#bb945a';ctx.fillRect(ox+px+pw-1,oy+py+1,1,ph-1);ctx.fillRect(ox+px+1,oy+py+ph-1,pw-1,1);} // lit edge
 panel(5,3,9,26);panel(18,3,9,26);
 // door handle near the right edge
 ctx.fillStyle='#4e3a1c';ctx.fillRect(ox+27,oy+12,2,4);ctx.fillStyle='#3a2a12';ctx.fillRect(ox+28,oy+13,1,2);}
// --- Bed -------------------------------------------------------------------
// Top: a red quilted mattress with a white pillow at one end and quilt seams.
{const[ox,oy]=tileOrigin(T.BED_TOP);const rnd=mulberry32(2060);
 // red mattress base
 ctx.fillStyle='#b53b32';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 for(let i=0;i<70;i++){ctx.fillStyle=['#a8342b','#c14138','#9e2f27'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
 // quilt seam grid
 ctx.fillStyle='rgba(80,20,16,0.5)';for(let x=8;x<TILE_PX;x+=8)ctx.fillRect(ox+x,oy+8,1,TILE_PX-8);for(let y=14;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,1);
 // white pillow across the top edge
 ctx.fillStyle='#eee9e2';ctx.fillRect(ox+2,oy+2,TILE_PX-4,8);
 ctx.fillStyle='#fbf8f3';ctx.fillRect(ox+3,oy+3,TILE_PX-6,3);
 ctx.fillStyle='#d8d2c8';ctx.fillRect(ox+2,oy+9,TILE_PX-4,1);
 // pillow crease
 ctx.fillStyle='rgba(180,170,158,0.6)';ctx.fillRect(ox+TILE_PX/2-1,oy+3,1,6);}
// Side: red cloth over a wooden bed frame with little legs.
{const[ox,oy]=tileOrigin(T.BED_SIDE);
 // wooden frame underneath
 ctx.fillStyle='#8a5a2c';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 // red blanket draped over the top ~two-thirds
 ctx.fillStyle='#b53b32';ctx.fillRect(ox,oy,TILE_PX,20);
 const rnd=mulberry32(2061);for(let i=0;i<40;i++){ctx.fillStyle=['#a8342b','#c14138'][Math.floor(rnd()*2)];ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*10)*2,2,2);}
 // blanket bottom hem
 ctx.fillStyle='#8a201a';ctx.fillRect(ox,oy+19,TILE_PX,2);
 // wooden frame rail + legs
 ctx.fillStyle='#6f4a24';ctx.fillRect(ox,oy+21,TILE_PX,4);
 ctx.fillStyle='#5e3f1e';ctx.fillRect(ox+2,oy+25,5,7);ctx.fillRect(ox+TILE_PX-7,oy+25,5,7);}
// End (head/footboard): wooden board with the red blanket showing above it.
{const[ox,oy]=tileOrigin(T.BED_END);
 ctx.fillStyle='#8a5a2c';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 // red blanket edge at the very top
 ctx.fillStyle='#b53b32';ctx.fillRect(ox,oy,TILE_PX,7);
 ctx.fillStyle='#8a201a';ctx.fillRect(ox,oy+6,TILE_PX,1);
 // wooden plank grain on the board
 const rnd=mulberry32(2062);for(let x=0;x<TILE_PX;x+=2){ctx.fillStyle=['#7d5128','#946133','#85562b'][Math.floor(rnd()*3)];ctx.fillRect(ox+x,oy+8,2,TILE_PX-8);}
 ctx.fillStyle='#6f4a24';ctx.fillRect(ox,oy+7,TILE_PX,2);
 // little legs
 ctx.fillStyle='#5e3f1e';ctx.fillRect(ox+2,oy+25,5,7);ctx.fillRect(ox+TILE_PX-7,oy+25,5,7);}
// ---- Copper blocks (4 oxidation stages: raw → exposed → weathered → oxidized) ----
// T.COPPER=120, T.COPPER_EXPOSED=121, T.COPPER_WEATHERED=122, T.COPPER_OXIDIZED=123
{const rnd=mulberry32(8001);noisy(T.COPPER,'#c8773a',['#b86c32','#d98442','#bf7030','#d17c3c'],0.65);const[ox,oy]=tileOrigin(T.COPPER);ctx.fillStyle='#e8a060';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#9a5520';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const rnd=mulberry32(8002);noisy(T.COPPER_EXPOSED,'#b87a4a',['#a86e40','#c48452','#9c6438','#be7e4a'],0.65);const[ox,oy]=tileOrigin(T.COPPER_EXPOSED);ctx.fillStyle='#7aab78';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#8abc88';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const rnd=mulberry32(8003);noisy(T.COPPER_WEATHERED,'#5a9c72',['#4e8c66','#66aa80','#458460','#5aa070'],0.7);const[ox,oy]=tileOrigin(T.COPPER_WEATHERED);ctx.fillStyle='#7abf90';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#3a7c56';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
{const rnd=mulberry32(8004);noisy(T.COPPER_OXIDIZED,'#4a9c88',['#3e8c7a','#58aa94','#368478','#4e9e8c'],0.7);const[ox,oy]=tileOrigin(T.COPPER_OXIDIZED);ctx.fillStyle='#6abcaa';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#2e7462';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// =====================================================================
//  NEW TILES (rows 15–23 of the expanded atlas)
// =====================================================================

// ---- TNT ----
{const[ox,oy]=tileOrigin(T.TNT_SIDE);
 noisy(T.TNT_SIDE,'#c0392b',['#a93226','#d44636','#b03024'],0.7);
 // horizontal "TNT" label band in the middle
 ctx.fillStyle='#f5f5f5';ctx.fillRect(ox+2,oy+11,28,10);
 ctx.fillStyle='#c0392b';
 // T
 ctx.fillRect(ox+4,oy+12,8,2);ctx.fillRect(ox+7,oy+14,2,6);
 // N
 ctx.fillRect(ox+14,oy+12,2,8);ctx.fillRect(ox+16,oy+12,2,2);ctx.fillRect(ox+18,oy+14,2,2);ctx.fillRect(ox+20,oy+16,2,2);ctx.fillRect(ox+20,oy+12,2,8);
 // T (second)
 ctx.fillRect(ox+24,oy+12,6,2);ctx.fillRect(ox+26,oy+14,2,6);
 // dark caps top+bottom
 ctx.fillStyle='#555';ctx.fillRect(ox,oy,TILE_PX,4);ctx.fillRect(ox,oy+28,TILE_PX,4);}

// ---- Wool 14 extra colors ----
function woolTile(t,base,hi,lo,seed){noisy(t,base,[hi,lo,base],0.85);const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);ctx.fillStyle=lo;for(let y=0;y<TILE_PX;y+=6)ctx.fillRect(ox,oy+y,TILE_PX,1);ctx.fillStyle=hi;for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
woolTile(T.WOOL_ORANGE,'#d4712a','#e8893e','#aa5a1e',9001);
woolTile(T.WOOL_MAGENTA,'#be3fc4','#d458da','#982fa0',9002);
woolTile(T.WOOL_LIGHT_BLUE,'#58a0d6','#70b8ec','#3f7eaa',9003);
woolTile(T.WOOL_YELLOW,'#e8c83a','#f5da5a','#c4a828',9004);
woolTile(T.WOOL_LIME,'#62c22a','#7ada3c','#4a9c1e',9005);
woolTile(T.WOOL_PINK,'#e8849a','#f898b0','#c06276',9006);
woolTile(T.WOOL_GRAY,'#5a5a5a','#6e6e6e','#424242',9007);
woolTile(T.WOOL_LIGHT_GRAY,'#aaaaaa','#bebebe','#8a8a8a',9008);
woolTile(T.WOOL_CYAN,'#208c9c','#2aa8b8','#166878',9009);
woolTile(T.WOOL_PURPLE,'#7c28c0','#9840d8','#5e1e96',9010);
woolTile(T.WOOL_BLUE,'#2848b0','#3860cc','#1e3490',9011);
woolTile(T.WOOL_BROWN,'#7a4e2a','#94623a','#5a3a1c',9012);
woolTile(T.WOOL_GREEN,'#3a7a28','#4a9a34','#2c6018',9013);
woolTile(T.WOOL_BLACK,'#1a1a1a','#2c2c2c','#0c0c0c',9014);

// ---- Terracotta (17 colors) ----
function terracottaTile(t,base,hi,lo,seed){noisy(t,base,[hi,lo],0.5);const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);ctx.fillStyle=lo;for(let y=4;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);ctx.fillStyle=hi;for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
terracottaTile(T.TERRACOTTA,'#9c6040','#ae7454','#7e4c30',9100);
terracottaTile(T.TERRACOTTA_RED,'#963828','#ac4838','#742a1e',9101);
terracottaTile(T.TERRACOTTA_ORANGE,'#c07040','#d48454','#9c5830',9102);
terracottaTile(T.TERRACOTTA_YELLOW,'#c8a848','#dcc05e','#a88c32',9103);
terracottaTile(T.TERRACOTTA_LIME,'#62843c','#78a050','#4a6628',9104);
terracottaTile(T.TERRACOTTA_GREEN,'#3a5a2a','#4a7038','#2a4020',9105);
terracottaTile(T.TERRACOTTA_CYAN,'#44787c','#589298','#305a60',9106);
terracottaTile(T.TERRACOTTA_LIGHT_BLUE,'#7098a8','#86b0c0','#547880',9107);
terracottaTile(T.TERRACOTTA_BLUE,'#344868','#445a7e','#243450',9108);
terracottaTile(T.TERRACOTTA_PURPLE,'#643c78','#7c5090','#4c2c60',9109);
terracottaTile(T.TERRACOTTA_MAGENTA,'#98447a','#ae5e94','#7a3060',9110);
terracottaTile(T.TERRACOTTA_PINK,'#c47888','#d893a0','#9c5866',9111);
terracottaTile(T.TERRACOTTA_BROWN,'#7a5038','#90664e','#5e3c26',9112);
terracottaTile(T.TERRACOTTA_GRAY,'#5c5848','#706c5c','#464230',9113);
terracottaTile(T.TERRACOTTA_LIGHT_GRAY,'#8e897a','#a4a090','#6c685c',9114);
terracottaTile(T.TERRACOTTA_BLACK,'#282420','#3a3632','#181410',9115);
terracottaTile(T.TERRACOTTA_WHITE,'#c6bfb4','#d8d2c8','#a49e92',9116);

// ---- Concrete (16 colors) – smooth, solid, slightly shiny ----
function concreteTile(t,base,hi,lo,seed){const[ox,oy]=tileOrigin(t);ctx.fillStyle=base;ctx.fillRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(seed);for(let i=0;i<20;i++){ctx.fillStyle=rnd()<0.5?hi:lo;ctx.fillRect(ox+Math.floor(rnd()*16)*2,oy+Math.floor(rnd()*16)*2,2,2);}ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);}
concreteTile(T.CONCRETE_RED,'#c03528','#d44838','#962a1e',9200);
concreteTile(T.CONCRETE_ORANGE,'#d4661e','#e87a30','#b05218',9201);
concreteTile(T.CONCRETE_YELLOW,'#e8c826','#f8dc40','#c0a01e',9202);
concreteTile(T.CONCRETE_LIME,'#5aac22','#72c636','#42881a',9203);
concreteTile(T.CONCRETE_GREEN,'#2e6e1a','#3e8826','#1e5010',9204);
concreteTile(T.CONCRETE_CYAN,'#158c9c','#22a8b8','#0c6a76',9205);
concreteTile(T.CONCRETE_LIGHT_BLUE,'#3494d0','#4cb0ec','#2476aa',9206);
concreteTile(T.CONCRETE_BLUE,'#2638bc','#3650d8','#1a2898',9207);
concreteTile(T.CONCRETE_PURPLE,'#6c24b4','#8438cc','#501890',9208);
concreteTile(T.CONCRETE_MAGENTA,'#be30a4','#d646bc','#962282',9209);
concreteTile(T.CONCRETE_PINK,'#e47088','#f488a2','#bc5268',9210);
concreteTile(T.CONCRETE_BROWN,'#6e4420','#84582e','#542e12',9211);
concreteTile(T.CONCRETE_GRAY,'#4a4a4a','#5e5e5e','#363636',9212);
concreteTile(T.CONCRETE_LIGHT_GRAY,'#8c8c8c','#a0a0a0','#747474',9213);
concreteTile(T.CONCRETE_BLACK,'#0e0e0e','#1e1e1e','#040404',9214);
concreteTile(T.CONCRETE_WHITE,'#e8e8e8','#f4f4f4','#d4d4d4',9215);

// ---- Glazed Terracotta (6 patterned colors) ----
function glazedTile(t,bg,fg,accent,seed){const[ox,oy]=tileOrigin(t);ctx.fillStyle=bg;ctx.fillRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(seed);// wavy diagonal swipe pattern
ctx.fillStyle=fg;for(let i=0;i<3;i++){const sx=Math.floor(rnd()*12),sy=Math.floor(rnd()*12);for(let d=0;d<16;d++)ctx.fillRect(ox+sx+d*2,oy+sy+d*2,4,4);}
ctx.fillStyle=accent;for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*14)*2,oy+Math.floor(rnd()*14)*2,4,4);
// border
ctx.fillStyle=fg;ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);ctx.fillRect(ox+TILE_PX-2,oy,2,TILE_PX);}
glazedTile(T.GLAZED_WHITE,'#d8d8cc','#b0a890','#f0eee4',9300);
glazedTile(T.GLAZED_ORANGE,'#d87840','#a05824','#e8b070',9301);
glazedTile(T.GLAZED_MAGENTA,'#c050a8','#8c2878','#e480cc',9302);
glazedTile(T.GLAZED_CYAN,'#208090','#145c68','#50b0c0',9303);
glazedTile(T.GLAZED_BLUE,'#2858b8','#1a3888','#5888e0',9304);
glazedTile(T.GLAZED_LIME,'#68c030','#4a9018','#9ee060',9305);

// ---- Banners ----
function bannerTile(t,main,stripe,seed){const[ox,oy]=tileOrigin(t);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(seed);// pole
ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+14,oy,4,TILE_PX);
// banner cloth (24x26 starting at x+4,y+2)
ctx.fillStyle=main;ctx.fillRect(ox+4,oy+2,24,26);
// horizontal stripe pattern
ctx.fillStyle=stripe;ctx.fillRect(ox+4,oy+12,24,6);
// decorative dots
ctx.fillStyle='rgba(255,255,255,0.4)';for(let i=0;i<5;i++)ctx.fillRect(ox+6+i*4,oy+8,2,2);
ctx.fillStyle=stripe;ctx.fillRect(ox+4,oy+2,24,3);}
bannerTile(T.BANNER_WHITE,'#e8e4de','#b0ac99',9400);
bannerTile(T.BANNER_RED,'#b03028','#d44038',9401);
bannerTile(T.BANNER_BLUE,'#2040a8','#3050cc',9402);
bannerTile(T.BANNER_GREEN,'#285a18','#38782a',9403);
bannerTile(T.BANNER_YELLOW,'#d4b820','#eccc30',9404);
bannerTile(T.BANNER_BLACK,'#1c1c1c','#343434',9405);

// ---- Nether Brick ----
{noisy(T.NETHER_BRICK,'#2b1220',['#24101a','#361826'],0.5);const[ox,oy]=tileOrigin(T.NETHER_BRICK);ctx.fillStyle='#180a12';ctx.fillRect(ox,oy+15,TILE_PX,2);ctx.fillRect(ox+15,oy,2,16);ctx.fillRect(ox+7,oy+16,2,16);ctx.fillRect(ox+23,oy+16,2,16);}

// ---- Netherrack ----
{noisy(T.NETHERRACK,'#7c2828',['#6e2020','#8e3030','#642020','#782828'],0.8);const[ox,oy]=tileOrigin(T.NETHERRACK);const rnd=mulberry32(9501);ctx.fillStyle='#4a1414';for(let i=0;i<12;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,4,2);if(rnd()<0.4)ctx.fillRect(ox+cx,oy+cy+2,2,2);}ctx.fillStyle='#ac4040';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// ---- Crying Obsidian ----
{noisy(T.CRYING_OBSIDIAN,'#1a0a2c',['#140820','#201036','#0c0618','#241438'],0.9);const[ox,oy]=tileOrigin(T.CRYING_OBSIDIAN);const rnd=mulberry32(9502);ctx.fillStyle='#6a30ff';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);// drip streaks
ctx.fillStyle='#9060ff';for(let x=8;x<TILE_PX;x+=7){const startY=Math.floor(rnd()*8)*2;for(let y=startY;y<TILE_PX;y+=2)if(rnd()<0.7)ctx.fillRect(ox+x,oy+y,2,2);}ctx.fillStyle='#b890ff';for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// ---- Chiseled Stone Brick ----
{brickMasonry(T.CHISELED_STONE_BRICK,'#8d8d8d',['#7f7f7f','#9a9a9a','#757575','#868686'],9503);const[ox,oy]=tileOrigin(T.CHISELED_STONE_BRICK);// carved circle/flower motif
ctx.fillStyle='#6a6a6a';ctx.strokeStyle='#6a6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ox+16,oy+16,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a0a0a0';ctx.fillRect(ox+12,oy+14,8,4);ctx.fillRect(ox+14,oy+12,4,8);}

// ---- Mossy Cobblestone ----
{noisy(T.MOSSY_COBBLE,'#6c7a62',['#5e6c55','#7a8870','#566050','#70826a'],0.5);const[ox,oy]=tileOrigin(T.MOSSY_COBBLE);const rnd=mulberry32(9504);for(let i=0;i<7;i++){const cx=4+Math.floor(rnd()*12)*2,cy=4+Math.floor(rnd()*12)*2,r=3+Math.floor(rnd()*3)*2;ctx.fillStyle=rnd()<0.5?'#5e6c55':'#606040';ctx.fillRect(ox+cx-r/2,oy+cy-r/2,r,r);ctx.strokeStyle='#404830';ctx.lineWidth=1;ctx.strokeRect(ox+cx-r/2,oy+cy-r/2,r,r);}ctx.fillStyle='#4e7a3a';for(let i=0;i<16;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// =====================================================================
//  REDSTONE COMPONENT TILES (rows 24-26 of the expanded atlas)
// =====================================================================

// ---- Redstone Dust (off) ----
{const[ox,oy]=tileOrigin(T.REDSTONE_DUST_OFF);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // faint grey X cross
 ctx.fillStyle='#5a3a3a';ctx.fillRect(ox+14,oy+2,4,28);ctx.fillRect(ox+2,oy+14,28,4);
 ctx.fillStyle='#4a2a2a';ctx.fillRect(ox+14,oy+2,2,28);ctx.fillRect(ox+2,oy+14,28,2);}

// ---- Redstone Dust (on) ----
{const[ox,oy]=tileOrigin(T.REDSTONE_DUST_ON);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // bright red X cross with glow
 ctx.fillStyle='#d43030';ctx.fillRect(ox+13,oy+2,6,28);ctx.fillRect(ox+2,oy+13,28,6);
 ctx.fillStyle='#ff5050';ctx.fillRect(ox+14,oy+2,4,28);ctx.fillRect(ox+2,oy+14,28,4);
 ctx.fillStyle='#ff8080';ctx.fillRect(ox+15,oy+3,2,26);ctx.fillRect(ox+3,oy+15,26,2);
 // corner dots
 ctx.fillStyle='#ff4040';for(const[cx,cy]of[[6,6],[24,6],[6,24],[24,24]])ctx.fillRect(ox+cx,oy+cy,4,4);}

// ---- Redstone Torch (off) ----
{const[ox,oy]=tileOrigin(T.REDSTONE_TORCH_OFF);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+10,oy+14,12,18);
 ctx.fillStyle='#553820';ctx.fillRect(ox+19,oy+14,3,18);
 ctx.fillStyle='#4a3018';ctx.fillRect(ox+10,oy+14,12,2);
 // dark ember (off)
 ctx.fillStyle='#5a1a1a';ctx.fillRect(ox+9,oy+6,14,9);
 ctx.fillStyle='#3a0808';ctx.fillRect(ox+11,oy+4,10,9);
 ctx.fillStyle='#4a1010';ctx.fillRect(ox+13,oy+4,6,7);}

// ---- Redstone Torch (on) ----
{const[ox,oy]=tileOrigin(T.REDSTONE_TORCH_ON);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+10,oy+14,12,18);
 ctx.fillStyle='#7d5836';ctx.fillRect(ox+10,oy+14,4,18);
 ctx.fillStyle='#553820';ctx.fillRect(ox+19,oy+14,3,18);
 ctx.fillStyle='#2c2016';ctx.fillRect(ox+11,oy+13,10,2);
 // red flame
 ctx.fillStyle='#c02010';ctx.fillRect(ox+9,oy+4,14,11);
 ctx.fillStyle='#e83018';ctx.fillRect(ox+11,oy+2,10,11);
 ctx.fillStyle='#ff5030';ctx.fillRect(ox+13,oy+2,6,9);
 ctx.fillStyle='#ff8060';ctx.fillRect(ox+14,oy+3,4,5);
 ctx.fillStyle='#ffb090';ctx.fillRect(ox+15,oy+4,2,2);}

// ---- Lever (side, off) ----
{const[ox,oy]=tileOrigin(T.LEVER_SIDE);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // stone base
 noisy(T.LEVER_SIDE,'#8a8a8a',['#7d7d7d','#969696'],0.4);
 const[ox2,oy2]=tileOrigin(T.LEVER_SIDE);
 // lever handle (pointing down = off)
 ctx.fillStyle='#5e3a10';ctx.fillRect(ox2+13,oy2+18,6,12);
 ctx.fillStyle='#8a5a22';ctx.fillRect(ox2+14,oy2+18,3,10);
 // pivot block
 ctx.fillStyle='#3a3a3a';ctx.fillRect(ox2+10,oy2+14,12,6);
 ctx.fillStyle='#555';ctx.fillRect(ox2+11,oy2+15,10,4);
 ctx.fillStyle='#666';ctx.fillRect(ox2+11,oy2+15,2,4);}

// ---- Lever (on) ----
{const[ox,oy]=tileOrigin(T.LEVER_ON);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 noisy(T.LEVER_ON,'#8a8a8a',['#7d7d7d','#969696'],0.4);
 const[ox2,oy2]=tileOrigin(T.LEVER_ON);
 // lever handle (pointing up = on)
 ctx.fillStyle='#5e3a10';ctx.fillRect(ox2+13,oy2+2,6,12);
 ctx.fillStyle='#8a5a22';ctx.fillRect(ox2+14,oy2+2,3,10);
 ctx.fillStyle='#3a3a3a';ctx.fillRect(ox2+10,oy2+14,12,6);
 ctx.fillStyle='#555';ctx.fillRect(ox2+11,oy2+15,10,4);
 // red glow dot
 ctx.fillStyle='#e03020';ctx.fillRect(ox2+15,oy2+15,2,2);}

// ---- Repeater (off) ----
{const[ox,oy]=tileOrigin(T.REPEATER_OFF);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // stone slab base
 ctx.fillStyle='#7c7c7c';ctx.fillRect(ox,oy+16,TILE_PX,16);
 ctx.fillStyle='#8e8e8e';ctx.fillRect(ox,oy+16,TILE_PX,2);
 // two small torches (off)
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+4,oy+8,4,10);ctx.fillRect(ox+24,oy+8,4,10);
 ctx.fillStyle='#5a1a1a';ctx.fillRect(ox+3,oy+4,6,6);ctx.fillRect(ox+23,oy+4,6,6);
 // dust line
 ctx.fillStyle='#5a3a3a';ctx.fillRect(ox+2,oy+18,28,3);}

// ---- Repeater (on) ----
{const[ox,oy]=tileOrigin(T.REPEATER_ON);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#7c7c7c';ctx.fillRect(ox,oy+16,TILE_PX,16);
 ctx.fillStyle='#8e8e8e';ctx.fillRect(ox,oy+16,TILE_PX,2);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox+4,oy+8,4,10);ctx.fillRect(ox+24,oy+8,4,10);
 // on torches
 ctx.fillStyle='#c02010';ctx.fillRect(ox+3,oy+4,6,6);ctx.fillRect(ox+23,oy+4,6,6);
 ctx.fillStyle='#ff5030';ctx.fillRect(ox+4,oy+5,4,3);ctx.fillRect(ox+24,oy+5,4,3);
 // bright dust line
 ctx.fillStyle='#e83018';ctx.fillRect(ox+2,oy+18,28,3);}

// ---- Piston side ----
{noisy(T.PISTON_SIDE,'#7c7c7c',['#6e6e6e','#8b8b8b'],0.5);const[ox,oy]=tileOrigin(T.PISTON_SIDE);
 // wooden planks visible at the top
 ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,10);
 ctx.fillStyle='#9c7840';ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy+8,TILE_PX,2);}

// ---- Piston top (normal face) ----
{const[ox,oy]=tileOrigin(T.PISTON_FACE);
 ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 const rnd=mulberry32(9600);for(let i=0;i<40;i++){ctx.fillStyle=['#a37e45','#bb945a','#9c7840'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
 ctx.fillStyle='#7d5d30';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);
 // iron cross in the center
 ctx.fillStyle='#aaaaaa';ctx.fillRect(ox+12,oy+6,8,20);ctx.fillRect(ox+6,oy+12,20,8);
 ctx.fillStyle='#cccccc';ctx.fillRect(ox+13,oy+7,6,18);ctx.fillRect(ox+7,oy+13,18,6);}

// ---- Piston sticky face ----
{const[ox,oy]=tileOrigin(T.PISTON_STICKY_FACE);
 ctx.fillStyle='#b08a4f';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 const rnd=mulberry32(9601);for(let i=0;i<40;i++){ctx.fillStyle=['#a37e45','#bb945a','#9c7840'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
 ctx.fillStyle='#7d5d30';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);
 // green slime blob
 ctx.fillStyle='#3a9a4a';ctx.fillRect(ox+8,oy+8,16,16);
 ctx.fillStyle='#4ab85a';ctx.fillRect(ox+10,oy+10,12,12);
 ctx.fillStyle='#5cd66c';ctx.fillRect(ox+12,oy+12,8,8);}

// ---- Piston extension rod ----
{const[ox,oy]=tileOrigin(T.PISTON_EXTENSION);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // vertical wooden rod
 ctx.fillStyle='#b08a4f';ctx.fillRect(ox+10,oy,12,TILE_PX);
 ctx.fillStyle='#9c7840';ctx.fillRect(ox+10,oy,2,TILE_PX);ctx.fillRect(ox+20,oy,2,TILE_PX);
 // iron band at top
 ctx.fillStyle='#aaaaaa';ctx.fillRect(ox+8,oy,16,6);ctx.fillRect(ox+8,oy+TILE_PX-6,16,6);}

// ---- Dispenser front ----
{noisy(T.DISPENSER_FRONT,'#7c7c7c',['#6e6e6e','#8b8b8b'],0.5);const[ox,oy]=tileOrigin(T.DISPENSER_FRONT);
 // dark nozzle hole in the center
 ctx.fillStyle='#1a1a1a';ctx.fillRect(ox+8,oy+8,16,16);
 ctx.fillStyle='#0a0a0a';ctx.fillRect(ox+10,oy+10,12,12);
 // grey border around nozzle
 ctx.fillStyle='#555';ctx.fillRect(ox+6,oy+6,20,2);ctx.fillRect(ox+6,oy+24,20,2);ctx.fillRect(ox+6,oy+6,2,20);ctx.fillRect(ox+24,oy+6,2,20);}

// ---- Dispenser/Dropper side ----
{noisy(T.DISPENSER_SIDE,'#7c7c7c',['#6e6e6e','#8b8b8b'],0.5);const[ox,oy]=tileOrigin(T.DISPENSER_SIDE);
 // faint lines
 ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(ox,oy+15,TILE_PX,2);}

// ---- Dropper front (smaller hole) ----
{noisy(T.DROPPER_FRONT,'#7c7c7c',['#6e6e6e','#8b8b8b'],0.5);const[ox,oy]=tileOrigin(T.DROPPER_FRONT);
 ctx.fillStyle='#1a1a1a';ctx.fillRect(ox+10,oy+10,12,12);
 ctx.fillStyle='#0a0a0a';ctx.fillRect(ox+12,oy+12,8,8);
 // triangle pointing down to distinguish from dispenser
 ctx.fillStyle='#888';ctx.beginPath();ctx.moveTo(ox+12,oy+8);ctx.lineTo(ox+20,oy+8);ctx.lineTo(ox+16,oy+12);ctx.closePath();ctx.fill();}

// ---- Hopper side ----
{noisy(T.HOPPER_SIDE,'#5a5a5a',['#4e4e4e','#686868'],0.5);const[ox,oy]=tileOrigin(T.HOPPER_SIDE);
 // funnel shape outline
 ctx.fillStyle='#333';ctx.fillRect(ox+2,oy+2,28,4);  // top bar
 ctx.fillRect(ox+2,oy+2,4,20);ctx.fillRect(ox+26,oy+2,4,20); // sides
 // narrowing funnel
 ctx.fillStyle='#404040';ctx.fillRect(ox+6,oy+22,20,4);ctx.fillRect(ox+8,oy+26,16,2);
 ctx.fillStyle='#333';ctx.fillRect(ox+10,oy+28,12,4);}// output pipe

// ---- Hopper inside (top) ----
{const[ox,oy]=tileOrigin(T.HOPPER_INSIDE);
 ctx.fillStyle='#4a4a4a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#333';ctx.fillRect(ox+4,oy+4,24,24);
 ctx.fillStyle='#222';ctx.fillRect(ox+8,oy+8,16,16);}

// ---- Observer face (has eye/sensor) ----
{noisy(T.OBSERVER_FACE,'#5a5a5a',['#4e4e4e','#686868'],0.5);const[ox,oy]=tileOrigin(T.OBSERVER_FACE);
 // eye / sensor lens
 ctx.fillStyle='#1a1a2a';ctx.fillRect(ox+8,oy+8,16,16);
 ctx.fillStyle='#3a3a6a';ctx.fillRect(ox+10,oy+10,12,12);
 ctx.fillStyle='#5a5aaa';ctx.fillRect(ox+12,oy+12,8,8);
 ctx.fillStyle='#8080cc';ctx.fillRect(ox+14,oy+14,4,4);
 ctx.fillStyle='#aaaaff';ctx.fillRect(ox+15,oy+15,2,2);}

// ---- Observer back (output, emits signal) ----
{noisy(T.OBSERVER_BACK,'#5a5a5a',['#4e4e4e','#686868'],0.5);const[ox,oy]=tileOrigin(T.OBSERVER_BACK);
 // redstone signal dot
 ctx.fillStyle='#8a2a2a';ctx.fillRect(ox+10,oy+10,12,12);
 ctx.fillStyle='#c03030';ctx.fillRect(ox+12,oy+12,8,8);
 ctx.fillStyle='#e84040';ctx.fillRect(ox+14,oy+14,4,4);}

// ---- Observer side ----
{noisy(T.OBSERVER_SIDE,'#5a5a5a',['#4e4e4e','#686868'],0.5);const[ox,oy]=tileOrigin(T.OBSERVER_SIDE);
 // arrow indicating detection direction
 ctx.fillStyle='#888';ctx.fillRect(ox+4,oy+14,16,4);
 ctx.fillStyle='#aaa';ctx.beginPath();ctx.moveTo(ox+20,oy+10);ctx.lineTo(ox+28,oy+16);ctx.lineTo(ox+20,oy+22);ctx.closePath();ctx.fill();}

// =====================================================================
//  NEW TILES (row 27 of the expanded atlas)
// =====================================================================

// ---- Sign board (看板) ----
{const[ox,oy]=tileOrigin(T.SIGN_BOARD);
 // warm oak plank background
 ctx.fillStyle='#c9a06a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 const rnd=mulberry32(10001);
 for(let i=0;i<40;i++){ctx.fillStyle=['#b8924d','#d9b07a','#bc9558'][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
 // wood grain lines
 ctx.fillStyle='#a07840';for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);
 // dark border frame
 ctx.fillStyle='#6b4a20';ctx.fillRect(ox,oy,TILE_PX,3);ctx.fillRect(ox,oy+TILE_PX-3,TILE_PX,3);ctx.fillRect(ox,oy,3,TILE_PX);ctx.fillRect(ox+TILE_PX-3,oy,3,TILE_PX);
 // text lines (decorative placeholder)
 ctx.fillStyle='#3a2810';ctx.fillRect(ox+6,oy+10,20,2);ctx.fillRect(ox+6,oy+16,16,2);ctx.fillRect(ox+6,oy+22,18,2);}

// ---- Iron Bars (鉄格子) ----
{const[ox,oy]=tileOrigin(T.IRON_BARS);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // vertical iron bars with shading
 const barColor='#b0b0b0',barHi='#d4d4d4',barShadow='#787878';
 for(let x=4;x<TILE_PX;x+=8){
   ctx.fillStyle=barShadow;ctx.fillRect(ox+x+2,oy,2,TILE_PX);
   ctx.fillStyle=barColor;ctx.fillRect(ox+x,oy,4,TILE_PX);
   ctx.fillStyle=barHi;ctx.fillRect(ox+x,oy,1,TILE_PX);}
 // horizontal connecting bars near top and bottom
 ctx.fillStyle=barColor;ctx.fillRect(ox,oy+6,TILE_PX,3);ctx.fillRect(ox,oy+23,TILE_PX,3);
 ctx.fillStyle=barShadow;ctx.fillRect(ox,oy+8,TILE_PX,1);ctx.fillRect(ox,oy+25,TILE_PX,1);}

// ---- Flower Pot (花瓶・植木鉢) ----
{const[ox,oy]=tileOrigin(T.FLOWER_POT);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // terracotta pot body
 ctx.fillStyle='#9e4f2a';ctx.fillRect(ox+8,oy+16,16,14);
 // wider rim at the top
 ctx.fillStyle='#b85c30';ctx.fillRect(ox+6,oy+14,20,4);
 ctx.fillStyle='#c86838';ctx.fillRect(ox+6,oy+14,20,2);
 // rim highlight
 ctx.fillStyle='#d07040';ctx.fillRect(ox+7,oy+14,18,1);
 // shading on pot body
 ctx.fillStyle='#7a3c1e';ctx.fillRect(ox+21,oy+16,3,14);
 ctx.fillStyle='#c06030';ctx.fillRect(ox+8,oy+16,3,12);
 // bottom
 ctx.fillStyle='#7a3c1e';ctx.fillRect(ox+8,oy+28,16,2);
 // dirt inside the pot
 ctx.fillStyle='#6b4020';ctx.fillRect(ox+9,oy+12,14,4);
 ctx.fillStyle='#7a5030';ctx.fillRect(ox+10,oy+12,12,2);}

// ---- Item Frame (額縁) ----
{const[ox,oy]=tileOrigin(T.ITEM_FRAME);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
 // wooden frame border
 ctx.fillStyle='#9c7040';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 // inner cutout (cream background)
 ctx.fillStyle='#e8d8b0';ctx.fillRect(ox+5,oy+5,22,22);
 // leather center backing
 ctx.fillStyle='#c8a868';ctx.fillRect(ox+7,oy+7,18,18);
 ctx.fillStyle='#d8b878';ctx.fillRect(ox+8,oy+8,16,14);
 // frame edge detail
 ctx.fillStyle='#7a5428';ctx.fillRect(ox,oy,TILE_PX,3);ctx.fillRect(ox,oy+TILE_PX-3,TILE_PX,3);ctx.fillRect(ox,oy,3,TILE_PX);ctx.fillRect(ox+TILE_PX-3,oy,3,TILE_PX);
 ctx.fillStyle='#b88a4a';ctx.fillRect(ox+1,oy+1,TILE_PX-2,2);ctx.fillRect(ox+1,oy,2,TILE_PX-2);
 // corner studs
 ctx.fillStyle='#5a3c18';ctx.fillRect(ox+3,oy+3,3,3);ctx.fillRect(ox+TILE_PX-6,oy+3,3,3);ctx.fillRect(ox+3,oy+TILE_PX-6,3,3);ctx.fillRect(ox+TILE_PX-6,oy+TILE_PX-6,3,3);}
// ---- New ores / rocks / mushrooms ----
// Reusable deepslate base (darker stone) for underground ores
function deepOreTile(t,colors,seed){noisy(t,'#4a4a52',['#404048','#54545c','#3a3a42','#4e4e56'],0.7);const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);for(let i=0;i<5;i++){const cx=4+Math.floor(rnd()*11)*2,cy=4+Math.floor(rnd()*11)*2;const main=colors[0],hi=colors[1],lo=colors[2];ctx.fillStyle=main;ctx.fillRect(ox+cx,oy+cy,4,4);ctx.fillRect(ox+cx-2,oy+cy,2,2);ctx.fillRect(ox+cx+4,oy+cy+2,2,2);ctx.fillStyle=hi;ctx.fillRect(ox+cx,oy+cy,2,2);ctx.fillStyle=lo;ctx.fillRect(ox+cx+2,oy+cy+2,2,2);}}
// Emerald ore (green gems in stone)
oreTile(T.EMERALD_ORE,['#27c07a','#7fffc0','#1a8a55'],3101);
// Ruby ore (custom red gems in deepslate)
deepOreTile(T.RUBY_ORE,['#e0264a','#ff9aae','#a01230'],3102);
// Sapphire ore (custom blue gems in deepslate)
deepOreTile(T.SAPPHIRE_ORE,['#2a6fe0','#9fc4ff','#1a4ab0'],3103);
// Obsidian ore (dark, with purple specks — deep/rare)
{noisy(T.OBSIDIAN_ORE,'#1a1422',['#120c18','#241c30','#0c0810','#2a2040'],0.85);const[ox,oy]=tileOrigin(T.OBSIDIAN_ORE);const rnd=mulberry32(3104);ctx.fillStyle='#6a4aa0';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#9a7ad0';for(let i=0;i<4;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Sulfur block (volcanic — bright yellow crystalline)
{noisy(T.SULFUR_BLOCK,'#d4c01a',['#c4b010','#e8d830','#b8a808','#f0e048'],0.7);const[ox,oy]=tileOrigin(T.SULFUR_ORE||T.SULFUR_BLOCK);const rnd=mulberry32(3105);for(let i=0;i<8;i++){const cx=4+Math.floor(rnd()*11)*2,cy=4+Math.floor(rnd()*11)*2;ctx.fillStyle='#a89008';ctx.fillRect(ox+cx,oy+cy,3,3);}ctx.fillStyle='#fff6a0';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Phosphor stone (glowing stone tablet — pale green glow)
{noisy(T.PHOSPHOR_STONE,'#3a4a3a',['#344034','#465246','#2e3a2e','#506050'],0.6);const[ox,oy]=tileOrigin(T.PHOSPHOR_STONE);const rnd=mulberry32(3106);ctx.fillStyle='#9affc0';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.fillStyle='#d8ffe8';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Polished amethyst (refined, smoother amethyst block)
{noisy(T.POLISHED_AMETHYST,'#a47ce0',['#9870d4','#b88cf0','#8c64c8','#c098f0'],0.5);const[ox,oy]=tileOrigin(T.POLISHED_AMETHYST);const rnd=mulberry32(3107);ctx.fillStyle='#d8b8ff';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.strokeStyle='#7a5aa8';ctx.lineWidth=1;ctx.strokeRect(ox+2,oy+2,TILE_PX-4,TILE_PX-4);}
// Lead ore (dark grey heavy ore in stone)
oreTile(T.LEAD_ORE,['#5a5e6a','#8a8e9a','#3a3e4a'],3108);
// Tin ore (silvery-light ore in stone)
oreTile(T.TIN_ORE,['#b8c0c8','#e0e8f0','#8a9098'],3109);
// Bronze block (iron+tin alloy — warm bronze metallic)
{noisy(T.BRONZE_BLOCK,'#b8743a',['#a86a32','#c8844a','#9c6028','#d09050'],0.6);const[ox,oy]=tileOrigin(T.BRONZE_BLOCK);const rnd=mulberry32(3110);ctx.fillStyle='#e8b070';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);ctx.strokeStyle='#7a4a22';ctx.lineWidth=1;ctx.strokeRect(ox+2,oy+2,TILE_PX-4,TILE_PX-4);}
// Lava rock (cooled lava — dark crust with orange veins)
{noisy(T.LAVA_ROCK,'#3a2418',['#2e1c12','#46301e','#241810','#523824'],0.7);const[ox,oy]=tileOrigin(T.LAVA_ROCK);const rnd=mulberry32(3111);ctx.fillStyle='#c4501a';for(let i=0;i<10;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,2,2);}ctx.fillStyle='#ff8030';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Tuff (dark volcanic rock)
noisy(T.TUFF,'#5a5450',['#4e4846','#665e5a','#46403c','#6e6660'],0.75);
// Deepslate (very dark stone)
{noisy(T.DEEPSLATE,'#3a3a42',['#343440','#44444c','#2e2e36','#404048'],0.7);const[ox,oy]=tileOrigin(T.DEEPSLATE);const rnd=mulberry32(3112);ctx.fillStyle='#2a2a32';for(let i=0;i<6;i++){const cx=Math.floor(rnd()*14)*2,cy=Math.floor(rnd()*14)*2;ctx.fillRect(ox+cx,oy+cy,4,2);}}
// Huge red mushroom (cross-plant: a red cap with white spots)
{const[ox,oy]=tileOrigin(T.HUGE_MUSHROOM_RED);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(3113);
// stem
ctx.fillStyle='#e8dcc0';ctx.fillRect(ox+13,oy+20,6,10);
// red cap (dome)
ctx.fillStyle='#c43030';ctx.fillRect(ox+6,oy+12,20,8);ctx.fillRect(ox+8,oy+10,16,2);ctx.fillRect(ox+10,oy+8,12,2);
ctx.fillStyle='#a82020';ctx.fillRect(ox+6,oy+18,20,2);
// white spots
ctx.fillStyle='#ffffff';ctx.fillRect(ox+9,oy+12,2,2);ctx.fillRect(ox+15,oy+10,2,2);ctx.fillRect(ox+21,oy+13,2,2);ctx.fillRect(ox+12,oy+14,2,2);ctx.fillRect(ox+18,oy+15,2,2);}
// Huge brown mushroom (cross-plant: a brown cap)
{const[ox,oy]=tileOrigin(T.HUGE_MUSHROOM_BROWN);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
// stem
ctx.fillStyle='#e8dcc0';ctx.fillRect(ox+13,oy+20,6,10);
// brown cap (dome)
ctx.fillStyle='#8a6a3a';ctx.fillRect(ox+6,oy+12,20,8);ctx.fillRect(ox+8,oy+10,16,2);ctx.fillRect(ox+10,oy+8,12,2);
ctx.fillStyle='#6a5028';ctx.fillRect(ox+6,oy+18,20,2);
// tan spots
ctx.fillStyle='#c8a878';ctx.fillRect(ox+10,oy+12,2,2);ctx.fillRect(ox+18,oy+12,2,2);ctx.fillRect(ox+14,oy+14,2,2);}
// Mushroom block (mycelium cap — red block with white spots)
{noisy(T.MUSHROOM_BLOCK,'#c43030',['#a82020','#d44040','#981818'],0.5);const[ox,oy]=tileOrigin(T.MUSHROOM_BLOCK);const rnd=mulberry32(3114);ctx.fillStyle='#ffffff';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Mushroom stem (pale mycelium trunk)
{noisy(T.MUSHROOM_STEM,'#e8dcc0',['#dcd0b0','#f0e4cc','#d0c4a4'],0.5);const[ox,oy]=tileOrigin(T.MUSHROOM_STEM);const rnd=mulberry32(3115);ctx.fillStyle='#c8b890';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// ==========================================================================
//  NEW BIOME / DECO TILES (Crystal Plains, Withered Forest, Coral Tidelands)
// ==========================================================================

// 12. Petrified Log Side — stone-grey wood grain, fossilised rings
{const[ox,oy]=tileOrigin(T.PETRIFIED_LOG_SIDE);const rnd=mulberry32(3200);
 ctx.fillStyle='#7a7268';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 for(let x=0;x<TILE_PX;x+=4){ctx.fillStyle=['#6e6860','#867e74','#726a62','#7e7670'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}
 ctx.fillStyle='#585250';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,3);
 ctx.fillStyle='#9a9490';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Petrified Log Top — concentric stone-grey rings
{const[ox,oy]=tileOrigin(T.PETRIFIED_LOG_TOP);
 ctx.fillStyle='#7a7268';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#9a9490';ctx.fillRect(ox+4,oy+4,24,24);
 ctx.strokeStyle='#585250';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}

// 13. Bamboo Block — compressed woven bamboo
{const[ox,oy]=tileOrigin(T.BAMBOO_BLOCK);const rnd=mulberry32(3201);
 ctx.fillStyle='#9ab040';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 // horizontal fibre bands
 for(let y=0;y<TILE_PX;y+=4){ctx.fillStyle=['#88a035','#a8c050','#809030','#b0d058'][Math.floor(rnd()*4)];ctx.fillRect(ox,oy+y,TILE_PX,2);}
 // vertical cane column dividers
 ctx.fillStyle='#6a7c20';for(let x=0;x<TILE_PX;x+=8)ctx.fillRect(ox+x,oy,2,TILE_PX);
 // highlight
 ctx.fillStyle='#c4e070';for(let i=0;i<6;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// 14. Fern Stem — delicate serrated fern frond on transparent tile
{const[ox,oy]=tileOrigin(T.FERN_STEM);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(3202);
 const stemX=15,cols=['#2d7a1c','#38922a','#1e6010','#4aaa38'];
 ctx.fillStyle=cols[0];for(let y=TILE_PX-2;y>6;y-=2)ctx.fillRect(ox+stemX,oy+y,2,2);
 // left fronds
 for(let i=0;i<5;i++){const fy=TILE_PX-6-i*5;const fw=5+i*1;ctx.fillStyle=cols[i%4];
   for(let dx=0;dx<fw;dx+=2){const angle=Math.round(Math.sin(dx/fw*Math.PI)*2);ctx.fillRect(ox+stemX-1-dx,oy+fy+angle,2,2);}
   ctx.fillStyle='#5abd42';ctx.fillRect(ox+stemX-fw,oy+fy,2,2);}
 // right fronds
 for(let i=0;i<5;i++){const fy=TILE_PX-8-i*5;const fw=4+i*1;ctx.fillStyle=cols[(i+2)%4];
   for(let dx=0;dx<fw;dx+=2){const angle=Math.round(Math.sin(dx/fw*Math.PI)*2);ctx.fillRect(ox+stemX+3+dx,oy+fy+angle,2,2);}}}

// 15. Lotus Leaf — large round flat dark-green leaf with radial veins
{const[ox,oy]=tileOrigin(T.LOTUS_LEAF);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(3203);
 // leaf disc
 ctx.fillStyle='#2a7834';
 for(let y=0;y<TILE_PX;y+=2)for(let x=0;x<TILE_PX;x+=2){const dx=x-14,dy=y-14;if(dx*dx+dy*dy<130)ctx.fillRect(ox+x,oy+y,2,2);}
 // radial veins
 ctx.fillStyle='#1a5e24';const cx2=ox+14,cy2=oy+14;
 for(let a=0;a<8;a++){const ang=a*Math.PI/4;const ex=cx2+Math.cos(ang)*10,ey=cy2+Math.sin(ang)*10;
   let px2=cx2,py2=cy2;for(let t=0;t<1;t+=0.15){ctx.fillRect(Math.round(px2+(ex-cx2)*t),Math.round(py2+(ey-cy2)*t),2,2);}
 }
 // highlight
 ctx.fillStyle='#4aad5e';ctx.fillRect(ox+12,oy+8,4,4);}

// 16. Water Lily — lotus leaf + pink flower petals
{const[ox,oy]=tileOrigin(T.WATER_LILY);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(3204);
 // reuse the leaf look
 ctx.fillStyle='#2a7834';
 for(let y=0;y<TILE_PX;y+=2)for(let x=0;x<TILE_PX;x+=2){const dx=x-14,dy=y-14;if(dx*dx+dy*dy<130)ctx.fillRect(ox+x,oy+y,2,2);}
 ctx.fillStyle='#1a5e24';const cx3=ox+14,cy3=oy+14;
 for(let a=0;a<6;a++){const ang=a*Math.PI/3;for(let r=0;r<8;r+=2)ctx.fillRect(Math.round(cx3+Math.cos(ang)*r),Math.round(cy3+Math.sin(ang)*r),2,2);}
 // flower petals (cross pattern around centre)
 const pc=ox+14,pr=oy+10;
 ctx.fillStyle='#f0a8c0';
 ctx.fillRect(pc-4,pr-2,4,4);ctx.fillRect(pc+2,pr-2,4,4);
 ctx.fillRect(pc-2,pr-6,4,4);ctx.fillRect(pc-2,pr+2,4,4);
 ctx.fillStyle='#ffe0ee';ctx.fillRect(pc-2,pr-2,4,4); // centre
 ctx.fillStyle='#ffd700';ctx.fillRect(pc,pr,2,2);       // stamen}
 // stamen fix
 ctx.fillStyle='#f7d000';ctx.fillRect(ox+14,oy+10,2,2);}

// 17. Mossy Log Side — oak log with green moss patches
{const[ox,oy]=tileOrigin(T.MOSSY_LOG_SIDE);const rnd=mulberry32(3205);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 for(let x=0;x<TILE_PX;x+=4){ctx.fillStyle=['#5c3f23','#7a5631','#634526','#71502d'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}
 // moss patches
 ctx.fillStyle='#3d7a28';
 for(let i=0;i<20;i++){const mx=Math.floor(rnd()*16)*2,my=Math.floor(rnd()*16)*2;if(rnd()<0.55)ctx.fillRect(ox+mx,oy+my,4,2);}
 ctx.fillStyle='#52a030';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Mossy Log Top
{const[ox,oy]=tileOrigin(T.MOSSY_LOG_TOP);ctx.fillStyle='#6b4a2a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#c9a86b';ctx.fillRect(ox+4,oy+4,24,24);
 ctx.strokeStyle='#8a6a3c';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);
 const rnd=mulberry32(3206);ctx.fillStyle='#3d7a28';
 for(let i=0;i<12;i++){const mx=4+Math.floor(rnd()*14)*2-4,my=4+Math.floor(rnd()*14)*2-4;ctx.fillRect(ox+Math.max(2,Math.min(28,mx)),oy+Math.max(2,Math.min(28,my)),2,2);}}

// Poison Mushroom — eerie violet-purple cross plant (Withered Forest)
{const[ox,oy]=tileOrigin(T.POISON_MUSHROOM);ctx.clearRect(ox,oy,TILE_PX,TILE_PX);const rnd=mulberry32(3207);
 // stem
 ctx.fillStyle='#7a5080';ctx.fillRect(ox+13,oy+16,6,14);
 ctx.fillStyle='#6a3a70';ctx.fillRect(ox+14,oy+16,2,14);
 // cap dome (wide, flattened)
 ctx.fillStyle='#a040c0';
 ctx.fillRect(ox+6,oy+10,20,8);ctx.fillRect(ox+8,oy+8,16,4);ctx.fillRect(ox+10,oy+6,12,4);
 ctx.fillStyle='#be60e0';ctx.fillRect(ox+8,oy+8,4,2);ctx.fillRect(ox+16,oy+8,4,2);
 // spots
 ctx.fillStyle='#e8c0f0';ctx.fillRect(ox+10,oy+12,2,2);ctx.fillRect(ox+18,oy+12,2,2);ctx.fillRect(ox+14,oy+10,2,2);
 // glow tinge at base
 ctx.fillStyle='rgba(180,60,220,0.25)';ctx.fillRect(ox+6,oy+18,20,6);}

// Withered Log Side — gnarled, dark, ashy grey-brown
{const[ox,oy]=tileOrigin(T.WITHERED_LOG_SIDE);const rnd=mulberry32(3208);
 ctx.fillStyle='#4a3e3a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 for(let x=0;x<TILE_PX;x+=4){ctx.fillStyle=['#3e3230','#5a4a44','#443836','#504440'][Math.floor(rnd()*4)];ctx.fillRect(ox+x,oy,2,TILE_PX);}
 ctx.fillStyle='#2c2420';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,4+Math.floor(rnd()*2)*2);
 ctx.fillStyle='#7a6e66';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}
// Withered Log Top
{const[ox,oy]=tileOrigin(T.WITHERED_LOG_TOP);ctx.fillStyle='#4a3e3a';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
 ctx.fillStyle='#6a5c56';ctx.fillRect(ox+4,oy+4,24,24);
 ctx.strokeStyle='#2c2420';ctx.lineWidth=2;ctx.strokeRect(ox+8,oy+8,16,16);ctx.strokeRect(ox+13,oy+13,6,6);}

// Gray Leaves — grey-blue desaturated leaves for Withered Forest
{noisy(T.GRAY_LEAVES,'#7a7e80',['#70747a','#868a8e','#646870','#7e8286'],0.9);
 const[ox,oy]=tileOrigin(T.GRAY_LEAVES);const rnd=mulberry32(3209);
 ctx.fillStyle='#4e5256';for(let i=0;i<14;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 ctx.fillStyle='#a0a4a8';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 for(let i=0;i<10;i++)ctx.clearRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}

// Coral Sand — pinkish-white sand with tiny coral fragments (Coral Tidelands floor)
{noisy(T.CORAL_SAND,'#e8d8cc',['#deccbe','#f2e4da','#d4c4b4','#eadacc'],0.65);
 const[ox,oy]=tileOrigin(T.CORAL_SAND);const rnd=mulberry32(3210);
 ctx.fillStyle='#f09898';for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 ctx.fillStyle='#c060c0';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 ctx.fillStyle='#80c0f0';for(let i=0;i<5;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);}

// Tidal Sand — damp, slightly greenish sand exposed at low tide
{noisy(T.TIDAL_SAND,'#c8c0a0',['#beb894','#d4ccac','#b8b090','#ccc4a8'],0.65);
 const[ox,oy]=tileOrigin(T.TIDAL_SAND);const rnd=mulberry32(3211);
 ctx.fillStyle='#80a060';for(let i=0;i<10;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
 ctx.fillStyle='rgba(60,100,160,0.22)';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);}

// ---- Wood-type planks (各木の個性的な板材テクスチャ) ----
// Helper: draw plank texture with given hue palette
function plankTile(t,base,v1,v2,v3,seed){
  const[ox,oy]=tileOrigin(t);const rnd=mulberry32(seed);
  ctx.fillStyle=base;ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
  for(let i=0;i<60;i++){ctx.fillStyle=[v1,v2,v3][Math.floor(rnd()*3)];ctx.fillRect(ox+Math.floor(rnd()*TILE_PX/2)*2,oy+Math.floor(rnd()*TILE_PX/2)*2,2,2);}
  ctx.fillStyle=v1;
  for(let y=0;y<TILE_PX;y+=8)ctx.fillRect(ox,oy+y,TILE_PX,2);
  ctx.fillRect(ox+8,oy+2,2,6);ctx.fillRect(ox+22,oy+10,2,6);ctx.fillRect(ox+14,oy+18,2,6);ctx.fillRect(ox+4,oy+26,2,6);
}
// Birch planks — pale white-cream
plankTile(T.BIRCH_PLANKS,'#d8d2c2','#c8c2b0','#e4dece','#bfb89e',9400);
// Spruce planks — deep reddish-brown
plankTile(T.SPRUCE_PLANKS,'#7a5230','#6a4428','#8a6038','#5e3a20',9401);
// Acacia planks — warm orange-tan
plankTile(T.ACACIA_PLANKS,'#c07040','#ae6030','#d08050','#b86838',9402);
// Cherry planks — light pinkish-tan
plankTile(T.CHERRY_PLANKS,'#c8a488','#b89070','#d8b898','#a87c60',9403);
// Mangrove planks — deep reddish-brown with slight purple tint
plankTile(T.MANGROVE_PLANKS,'#8c3a28','#7a3020','#9c4a34','#6e2818',9404);
// Palm planks — light honey blond
plankTile(T.PALM_PLANKS,'#c89a50','#b88840','#d8aa60','#a87830',9405);
// Maple planks — warm amber
plankTile(T.MAPLE_PLANKS,'#b87030','#a86028','#c88040','#986020',9406);

// ========= NEW DECORATIVE BLOCK TEXTURES =========

// 紅葉した落ち葉（敷物）— Fallen Leaves carpet: autumn leaf scatter in red/orange/yellow
{
  const[ox,oy]=tileOrigin(T.FALLEN_LEAVES);
  const rnd=mulberry32(5100);
  ctx.fillStyle='rgba(0,0,0,0)';ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
  // Base tint of ground showing through
  ctx.fillStyle='rgba(100,70,30,0.35)';ctx.fillRect(ox,oy,TILE_PX,TILE_PX);
  // Scatter leaves in autumn colors
  const leafColors=['#c0392b','#e67e22','#f39c12','#d35400','#922b21','#e74c3c','#f1c40f','#a93226'];
  for(let i=0;i<32;i++){
    ctx.fillStyle=leafColors[Math.floor(rnd()*leafColors.length)];
    const lx=ox+Math.floor(rnd()*14)*2, ly=oy+Math.floor(rnd()*14)*2;
    // Draw small leaf shapes (2x2 or 4x2)
    const w=rnd()<0.5?4:2, h=rnd()<0.5?2:4;
    ctx.fillRect(lx,ly,w,h);
  }
  // A few dark vein details
  ctx.fillStyle='rgba(80,40,10,0.5)';
  for(let i=0;i<8;i++)ctx.fillRect(ox+Math.floor(rnd()*15)*2,oy+Math.floor(rnd()*15)*2,2,2);
}

// 松ぼっくり — Pine Cone: brown oval with overlapping scales
{
  const[ox,oy]=tileOrigin(T.PINE_CONE);
  ctx.clearRect(ox,oy,TILE_PX,TILE_PX);
  const rnd=mulberry32(5101);
  // Background transparent, draw a cross-plant style pine cone
  const cx=ox+16,cy=oy+16;
  // Body of pine cone (oval brown)
  ctx.fillStyle='#5d3a1a';
  ctx.fillRect(cx-4,cy-8,8,16);
  ctx.fillRect(cx-6,cy-4,12,8);
  // Scale rows
  const scaleColors=['#8b5e3c','#a0704a','#7a4f2a','#6b3f1a'];
  for(let row=0;row<5;row++){
    ctx.fillStyle=scaleColors[row%scaleColors.length];
    const sy=cy-6+row*3;
    for(let col=-1;col<=1;col++){
      ctx.fillRect(cx+col*4-1,sy,4,3);
    }
  }
  // Tip (point at top)
  ctx.fillStyle='#3d2010';
  ctx.fillRect(cx-1,cy-10,2,3);
  // Highlight
  ctx.fillStyle='rgba(200,150,80,0.4)';
  ctx.fillRect(cx-3,cy-7,2,8);
}

// 大理石（白）— White Marble: bright white with subtle grey veining
{
  noisy(T.MARBLE,'#f4f4f0',['#ececea','#f8f8f6','#e8e8e6','#f0f0ee'],0.25);
  const[ox,oy]=tileOrigin(T.MARBLE);
  const rnd=mulberry32(5102);
  // Subtle grey veins
  ctx.strokeStyle='rgba(160,158,155,0.55)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox+2,oy+10);ctx.bezierCurveTo(ox+8,oy+14,ox+18,oy+8,ox+30,oy+22);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ox+5,oy+24);ctx.bezierCurveTo(ox+12,oy+18,ox+22,oy+26,ox+28,oy+20);ctx.stroke();
  ctx.strokeStyle='rgba(200,198,195,0.35)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox+14,oy+2);ctx.bezierCurveTo(ox+20,oy+12,ox+10,oy+20,ox+16,oy+30);ctx.stroke();
  // Subtle polish highlight
  ctx.fillStyle='rgba(255,255,255,0.4)';
  ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);
}

// 黒大理石 — Black Marble: very dark with gold/white veining
{
  noisy(T.BLACK_MARBLE,'#1a1a1e',['#141418','#202024','#18181c','#222226'],0.3);
  const[ox,oy]=tileOrigin(T.BLACK_MARBLE);
  // Gold veins
  ctx.strokeStyle='rgba(200,160,60,0.7)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox+3,oy+6);ctx.bezierCurveTo(ox+10,oy+16,ox+20,oy+10,ox+29,oy+24);ctx.stroke();
  ctx.strokeStyle='rgba(180,140,50,0.5)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox+0,oy+20);ctx.bezierCurveTo(ox+8,oy+14,ox+16,oy+22,ox+26,oy+16);ctx.stroke();
  // White vein trace
  ctx.strokeStyle='rgba(220,220,220,0.25)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox+18,oy+2);ctx.bezierCurveTo(ox+22,oy+14,ox+14,oy+20,ox+20,oy+30);ctx.stroke();
  // Sheen
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);
}

// 滑らかな石（SMOOTH_STONE）— Polished smooth stone: medium grey, flat with subtle texture
{
  noisy(T.SMOOTH_STONE,'#8a8a8a',['#848484','#909090','#7e7e7e','#8e8e8e'],0.18);
  const[ox,oy]=tileOrigin(T.SMOOTH_STONE);
  // Very subtle rectangular pattern (like a polished tile)
  ctx.strokeStyle='rgba(60,60,60,0.3)';ctx.lineWidth=1;
  ctx.strokeRect(ox+1,oy+1,TILE_PX-2,TILE_PX-2);
  // Subtle horizontal line in middle (double-slab style)
  ctx.fillStyle='rgba(60,60,60,0.35)';
  ctx.fillRect(ox,oy+15,TILE_PX,2);
  // Polish sheen
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.fillRect(ox,oy,TILE_PX,2);ctx.fillRect(ox,oy,2,TILE_PX);
}

// 砂岩タイル — Sandstone Tile: chiseled/cut sandstone with decorative border
{
  noisy(T.SANDSTONE_TILE,'#d4b878',['#caa860','#dcc880','#c8a060','#d6be82'],0.3);
  const[ox,oy]=tileOrigin(T.SANDSTONE_TILE);
  const rnd=mulberry32(5106);
  // Border lines (tile grout)
  ctx.fillStyle='rgba(100,70,20,0.5)';
  ctx.fillRect(ox,oy,TILE_PX,2);
  ctx.fillRect(ox,oy+TILE_PX-2,TILE_PX,2);
  ctx.fillRect(ox,oy,2,TILE_PX);
  ctx.fillRect(ox+TILE_PX-2,oy,2,TILE_PX);
  // Inner cross decoration
  ctx.fillRect(ox+14,oy+4,2,24);
  ctx.fillRect(ox+4,oy+14,24,2);
  // Corner decorations
  ctx.fillStyle='rgba(180,130,50,0.6)';
  ctx.fillRect(ox+4,oy+4,4,4);
  ctx.fillRect(ox+24,oy+4,4,4);
  ctx.fillRect(ox+4,oy+24,4,4);
  ctx.fillRect(ox+24,oy+24,4,4);
  // Highlight
  ctx.fillStyle='rgba(255,235,150,0.2)';
  ctx.fillRect(ox+2,oy+2,TILE_PX-4,2);
}

// 玄武岩の柱 TOP — Basalt Pillar top: dark grey concentric ring pattern
{
  const[ox,oy]=tileOrigin(T.BASALT_PILLAR_TOP);
  noisy(T.BASALT_PILLAR_TOP,'#2c2c30',['#282828','#303034','#242428','#2e2e32'],0.3);
  const cx=ox+TILE_PX/2, cy=oy+TILE_PX/2;
  // Concentric ring lines
  ctx.strokeStyle='rgba(80,80,88,0.6)';ctx.lineWidth=1;
  for(let r=4;r<14;r+=4){
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  }
  // Cross grain lines
  ctx.fillStyle='rgba(60,60,65,0.4)';
  ctx.fillRect(cx-1,oy+2,2,TILE_PX-4);
  ctx.fillRect(ox+2,cy-1,TILE_PX-4,2);
}

// 玄武岩の柱 SIDE — Basalt Pillar side: dark grey with vertical striations
{
  noisy(T.BASALT_PILLAR_SIDE,'#2c2c30',['#282828','#303034','#242428','#2e2e32'],0.3);
  const[ox,oy]=tileOrigin(T.BASALT_PILLAR_SIDE);
  const rnd=mulberry32(5108);
  // Vertical column striations
  ctx.fillStyle='rgba(60,60,68,0.5)';
  for(let x=0;x<TILE_PX;x+=4){
    if(rnd()<0.5)ctx.fillRect(ox+x,oy,2,TILE_PX);
  }
  // Top/bottom cap lines
  ctx.fillStyle='rgba(80,80,90,0.6)';
  ctx.fillRect(ox,oy,TILE_PX,3);
  ctx.fillRect(ox,oy+TILE_PX-3,TILE_PX,3);
  // Subtle highlight edge
  ctx.fillStyle='rgba(100,100,110,0.3)';
  ctx.fillRect(ox,oy,2,TILE_PX);
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
