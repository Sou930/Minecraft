"use strict";
// =============================================================================
// Exploration Tools HUD: Map, Compass, Clock
// Shows an interactive overlay in the bottom-left corner when the player holds
// one of these items in the active hotbar slot.
// =============================================================================

const EXPLORATION_HUD = (function(){

  // ── DOM overlay ────────────────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.id = 'explore-tool-hud';
  wrap.style.cssText = [
    'position:fixed',
    'left:12px',
    'bottom:calc(var(--ui-bottom, 14px) + var(--hotbar-slot, 44px) + 56px)',
    'z-index:28',
    'pointer-events:none',
    'opacity:0',
    'transform:translateY(8px) scale(0.96)',
    'transition:opacity .2s,transform .2s',
    'filter:drop-shadow(0 4px 14px rgba(0,0,0,.65))',
  ].join(';');
  document.body.appendChild(wrap);

  // Canvas used for all three tools
  const cvs = document.createElement('canvas');
  cvs.width = 160; cvs.height = 160;
  cvs.style.cssText = 'border-radius:10px;display:block;image-rendering:pixelated;';
  wrap.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  // Small label under the canvas
  const label = document.createElement('div');
  label.style.cssText = 'text-align:center;font-size:11px;font-weight:700;color:#ffe082;text-shadow:0 1px 3px #000;margin-top:4px;font-family:monospace;letter-spacing:.5px;';
  wrap.appendChild(label);

  let _visible = false;
  let _animFrame = null;
  let _lastTool = null;
  let _mapOffset = {x:0, z:0};   // map scroll offset in blocks

  // ── Show / hide ────────────────────────────────────────────────────────────
  function show(){
    if(_visible) return;
    _visible = true;
    wrap.style.opacity = '1';
    wrap.style.transform = 'translateY(0) scale(1)';
  }
  function hide(){
    if(!_visible) return;
    _visible = false;
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateY(8px) scale(0.96)';
  }

  // ── Map rendering ──────────────────────────────────────────────────────────
  // Draws a top-down mini-map centred on the player.
  // Each pixel = 2 world blocks; canvas 160×160 → 320×320 block area.
  const MAP_PIX_PER_BLOCK = 2;   // how many canvas pixels per block
  const MAP_BLOCKS = 80;          // half-radius in blocks

  // Colour palette for biome/block types (top block colour)
  function blockMapColor(id){
    if(id===B.WATER||id===B.LAVA) return id===B.WATER?'#4488cc':'#cc4400';
    if(id===B.GRASS||id===B.DRY_GRASS) return id===B.DRY_GRASS?'#b5a040':'#5a9e2f';
    if(id===B.SAND||id===B.SANDSTONE) return '#d4c068';
    if(id===B.SNOW||id===B.ICE||id===B.BLUE_ICE) return '#ddeeff';
    if(id===B.STONE||id===B.COBBLE||id===B.GRAVEL) return '#777';
    if(id===B.DIRT||id===B.FARMLAND||id===B.FARMLAND_WET) return '#8d6e4a';
    if(id===B.LOG||id===B.PLANKS||id===B.BIRCH_LOG||id===B.SPRUCE_LOG||id===B.ACACIA_LOG) return '#8a6030';
    if(id===B.LEAVES||id===B.BIRCH_LEAVES||id===B.SPRUCE_LEAVES||id===B.ACACIA_LEAVES||
       id===B.CHERRY_LEAVES||id===B.MANGROVE_LEAVES||id===B.PALM_LEAVES||
       id===B.MAPLE_LEAVES_RED||id===B.MAPLE_LEAVES_ORANGE||id===B.MAPLE_LEAVES_YELLOW) return '#2e7d32';
    if(id===B.OBSIDIAN) return '#22102a';
    if(id===B.NETHERRACK) return '#7a1010';
    if(id===B.COAL_ORE) return '#444';
    if(id===B.IRON_ORE) return '#aa8866';
    if(id===B.GOLD_ORE) return '#d4aa20';
    if(id===B.DIAMOND_ORE) return '#20b8cc';
    return '#666';
  }

  function drawMap(){
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0,0,W,H);

    // Parchment background
    ctx.fillStyle = '#c8a060';
    ctx.beginPath();
    ctx.roundRect(0,0,W,H,8);
    ctx.fill();

    // Map grid texture
    ctx.strokeStyle = 'rgba(100,70,20,0.18)';
    ctx.lineWidth = 0.5;
    const step = MAP_PIX_PER_BLOCK * 8;
    for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // Sample top-surface blocks around player
    if(typeof player==='undefined'||typeof getBlock==='undefined') return;
    const px = Math.floor(player.pos.x);
    const pz = Math.floor(player.pos.z);
    const halfW = Math.floor(W / MAP_PIX_PER_BLOCK / 2);
    const halfH = Math.floor(H / MAP_PIX_PER_BLOCK / 2);

    const imgData = ctx.getImageData(0,0,W,H);
    const data = imgData.data;

    for(let ix = 0; ix < W; ix += MAP_PIX_PER_BLOCK){
      for(let iy = 0; iy < H; iy += MAP_PIX_PER_BLOCK){
        const bx = px - halfW + Math.floor(ix / MAP_PIX_PER_BLOCK);
        const bz = pz - halfH + Math.floor(iy / MAP_PIX_PER_BLOCK);
        if(bx < 0 || bx >= WORLD_W || bz < 0 || bz >= WORLD_D) continue;
        // Find top solid block
        let topId = B.AIR;
        for(let by = WORLD_H - 1; by >= 0; by--){
          const id = getBlock(bx,by,bz);
          if(id !== B.AIR){ topId = id; break; }
        }
        // Height shading: slightly lighter for higher terrain
        const hex = blockMapColor(topId);
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b_ = parseInt(hex.slice(5,7),16);
        // Write MAP_PIX_PER_BLOCK × MAP_PIX_PER_BLOCK pixels
        for(let dx=0;dx<MAP_PIX_PER_BLOCK;dx++){
          for(let dy=0;dy<MAP_PIX_PER_BLOCK;dy++){
            const idx = ((iy+dy)*W + (ix+dx))*4;
            data[idx]=r; data[idx+1]=g; data[idx+2]=b_; data[idx+3]=220;
          }
        }
      }
    }
    ctx.putImageData(imgData,0,0);

    // Vignette border
    const vgrd = ctx.createRadialGradient(W/2,H/2,W*0.28,W/2,H/2,W*0.58);
    vgrd.addColorStop(0,'rgba(0,0,0,0)');
    vgrd.addColorStop(1,'rgba(0,0,0,0.45)');
    ctx.fillStyle = vgrd;
    ctx.beginPath();ctx.roundRect(0,0,W,H,8);ctx.fill();

    // Grid overlay – thin lines every 16 blocks (1 chunk)
    const chunkPx = 16 * MAP_PIX_PER_BLOCK;
    const offX = ((px % 16) * MAP_PIX_PER_BLOCK);
    const offZ = ((pz % 16) * MAP_PIX_PER_BLOCK);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    for(let x = (W/2 - offX) % chunkPx; x < W; x += chunkPx){
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for(let y = (H/2 - offZ) % chunkPx; y < H; y += chunkPx){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }

    // Player marker
    const cx = W/2, cy = H/2;
    const yaw = player.yaw;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(yaw);
    ctx.fillStyle = '#ff3b3b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,-7);
    ctx.lineTo(5,5);
    ctx.lineTo(0,2);
    ctx.lineTo(-5,5);
    ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.restore();

    // Coordinates label
    label.textContent = `X:${Math.floor(player.pos.x)}  Z:${Math.floor(player.pos.z)}`;
  }

  // ── Compass rendering ──────────────────────────────────────────────────────
  function drawCompass(){
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2, r = W*0.44;

    // Background disc – dark wood
    const bgGrd = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    bgGrd.addColorStop(0,'#3a2810');
    bgGrd.addColorStop(1,'#1a0c04');
    ctx.fillStyle = bgGrd;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();

    // Brass rim
    ctx.strokeStyle = '#c8962a';
    ctx.lineWidth = 5;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();

    // Cardinal tick marks
    const cardinals = [{a:0,l:'N',col:'#ff4444'},{a:Math.PI*0.5,l:'E',col:'#e8e0c0'},
                       {a:Math.PI,l:'S',col:'#e8e0c0'},{a:Math.PI*1.5,l:'W',col:'#e8e0c0'}];
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for(const c of cardinals){
      const tx = cx + Math.sin(c.a)*(r-18);
      const ty = cy - Math.cos(c.a)*(r-18);
      ctx.fillStyle = c.col;
      ctx.fillText(c.l, tx, ty);
      // Tick
      ctx.strokeStyle = c.col;ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(c.a)*(r-6), cy - Math.cos(c.a)*(r-6));
      ctx.lineTo(cx + Math.sin(c.a)*(r-30), cy - Math.cos(c.a)*(r-30));
      ctx.stroke();
    }

    // Minor ticks
    ctx.strokeStyle = 'rgba(200,180,100,0.4)';ctx.lineWidth=1;
    for(let i=0;i<32;i++){
      const a = (i/32)*Math.PI*2;
      if(i%8===0) continue;// already drawn
      ctx.beginPath();
      ctx.moveTo(cx+Math.sin(a)*(r-6),cy-Math.cos(a)*(r-6));
      ctx.lineTo(cx+Math.sin(a)*(r-14),cy-Math.cos(a)*(r-14));
      ctx.stroke();
    }

    // Centre pivot
    ctx.fillStyle = '#c8962a';
    ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill();

    // Needle – rotates with yaw so needle always points world-North
    const needleAngle = (typeof player !== 'undefined') ? -player.yaw : 0;
    const nLen = r * 0.66;

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(needleAngle);

    // North (red) half
    ctx.fillStyle = '#ff3b3b';
    ctx.shadowColor = 'rgba(255,60,60,0.5)';ctx.shadowBlur=6;
    ctx.beginPath();
    ctx.moveTo(0, -nLen);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();ctx.fill();

    // South (white) half
    ctx.fillStyle = '#e8e0c0';
    ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.moveTo(0, nLen*0.7);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();ctx.fill();

    ctx.restore();

    // Direction label
    if(typeof player !== 'undefined'){
      const angle = ((player.yaw % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
      const dirs = ['S','SW','W','NW','N','NE','E','SE'];
      const dirStr = dirs[Math.round(angle / (Math.PI/4)) % 8];
      label.textContent = `↑ ${dirStr}  ${Math.floor(player.pos.x)},${Math.floor(player.pos.z)}`;
    }
  }

  // ── Clock rendering ────────────────────────────────────────────────────────
  function drawClock(){
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2, r = W*0.43;

    // Day/night sky gradient background
    let dayFrac = 0.5;
    if(typeof dayTime !== 'undefined' && typeof DAY_LENGTH !== 'undefined'){
      const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
      dayFrac = Math.max(0, Math.min(1, Math.sin(angle)*1.5+0.5));
    }
    const skyTop = lerpColor('#0a1a3c','#4fa8d8',dayFrac);
    const skyBot = lerpColor('#1a0a20','#87ceeb',dayFrac);
    const skyGrd = ctx.createLinearGradient(0,0,0,H);
    skyGrd.addColorStop(0, skyTop);
    skyGrd.addColorStop(1, skyBot);
    ctx.fillStyle = skyGrd;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();

    // Gold rim
    ctx.strokeStyle = '#c8962a';
    ctx.lineWidth = 5;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();

    // Sun/Moon icon moving around the clock face
    if(typeof dayTime !== 'undefined'){
      const angle = (dayTime / DAY_LENGTH) * Math.PI * 2 - Math.PI/2;
      const orbR = r * 0.75;
      const orbX = cx + Math.cos(angle)*orbR;
      const orbY = cy + Math.sin(angle)*orbR;
      const isDay = dayFrac > 0.3;
      if(isDay){
        ctx.fillStyle = '#ffe040';
        ctx.shadowColor = '#ffe040';ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(orbX,orbY,9,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
      } else {
        ctx.fillStyle = '#e0e8ff';
        ctx.beginPath();ctx.arc(orbX,orbY,7,0,Math.PI*2);ctx.fill();
        // Moon crescent
        ctx.fillStyle = skyTop;
        ctx.beginPath();ctx.arc(orbX+4,orbY-2,5,0,Math.PI*2);ctx.fill();
      }
    }

    // Hour marks
    for(let i=0;i<12;i++){
      const a = (i/12)*Math.PI*2 - Math.PI/2;
      ctx.strokeStyle = 'rgba(255,230,150,0.7)';
      ctx.lineWidth = (i%3===0)?2.5:1.2;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*(r-6), cy+Math.sin(a)*(r-6));
      ctx.lineTo(cx+Math.cos(a)*(r-16), cy+Math.sin(a)*(r-16));
      ctx.stroke();
    }

    // Clock hands driven by dayTime
    if(typeof dayTime !== 'undefined'){
      const normTime = dayTime / DAY_LENGTH; // 0..1
      const hourAngle  = normTime * Math.PI*2 - Math.PI/2;
      const minuteAngle= (normTime*12 % 1) * Math.PI*2 - Math.PI/2;

      // Hour hand
      ctx.strokeStyle='#ffe082';ctx.lineWidth=3.5;ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(hourAngle)*(r*0.48), cy+Math.sin(hourAngle)*(r*0.48));
      ctx.stroke();

      // Minute hand
      ctx.strokeStyle='#fff';ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(minuteAngle)*(r*0.68), cy+Math.sin(minuteAngle)*(r*0.68));
      ctx.stroke();

      // Centre dot
      ctx.fillStyle='#ffe082';
      ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fill();
    }

    // Day/time label
    if(typeof dayTime !== 'undefined'){
      const angle = (dayTime / DAY_LENGTH) * Math.PI * 2;
      const sun = Math.sin(angle);
      const timeStr = sun>0.15?'☀ Day':(sun<-0.15?'🌙 Night':(Math.cos(angle)>0?'🌅 Dawn':'🌇 Dusk'));
      label.textContent = timeStr;
    }
  }

  // Linear-interpolate hex colors
  function lerpColor(a,b,t){
    const ar=parseInt(a.slice(1,3),16),ag=parseInt(a.slice(3,5),16),ab_=parseInt(a.slice(5,7),16);
    const br=parseInt(b.slice(1,3),16),bg=parseInt(b.slice(3,5),16),bb_=parseInt(b.slice(5,7),16);
    const r=Math.round(ar+(br-ar)*t).toString(16).padStart(2,'0');
    const g=Math.round(ag+(bg-ag)*t).toString(16).padStart(2,'0');
    const b_=Math.round(ab_+(bb_-ab_)*t).toString(16).padStart(2,'0');
    return `#${r}${g}${b_}`;
  }

  // ── Main update (called every frame from main loop) ──────────────────────
  function update(){
    if(typeof inventory==='undefined'||typeof selectedSlot==='undefined') return;
    if(typeof inventoryOpen!=='undefined'&&inventoryOpen){ hide(); return; }
    if(typeof started!=='undefined'&&!started){ hide(); return; }

    const slot = inventory[selectedSlot];
    const id = slot ? slot.id : null;
    const def = id !== null ? ITEMS[id] : null;
    const tool = def ? def.explorationTool : null;

    if(!tool){ hide(); return; }

    show();
    if(tool === 'map')     drawMap();
    else if(tool === 'compass') drawCompass();
    else if(tool === 'clock')   drawClock();
  }

  return { update };
})();
